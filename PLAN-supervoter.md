# PLAN — does refinement fragment a super-voter?

**Written 22 September 2026. Nothing here is built.** A plan in the house style:
phases, each ending in a measurement, and each measurement able to come out
against the claim.

## The question

Liquid democracy's one reproducible field failure is **weight concentration**.
The German Pirate Party ran LiquidFeedback at scale and a small number of
delegates ended up carrying very large numbers of votes. The mechanism is
preferential attachment — people delegate to whoever is already visible, and
visibility follows weight — and the damage was to legitimacy rather than to
correctness: the system meant to improve on representative democracy looked
*less* equal than the thing it replaced.

This repository's delegation is **per issue**. A voter is a `Leaf`, a `Relay` to
one voter, or a `Fold` over many, at each issue, over the same issue tree
(`voters.ts`). So a would-be super-voter accumulates weight only on the branches
where nobody overrode them. Every citizen who relays to party A generally but to
Sarah Smith at `art/*` strips weight off A on that branch.

> **CLAIM.** Per-issue refinement fragments concentration, and the effect is
> monotone in how much refinement happens.

> **THE OBJECTION, which is the interesting half.** Refinement costs attention,
> and `PROBLEM.md`'s whole premise is that nobody has time. If almost nobody
> refines, weight pools at the root exactly as in flat delegation and the
> structure has bought nothing.

So the question is not *does it help*. It is a threshold:

> **How much refinement is needed before concentration falls below the
> flat-delegation baseline, and how sharply?**

## What is measured

**Concentration**, per issue, two ways — report both, they fail differently:

- `top_share` — the largest effective weight on an issue, over total weight cast.
  Legible, and it is the number a journalist would print.
- `gini` — Gini coefficient of the effective-weight distribution. Less legible,
  but sensitive to a fat middle that `top_share` misses entirely.

**Effective weight** is what `resolve.ts` already computes when it folds, not a
separate notion invented for this file. If the number cannot be read out of the
existing F-algebra without modifying it, that is itself a finding and should be
written down rather than worked around.

## The two factors

**1. Refinement rate `r`** — fraction of citizens whose delegation is not a single
`Relay` target reused at every issue. Swept 0 → 1.

**2. Fold rule** — `Majority`, `Weighted`, `Unanimous`, `Plurality` (`voters.ts`).
This is not a control, it is a second factor, because **`Weighted` folds by the
weight each sub-voter personally carries** and is therefore a concentration
amplifier written into the design. The prediction worth stating in advance is
that `Weighted` concentrates strictly more than `Majority` at every `r`. If it
does not, something is wrong with either the harness or my understanding of the
fold, and finding out which is worth more than the headline result.

## Phases

**Phase 0 — the baseline exists and is exactly flat.**
Construct the flat-delegation electorate: every citizen a single `Relay`, same
target at every issue. **Measurement:** at `r = 0` the refined harness and the
flat harness must produce *identical* `top_share` and `gini`, issue by issue.
Not close. Identical. If they differ, the harness is wrong and nothing after
this phase means anything. This is the only phase that cannot be skipped.

**Phase 1 — synthetic electorates at scale.**
Five citizens will not show concentration; it needs thousands. Generate
electorates with hidden structure to be found, the way `three-dates` generates
fixtures with hidden trait vectors. Delegation targets drawn under **preferential
attachment**, since that is the mechanism actually observed in the field —
uniform attachment would assume away the problem and produce a flattering
result. **Measurement:** at `r = 0`, under preferential attachment, concentration
must reproduce the qualitative field finding — a heavy tail, a few delegates with
large weight. If the baseline does not reproduce the known failure, the
generator is not modelling the thing the claim is about.

**Phase 2 — the sweep.**
`r` from 0 to 1, both metrics, all four fold rules, several electorate sizes.
**Measurement:** the curve. Report the threshold `r*` at which refined
concentration drops below flat, per rule, with the sensitivity to electorate
size. A flat curve is a real answer and gets reported as one.

**Phase 3 — where refinement is spent.**
Refinement is not uniform in practice: people refine where they care. Re-run with
`r` concentrated on a few popular branches versus spread thinly across many.
**Measurement:** whether `r*` is a property of the *rate* or of the *distribution*.
If the latter dominates, the headline number from Phase 2 is much weaker than it
looks, and that has to be said in the same breath.

**Phase 4 — cycles and dead branches.**
`resolve.ts` is well-founded only on an acyclic electorate, and `preshill` carries
an `abstain_all` policy on a failed branch. Generate electorates with cycles.
**Measurement:** how much weight is stranded, and whether the policy changes
concentration rather than merely handling an error.

## What this can and cannot establish

It can establish the **structural** claim: given refinement rate `r` and fold rule
`R`, concentration is `X`. That is a fact about the mechanism and it holds
whoever the citizens are.

It cannot establish the **behavioural** one: what `r` actually is. Refinement rate
is a human quantity and no simulation produces it honestly. Every number here is
a number about the generator.

That limit is an argument rather than an apology. It says the first real
deployment should be the one that measures `r` cheaply and without much at stake
— which points at participatory budgeting, where Scotland already allocates real
money by public vote, rather than at anything binding and legislative.

## Not started

No file in this repository has been modified for this plan. `check.ts`'s eleven
assertions and the divisions table in `README.md` are the contract; if the
harness lands, they must still pass unchanged.
