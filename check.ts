// check.ts — assertions against the worked electorate. Run it.

import { electorate, issues, roll } from "./example.ts";
import { type Policy, Resolver } from "./resolve.ts";
import { divide } from "./tally.ts";

let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  console.log(`  ${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : "  — " + detail}`);
  if (!cond) failed++;
};

const mk = (m: Policy["onFoldFailure"]) =>
  new Resolver(electorate, issues, { onFoldFailure: m, fuel: 64 }, electorate.ids);
const r = mk("abstain-all");

console.log("\nresolution");
const art = r.resolve("refined-rita", "education/art");
ok("refinement beats inheritance: rita's art vote goes to the independent",
   art.tag === "Cast" && art.via.includes("sarah"), JSON.stringify(art));

const early = r.resolve("refined-rita", "education/early");
ok("and everything else in education still goes to party A",
   early.tag === "Cast" && early.via.includes("party-A"), JSON.stringify(early));

console.log("\ncycles");
const cyc = r.resolve("dave", "military/deployment");
ok("a cycle is a ballot, not an exception", cyc.tag === "Cycle", JSON.stringify(cyc));
ok("and it names the ring",
   cyc.tag === "Cycle" && cyc.ring[0] === "dave" && cyc.ring.at(-1) === "dave",
   JSON.stringify(cyc));
ok("a cycle on one issue does not poison another",
   r.resolve("dave", "education/early").tag === "Cast");

console.log("\nthe whip");
const whip = r.resolve("lazy-len", "military/procurement");
ok("a line is checked where it LANDS, not where it was set",
   whip.tag === "Cast" && whip.vote.tag === "Amount",
   JSON.stringify(whip));
ok("a whipped party is not polled: its members do not appear in the path",
   whip.tag === "Cast" && !whip.via.includes("bea") && !whip.via.includes("carl"),
   JSON.stringify(whip));

console.log("\npolicy — the choice the algebra refuses to make");
const a = divide(mk("abstain-all"), roll, "military/procurement");
const s = divide(mk("survivors"), roll, "military/procurement");
ok("survivors raises turnout on an issue with a failing branch",
   s.turnout > a.turnout, `abstain-all ${a.turnout}, survivors ${s.turnout}`);
ok("and it changes nothing where every branch answers",
   divide(mk("abstain-all"), roll, "education/art").turnout ===
     divide(mk("survivors"), roll, "education/art").turnout);

console.log("\nweight");
const w = r.weightOf("sarah", "education/art");
ok("weight counts citizens reached, deduplicated at the source", w === 2, `got ${w}`);
const excl = r.weightOf("carl", "education/early", "party-C");
const incl = r.weightOf("carl", "education/early", null);
ok("excluding a party lowers its members' weight, which is what stops the loop",
   excl <= incl, `excluding ${excl}, including ${incl}`);

console.log(failed === 0 ? "\nall ok\n" : `\n${failed} FAILED\n`);
if (failed > 0) Deno.exit(1);
