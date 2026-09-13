// vote-cli.ts
//   ./vote divisions [policy]   every leaf issue, resolved for every citizen
//   ./vote trace <citizen> <issue>
//   ./vote room <issue>         who carries what weight into the debate
//   ./vote disclose <citizen> <issue>
//
// policy is `abstain-all` (default) or `survivors` — the choice design.pdf §9
// says the algebra refuses to make.

import { issues, electorate, roll } from "./example.ts";
import { type Policy, Resolver } from "./resolve.ts";
import { chatRoom, divide } from "./tally.ts";
import { nearest } from "./issues.ts";

const arg = (i: number) => Deno.args[i];
const cmd = arg(0) ?? "divisions";
const mode = (Deno.env.get("VOTE_POLICY") ?? "abstain-all") as Policy["onFoldFailure"];
const policy: Policy = { onFoldFailure: mode, fuel: 64 };
const r = new Resolver(electorate, issues, policy, electorate.ids);

const show = (v: unknown) => JSON.stringify(v);

if (cmd === "divisions") {
  const which = arg(1) ?? mode;
  const p: Policy = { onFoldFailure: which as Policy["onFoldFailure"], fuel: 64 };
  const rr = new Resolver(electorate, issues, p, electorate.ids);
  console.log(`policy: on a failed branch, ${p.onFoldFailure}\n`);
  for (const leafIssue of issues.leaves()) {
    const d = divide(rr, roll, leafIssue);
    const votes = d.counts.map((c) => `${show(c.vote)}×${c.n}`).join("  ") || "—";
    const lost = [
      d.cycled.length ? `${d.cycled.length} cycled` : "",
      d.exhausted.length ? `${d.exhausted.length} exhausted` : "",
      d.abstained.length ? `${d.abstained.length} abstained` : "",
    ].filter(Boolean).join(", ");
    console.log(`  ${leafIssue.padEnd(24)} ${votes.padEnd(30)} turnout ${d.turnout}/${roll.length}${lost ? "  (" + lost + ")" : ""}`);
  }
} else if (cmd === "trace") {
  const who = arg(1) ?? "refined-rita", issue = arg(2) ?? "education/art";
  console.log(show(r.resolve(who, issue)));
} else if (cmd === "room") {
  const issue = arg(1) ?? "education/art";
  console.log(`who speaks on ${issue}, weighted by citizens reached:\n`);
  for (const { who, weight } of chatRoom(r, roll, issue)) {
    console.log(`  ${who.padEnd(16)} ${"█".repeat(weight)} ${weight}`);
  }
} else if (cmd === "disclose") {
  const who = arg(1) ?? "refined-rita", issue = arg(2) ?? "education/art";
  const v = electorate.get(who);
  if (v === null) console.log(show({ edge: "none", cached: false }));
  else if (v.tag === "Leaf") console.log(show({ edge: "leaf", cached: false }));
  else {
    const e = nearest(v.assign, issue);
    console.log(show(
      e === null
        ? { edge: "none", cached: false }
        : e.value.tag === "Relay"
        ? { edge: "relay", at: e.at, to: [e.value.to], cached: false }
        : { edge: "fold", at: e.at, to: e.value.over, rule: e.value.rule.tag,
            cached: e.value.cache.tag === "Cached" },
    ));
  }
} else {
  console.log("usage: ./vote divisions|trace|room|disclose");
}
