// tally.ts — two views of the same electorate.
//
// The DIVISION is what a leaf issue actually decides: every citizen on the roll
// resolves to one ballot and each counts once.
//
// The CHAT ROOM is who is speaking: for each voter, how many citizens' votes
// reach them on this issue. That is the weight a delegate carries into the
// debate, and it is an OUTPUT of resolution rather than an input to it.

import type { IssueId, Vote } from "./issues.ts";
import type { VoterId } from "./voters.ts";
import type { Ballot, Resolver } from "./resolve.ts";

export interface Division {
  readonly issue: IssueId;
  readonly counts: readonly { vote: Vote; n: number }[];
  readonly cycled: readonly VoterId[];
  readonly exhausted: readonly VoterId[];
  readonly abstained: readonly { who: VoterId; why: string }[];
  readonly turnout: number;
}

export function divide(
  r: Resolver,
  roll: readonly VoterId[],
  issue: IssueId,
): Division {
  const counts = new Map<string, { vote: Vote; n: number }>();
  const cycled: VoterId[] = [], exhausted: VoterId[] = [];
  const abstained: { who: VoterId; why: string }[] = [];

  for (const c of roll) {
    const b: Ballot = r.resolve(c, issue);
    switch (b.tag) {
      case "Cast": {
        const k = JSON.stringify(b.vote);
        const cur = counts.get(k);
        if (cur) cur.n++;
        else counts.set(k, { vote: b.vote, n: 1 });
        break;
      }
      case "Cycle": cycled.push(c); break;
      case "Exhausted": exhausted.push(c); break;
      case "Abstain": abstained.push({ who: c, why: b.why }); break;
    }
  }
  const ranked = [...counts.values()].sort((a, b) => b.n - a.n);
  const turnout = ranked.reduce((s, x) => s + x.n, 0);
  return { issue, counts: ranked, cycled, exhausted, abstained, turnout };
}

/** Who carries how much into the chat room. Deduplicated at the source: a
 *  citizen reaching the same voter by several routes counts once. */
export function chatRoom(
  r: Resolver,
  roll: readonly VoterId[],
  issue: IssueId,
): { who: VoterId; weight: number }[] {
  const w = new Map<VoterId, number>();
  for (const c of roll) {
    for (const v of r.reached(c, issue)) w.set(v, (w.get(v) ?? 0) + 1);
  }
  return [...w.entries()]
    .map(([who, weight]) => ({ who, weight }))
    .sort((a, b) => b.weight - a.weight || a.who.localeCompare(b.who));
}
