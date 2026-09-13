// type-tests.ts — checked, never run. Fails in both directions.

import type { Fib, PosAt, Shape } from "./lib/algebra.ts";
import type { IssueId, Kind, Vote, VoteFor } from "./issues.ts";
import type { Cache, Disclosure, Edge, VoterId } from "./voters.ts";
import type { Ballot } from "./resolve.ts";

const expect = <T>(_: T) => {};

// ── 1. The container. Positions depend on the shape. ──────────────────
type IssueC =
  | Fib<{ tag: "Poll"; issue: IssueId; visited: readonly VoterId[]; fuel: number }, Ballot>
  | Fib<{ tag: "Disclose"; issue: IssueId }, Disclosure>
  | Fib<{ tag: "Reset" }, { tag: "ResetAck" }>;

type PollShape = { tag: "Poll"; issue: IssueId; visited: readonly VoterId[]; fuel: number };
expect<PosAt<IssueC, PollShape>>({ tag: "Abstain", who: "x", why: "y" });
expect<PosAt<IssueC, { tag: "Reset" }>>({ tag: "ResetAck" });

// A ballot is not an answer to Disclose. The lookup is by shape, not a union.
// @ts-expect-error Ballot is not a Disclosure.
const wrong: PosAt<IssueC, { tag: "Disclose"; issue: IssueId }> = { tag: "Abstain", who: "x", why: "y" };
expect<unknown>(wrong);

// `visited` and `fuel` are IN THE SHAPE. A header cannot be a type, and the
// base cases of resolution are only checkable because they are prompt fields.
expect<Shape<IssueC>>({ tag: "Poll", issue: "education/art", visited: [], fuel: 64 });
// @ts-expect-error fuel is not optional: unbounded depth is not a default.
const noFuel: Shape<IssueC> = { tag: "Poll", issue: "education/art", visited: [] };
expect<unknown>(noFuel);

// ── 2. The vote depends on the issue's kind ───────────────────────────
expect<VoteFor<{ tag: "Binary" }>>({ tag: "Aye" });
expect<VoteFor<{ tag: "Amount"; lo: 0; hi: 100 }>>({ tag: "Amount", value: 75 });

// @ts-expect-error a binary issue does not admit a pick.
const notBinary: VoteFor<{ tag: "Binary" }> = { tag: "Pick", option: "green" };
expect<unknown>(notBinary);

// @ts-expect-error an amount issue does not admit an aye.
const notAmount: VoteFor<{ tag: "Amount"; lo: 0; hi: 1 }> = { tag: "Aye" };
expect<unknown>(notAmount);

// ── 3. A ballot admits failure. All four, as positions. ───────────────
expect<Ballot>({ tag: "Cast", vote: { tag: "Aye" }, via: [] });
expect<Ballot>({ tag: "Cycle", ring: ["dave", "erin", "dave"] });
expect<Ballot>({ tag: "Exhausted", at: "dave" });
expect<Ballot>({ tag: "Abstain", who: "dave", why: "no delegation" });

// @ts-expect-error there is no fifth outcome; adding one is a design change.
const fifth: Ballot = { tag: "Confused", who: "dave" };
expect<unknown>(fifth);

// ── 4. The recursion: a party is not a type ───────────────────────────
// Relay and Fold both take plain VoterIds, so a target may be a person, a
// party or a sub-party and nothing in the type can tell. That is the point.
const toPerson: Edge = { tag: "Relay", to: "sarah" };
const toParty: Edge = { tag: "Relay", to: "party-A" };
expect<Edge>(toPerson);
expect<Edge>(toParty);
const mixed: Edge = { tag: "Fold", over: ["faction-X", "carl"], rule: { tag: "Majority" }, cache: { tag: "Live" } };
expect<Edge>(mixed);

// ── 5. A party line is a MAP over issues, not one vote ────────────────
// An edge is inherited over a subtree that may mix kinds, so a single vote
// cannot serve it. This assertion is the bug the first run found.
// @ts-expect-error 'tag' does not exist in type 'ReadonlyMap<IssueId, Vote>'.
const oneVote: Cache = { tag: "Cached", line: { tag: "Nay" }, asOf: "2026-09-01" };
expect<unknown>(oneVote);

const aLine: Cache = {
  tag: "Cached",
  line: new Map([["", { tag: "Nay" } as Vote], ["military/procurement", { tag: "Amount", value: 75 }]]),
  asOf: "2026-09-01",
};
expect<Cache>(aLine);

declare const k: Kind;
declare const v: Vote;
expect<boolean>(k.tag === "Binary" && (v.tag === "Aye" || v.tag === "Nay"));
