// example.ts — the electorate from PROBLEM.md, plus the two things it does not
// mention and which the design says must be faced: a sub-party, and a cycle.

import { type Issue, Issues } from "./issues.ts";
import { Electorate, fold, leaf, node, relay, type Voter, whipped } from "./voters.ts";

const aye = { tag: "Aye" } as const;
const nay = { tag: "Nay" } as const;

// ── The issue tree ────────────────────────────────────────────────────
export const issues = new Issues([
  { id: "", kind: { tag: "Binary" }, children: ["health", "education", "military"] },

  { id: "health", kind: { tag: "Binary" }, children: ["health/primary", "health/hospitals"] },
  { id: "health/primary", kind: { tag: "Binary" }, children: [] },
  { id: "health/hospitals", kind: { tag: "Binary" }, children: [] },

  { id: "education", kind: { tag: "Binary" },
    children: ["education/early", "education/stem", "education/art", "education/physical"] },
  { id: "education/early", kind: { tag: "Binary" }, children: [] },
  { id: "education/stem", kind: { tag: "Binary" }, children: [] },
  { id: "education/art", kind: { tag: "Binary" }, children: [] },
  { id: "education/physical", kind: { tag: "Binary" }, children: [] },

  { id: "military", kind: { tag: "Binary" }, children: ["military/procurement", "military/deployment"] },
  { id: "military/procurement", kind: { tag: "Amount", lo: 0, hi: 100 }, children: [] },
  { id: "military/deployment", kind: { tag: "Binary" }, children: [] },
] satisfies Issue[]);

// ── Politically active citizens: the leaves ───────────────────────────
const actives: Voter[] = [
  leaf("ali",   { "": aye, "education/art": aye, "military/procurement": { tag: "Amount", value: 20 } }),
  leaf("bea",   { "": nay, "health": aye, "military/procurement": { tag: "Amount", value: 60 } }),
  leaf("carl",  { "": aye, "education": nay, "military/procurement": { tag: "Amount", value: 40 } }),
  leaf("dana",  { "": nay, "military": aye, "military/procurement": { tag: "Amount", value: 90 } }),
  leaf("sarah", { "": nay, "education/art": aye }),   // the independent
];

// ── Parties. Internally a party is a citizen. ─────────────────────────
const parties: Voter[] = [
  // A sends health to one member, art to one member, folds the rest, and on
  // military folds over a SUB-PARTY and a person.
  node("party-A", {
    "": fold(["ali", "bea", "carl"]),
    "health": relay("bea"),
    "education/art": relay("ali"),
    "military": fold(["faction-X", "carl"]),
  }),

  // A faction inside A. Same construction, one level down.
  node("faction-X", { "": fold(["ali", "dana"], { tag: "Unanimous" }) }),

  // B is whipped: it decided once and answers from state. The whip is the
  // one-tick lag — today's answer is yesterday's decision.
  node("party-B", {
    "": fold(["bea", "carl"], { tag: "Majority" },
             whipped({ "": nay, "military/procurement": { tag: "Amount", value: 75 } },
                     "2026-09-01")),
  }),

  // C folds by weight, which is why the exclusion rule in resolve.ts matters.
  node("party-C", { "": fold(["carl", "dana"], { tag: "Weighted" }) }),
];

// ── Regular citizens ──────────────────────────────────────────────────
const citizens: Voter[] = [
  // The lazy thing to do: party B for everything, one entry at the root.
  node("lazy-len", { "": relay("party-B") }),

  // The brief's worked example: A for education, C for health and military,
  // refined so that art goes to the independent.
  node("refined-rita", {
    "": relay("party-C"),
    "education": relay("party-A"),
    "education/art": relay("sarah"),
  }),

  // Somebody who folds for themselves. Nothing in the type forbids it.
  node("careful-cass", {
    "": fold(["party-A", "party-B", "party-C"], { tag: "Plurality" }),
    "education/art": relay("sarah"),
  }),

  // A cycle, on military only. Neither did anything obviously wrong.
  node("dave", { "": relay("party-A"), "military": relay("erin") }),
  node("erin", { "": relay("party-C"), "military": relay("dave") }),
];

export const electorate = new Electorate([...actives, ...parties, ...citizens]);
export const roll = ["lazy-len", "refined-rita", "careful-cass", "dave", "erin"];
