// resolve.ts — the F-algebra, and the walk that applies it.
//
// An electorate is an F-coalgebra V -> F(V). Resolving a vote asks for an
// F-algebra on votes, and its three components are exactly the three backward
// maps of the design:
//
//     1 -> Vote                your own opinion         (Leaf)
//     Vote -> Vote             the IDENTITY             (Relay)
//     List(Vote) -> Vote       the fold                 (Fold)
//
// Resolution is the unique coalgebra-to-algebra morphism and exists precisely
// when the delegation is well-founded. An acyclic electorate lives in the
// initial algebra; a cyclic one only in the final coalgebra, because a cycle
// unfolds to an infinite tree. `visited` and `fuel` are how a total function
// is recovered on the part of nu-F that mu-F does not reach.

import { type IssueId, type Kind, type Vote, legal, nearest } from "./issues.ts";
import type { Electorate, Rule, VoterId } from "./voters.ts";
import type { Issues } from "./issues.ts";

/** A ballot admits failure. All three failures are POSITIONS, not exceptions,
 *  so every caller is made to say what it does about each. */
export type Ballot =
  | { tag: "Cast"; vote: Vote; via: readonly VoterId[] }
  | { tag: "Cycle"; ring: readonly VoterId[] }
  | { tag: "Exhausted"; at: VoterId }
  | { tag: "Abstain"; who: VoterId; why: string };

/** The two choices the algebra refuses to make — see design.pdf §9. Both are
 *  political, so both are arguments rather than decisions in the code. */
export interface Policy {
  /** When a branch of a fold fails, does the fold abstain wholesale, or fold
   *  over the branches that answered? The second is kinder and quietly moves
   *  the majority threshold: a party of five with two dead branches now
   *  carries things 2-1. */
  readonly onFoldFailure: "abstain-all" | "survivors";
  /** How deep a chain may run before it is declared exhausted. Nested parties
   *  make depth unbounded, so this is not optional. */
  readonly fuel: number;
}

export const DEFAULT: Policy = { onFoldFailure: "abstain-all", fuel: 64 };

const key = (v: Vote) => JSON.stringify(v);

export class Resolver {
  constructor(
    private readonly el: Electorate,
    private readonly issues: Issues,
    private readonly policy: Policy = DEFAULT,
    /** Whose delegations count toward weight. Everyone, normally. */
    private readonly roll: readonly VoterId[] = el.ids,
  ) {}

  /** The whole point. */
  resolve(who: VoterId, issue: IssueId): Ballot {
    return this.walk(who, issue, [], this.policy.fuel, null);
  }

  /** `via` is the path to HERE, not a shared set: two branches of a fold
   *  reaching the same voter is re-convergence, not a cycle. Cycle detection
   *  is therefore per branch, which is the correction the party tree forced. */
  private walk(
    who: VoterId,
    issue: IssueId,
    via: readonly VoterId[],
    fuel: number,
    /** A party being excluded, so a Weighted fold cannot count weight that
     *  flowed through itself. See design.pdf §7. */
    excluding: VoterId | null,
  ): Ballot {
    if (excluding !== null && who === excluding) {
      return { tag: "Abstain", who, why: "excluded" };
    }
    if (via.includes(who)) {
      const at = via.indexOf(who);
      return { tag: "Cycle", ring: [...via.slice(at), who] };
    }
    if (fuel <= 0) return { tag: "Exhausted", at: who };

    const v = this.el.get(who);
    if (v === null) return { tag: "Abstain", who, why: "no such voter" };
    const path = [...via, who];

    if (v.tag === "Leaf") {
      const own = nearest(v.opinion, issue);
      if (own === null) return { tag: "Abstain", who, why: "no opinion" };
      const kind = this.issues.kind(issue);
      if (kind !== null && !legal(kind, own.value)) {
        return { tag: "Abstain", who, why: "opinion is not a legal vote here" };
      }
      return { tag: "Cast", vote: own.value, via: path };
    }

    const edge = nearest(v.assign, issue);
    if (edge === null) return { tag: "Abstain", who, why: "no delegation" };

    if (edge.value.tag === "Relay") {
      // The identity backward map: what comes back IS my vote.
      return this.walk(edge.value.to, issue, path, fuel - 1, excluding);
    }

    const f = edge.value;
    // A cached fold answers from state without polling anyone. This is the
    // whip: today's answer is yesterday's decision.
    if (f.cache.tag === "Cached") {
      const line = nearest(f.cache.line, issue);
      if (line === null) {
        return { tag: "Abstain", who, why: `no line (as of ${f.cache.asOf})` };
      }
      // A line is inherited over a subtree that may mix kinds, so it must be
      // checked where it lands. An illegal line abstains; it is not coerced.
      const k = this.issues.kind(issue);
      if (k !== null && !legal(k, line.value)) {
        return { tag: "Abstain", who, why: `line from ${line.at} is not a legal vote here` };
      }
      return { tag: "Cast", vote: line.value, via: path };
    }

    const replies = f.over.map((m) => ({
      who: m,
      ballot: this.walk(m, issue, path, fuel - 1, excluding),
    }));
    return this.amalgamate(who, issue, f.rule, replies, this.kindOf(issue));
  }

  private kindOf(issue: IssueId): Kind | null {
    return this.issues.kind(issue);
  }

  /** The List summand of the algebra. */
  private amalgamate(
    who: VoterId,
    issue: IssueId,
    rule: Rule,
    replies: readonly { who: VoterId; ballot: Ballot }[],
    kind: Kind | null,
  ): Ballot {
    const cast = replies.filter((r) => r.ballot.tag === "Cast");
    const failed = replies.filter((r) => r.ballot.tag !== "Cast");

    if (failed.length > 0 && this.policy.onFoldFailure === "abstain-all") {
      const first = failed[0].ballot;
      return first.tag === "Cycle"
        ? first
        : { tag: "Abstain", who, why: `a branch failed (${first.tag})` };
    }
    if (cast.length === 0) return { tag: "Abstain", who, why: "nobody answered" };

    const weighted = rule.tag === "Weighted";
    const entries = cast.map((r) => ({
      vote: (r.ballot as { tag: "Cast"; vote: Vote }).vote,
      w: weighted ? this.weightOf(r.who, issue, who) : 1,
    }));

    if (rule.tag === "Unanimous") {
      const first = key(entries[0].vote);
      return entries.every((e) => key(e.vote) === first) && failed.length === 0
        ? { tag: "Cast", vote: entries[0].vote, via: [who] }
        : { tag: "Abstain", who, why: "not unanimous" };
    }

    // An Amount has no modal value worth having, so Majority means the
    // (weighted) median. Stated here because it is a real decision.
    if (kind?.tag === "Amount") {
      const spread = entries.flatMap((e) =>
        Array<number>(Math.max(1, e.w)).fill(
          (e.vote as { tag: "Amount"; value: number }).value,
        )
      ).sort((a, b) => a - b);
      const mid = spread[Math.floor((spread.length - 1) / 2)];
      return { tag: "Cast", vote: { tag: "Amount", value: mid }, via: [who] };
    }

    const tally = new Map<string, { vote: Vote; w: number }>();
    for (const e of entries) {
      const k = key(e.vote);
      const cur = tally.get(k);
      if (cur) cur.w += e.w;
      else tally.set(k, { vote: e.vote, w: e.w });
    }
    const ranked = [...tally.values()].sort((a, b) => b.w - a.w);
    const top = ranked[0];
    const tied = ranked.length > 1 && ranked[1].w === top.w;

    if (tied) return { tag: "Abstain", who, why: "tied" };
    if (rule.tag === "Majority") {
      const total = entries.reduce((s, e) => s + e.w, 0);
      if (top.w * 2 <= total) return { tag: "Abstain", who, why: "no majority" };
    }
    return { tag: "Cast", vote: top.vote, via: [who] };
  }

  // ── Weight ──────────────────────────────────────────────────────────

  /** How many of the roll reach `v` on `issue`, deduplicated at the source: a
   *  citizen who reaches the same voter by three routes counts once.
   *
   *  `excluding` implements the rule that prevents a circularity: a member's
   *  weight, for the purposes of their OWN party's fold, counts only
   *  delegations that do not pass through that party. Without it the fold's
   *  input would depend on the fold's output. */
  weightOf(v: VoterId, issue: IssueId, excluding: VoterId | null = null): number {
    let n = 0;
    for (const c of this.roll) {
      if (c === v) continue;
      if (this.reaches(c, v, issue, excluding)) n++;
    }
    return n;
  }

  private reaches(
    from: VoterId,
    target: VoterId,
    issue: IssueId,
    excluding: VoterId | null,
  ): boolean {
    const seen = new Set<VoterId>();
    const go = (who: VoterId, depth: number): boolean => {
      if (depth <= 0 || who === excluding || seen.has(who)) return false;
      seen.add(who);
      if (who === target) return true;
      const v = this.el.get(who);
      if (v === null || v.tag === "Leaf") return false;
      const edge = nearest(v.assign, issue);
      if (edge === null) return false;
      if (edge.value.tag === "Relay") return go(edge.value.to, depth - 1);
      if (edge.value.cache.tag === "Cached") return false;  // nobody is polled
      return edge.value.over.some((m) => go(m, depth - 1));
    };
    return go(from, this.policy.fuel);
  }

  /** Every voter the resolution of `who` actually touches. Weight is a count of
   *  citizens over this, which is why it is an output and not an input. */
  reached(who: VoterId, issue: IssueId): Set<VoterId> {
    const out = new Set<VoterId>();
    for (const id of this.el.ids) {
      if (id !== who && this.reaches(who, id, issue, null)) out.add(id);
    }
    return out;
  }
}
