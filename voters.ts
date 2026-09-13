// voters.ts — one recursive structure.
//
// Per issue a voter is a Leaf, a Relay to one voter, or a Fold over many. The
// targets are voters, so they may be parties, sub-parties or individuals, and
// nothing distinguishes them. Internally, a party IS a citizen: it has its own
// delegation tree over the same issue tree.
//
// These three cases are the container
//
//     F(X)  =  1  +  X  +  List(X)
//             Leaf  Relay   Fold
//
// and `resolve.ts` is the F-algebra.

import type { IssueId, Vote } from "./issues.ts";

export type VoterId = string;

/** How a fold combines the replies it is owed. This is the List summand of the
 *  algebra, and it is the only place a party differs from a person. */
export type Rule =
  | { tag: "Majority" }   // the modal vote; for Amount, the median
  | { tag: "Weighted" }   // by the weight each sub-voter personally carries
  | { tag: "Unanimous" }  // agreement, or abstain
  | { tag: "Plurality" }; // the largest bloc, ties abstain

/** ORTHOGONAL to Rule, which an earlier draft got wrong by listing a party line
 *  as a fourth rule. A live fold is recomputed when asked; a cached one was
 *  decided once and is answered from state. The whip is the one-tick lag.
 *
 *  `line` is a MAP, not a single vote, and finding that out cost a wrong
 *  number on the first run. An edge is inherited over a whole subtree, and a
 *  subtree may mix kinds — "military" contains a binary deployment question and
 *  an amount for procurement — so one vote cannot serve it. A party line is a
 *  set of positions, inherited over the issue tree like everything else, and a
 *  position that is not a legal vote for the issue it lands on is an
 *  abstention rather than a coerced answer. */
export type Cache =
  | { tag: "Live" }
  | { tag: "Cached"; line: ReadonlyMap<IssueId, Vote>; asOf: string };

export type Edge =
  | { tag: "Relay"; to: VoterId }
  | { tag: "Fold"; over: readonly VoterId[]; rule: Rule; cache: Cache };

export type Voter =
  | { tag: "Leaf"; id: VoterId; opinion: ReadonlyMap<IssueId, Vote> }
  | { tag: "Node"; id: VoterId; assign: ReadonlyMap<IssueId, Edge> };

/** What any voter will tell you about itself for a given issue.
 *
 *  EVERY voter answers this, a leaf replying "leaf". Giving parties a fibre
 *  individuals lack would break the constant family — see design.pdf §11 — and
 *  take unbounded membership with it. Transparency had to be uniform or absent.
 */
export interface Disclosure {
  readonly edge: "leaf" | "relay" | "fold" | "none";
  readonly at?: IssueId;      // the node the assignment was inherited from
  readonly to?: readonly VoterId[];
  readonly rule?: Rule;
  readonly cached: boolean;
}

export class Electorate {
  readonly byId: ReadonlyMap<VoterId, Voter>;
  constructor(list: readonly Voter[]) {
    this.byId = new Map(list.map((v) => [v.id, v]));
  }
  get(id: VoterId): Voter | null {
    return this.byId.get(id) ?? null;
  }
  get ids(): VoterId[] {
    return [...this.byId.keys()];
  }
}

// ── Constructors, so examples read like the brief ─────────────────────

export const leaf = (id: VoterId, opinion: Record<IssueId, Vote>): Voter => ({
  tag: "Leaf",
  id,
  opinion: new Map(Object.entries(opinion)),
});

export const node = (id: VoterId, assign: Record<IssueId, Edge>): Voter => ({
  tag: "Node",
  id,
  assign: new Map(Object.entries(assign)),
});

export const relay = (to: VoterId): Edge => ({ tag: "Relay", to });

export const fold = (
  over: readonly VoterId[],
  rule: Rule = { tag: "Majority" },
  cache: Cache = { tag: "Live" },
): Edge => ({ tag: "Fold", over, rule, cache });

/** A party line: what was decided, and when. */
export const whipped = (line: Record<IssueId, Vote>, asOf: string): Cache => ({
  tag: "Cached",
  line: new Map(Object.entries(line)),
  asOf,
});
