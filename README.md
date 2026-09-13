# voting

**Delegation is already a container morphism. What does that buy, and where does
it break?**

The brief is in [`PROBLEM.md`](PROBLEM.md), verbatim. Nothing is built yet. This
file is the first structural pass: which parts are settled by the algebra we
already have, which are genuinely open, and what is worth building first.

## The container

One container, and everybody has the same one.

```
IssueC  =  Issue ◁ Vote
```

A shape is an issue; a position is a valid vote on *that* issue. The dependency
is real — a referendum question admits yes/no, a budget line admits a number, a
seat admits a candidate — and it is exactly what `PosAt<C, S>` is for.

> **A citizen is a `Runner<IssueC>`.** Somebody you can put an issue to, and who
> answers. That is the whole ontology. "Regular citizen", "politically active
> citizen" and "political party" are not three types; they are three ways of
> being a runner.

A *politically active* citizen answers out of their own head: a leaf. A *regular*
citizen answers by asking someone else. A *party* answers by asking its members,
or by its own line. The type cannot tell them apart, and should not — that is
what makes becoming politically active a decision rather than a migration.

## Delegation is the forward map

To delegate is to answer an issue by putting it to someone else and relaying
what comes back. As a morphism:

```
fwd : Issue → Delegate        which representative gets this issue
bwd : Vote → Vote             what comes back is my vote
```

The backward map is the identity, which makes delegation a **vertical** morphism
— an element of the automorphism sheaf, in `federation`'s language. That repo
flags vertical morphisms as "a degenerate corner of the container formalism".
Here the degenerate corner is the subject.

Two consequences fall out immediately.

**The choice of delegate is made from the prompt, never from a reply.** You
decide who speaks for you on defence policy by looking at the issue, not by
hearing the answer first. That is the one rule `◁` enforces (a `next` branching
between shapes lies in no single fibre), so the formalism permits what democracy
already requires, and forbids a thing — "let me see how they voted, then decide
whether they spoke for me" — that is arguably not delegation at all.

**Weight rides in the backward map.** A delegate's vote counts once per citizen
who delegated *that issue* to them, so the tally is a fold over the backward
maps rather than a separate mechanism.

## Refinement is inheritance on a tree, and the tree is the container

Issues form a tree: government ▷ Education ▷ {early childhood, STEM, art,
physical education}. A delegation assigns representatives at nodes, and any
assignment is overridden by a more specific one below it.

```
  Education   → party A
  ⌞ art       → Sarah Smith      ← overrides, for this subtree only
```

So a delegation is a **partial function on the tree, extended downward by
inheritance**. The total function it denotes is on leaves; the partial function
is its presentation; and the "lazy" delegation is the constant one, presented at
the root by a single assignment.

That suggests the first real question worth an answer:

> Given a delegation as a function on leaves, what is its **coarsest
> presentation**? Two citizens with different-looking delegations may denote the
> same function. The minimal presentation is a Myhill–Nerode style quotient, and
> `federation/almost-computable.pdf` already does that construction for the path
> directed container of a graph.

## Which combinator is which

| | in the algebra | here |
|---|---|---|
| `+` | routing: disjoint shapes, each keeping its own positions | **the whole of refinement.** Different issues go to different delegates |
| `⊠` | both shapes up front, **both replies owed** | the chat room: put the issue to every delegate, tally all the answers |
| `◁` | the reply to the first chooses the second | a delegation **chain**: you → party → a member |
| `×` | both offered, exactly one answered | a fallback: your second choice if your first abstains |

`+` doing the work is the notable one. `stalin` never used it, `federation`
never used it, `firm` used it once for the CEO — and here it is the primary
structure rather than an embellishment.

## Where it breaks: cycles

Delegation chains are `◁`, and `◁` composes trees. Delegation graphs are not
trees. A delegates to B, B to C, C back to A on the same issue, and nobody's
vote is defined.

This is not a new difficulty to be worked out. It is the difficulty
`federation` exists to study, and the correspondence is exact:

```ts
const chain = seqC(you, seqC(party, member));  // fine: a chain is a tree
const ring  = seqC(you, ring);                 // TS7022: referenced in its own initializer
```

**A delegation cycle is a runner defined in terms of itself.** For a statically
known electorate the TypeScript checker is already the cycle detector. For a
live one it is not, and the live case is the real one.

Two things carry over directly.

**`Walk` is the vote resolver.** `federation/mobius.ts` has a fibre whose base
case is *seeing itself in `visited`*, whose state rides in the prompt because a
header cannot be a type, and which reports the class of the cycle it found. That
is the algorithm for "whose vote is this, really", with cycle detection included
rather than bolted on.

**The graph is functional, which makes the shape of failure narrow.** Per issue,
each citizen delegates to at most one representative, so out-degree ≤ 1 and every
component is ρ-shaped: a tail running into a single cycle. A vote resolves iff
its component terminates at a citizen who actually votes. So the failure mode is
not "somewhere in the graph there is a cycle" but "*your* path ends in one",
which is reportable to the individual and repairable by them.

## What democracy gets for free that the firm had to pay for

`firm` needed a *finite* state set, because there an agent changing the topology
changed the **type**: two sales reps must each be told what to sell, so
`Sales ⊠ Sales` is not `Sales`, and only a finite family could be summed.

Delegation is different in a way worth stating precisely.

Every delegate serves the **same** container. The family is constant, so

```
Σ (d : Delegates). IssueC   ≅   Delegates × IssueC
```

and a sum of a *constant* family is a product with its index set, which does not
need the index set to be finite.

> **The electorate may be unbounded. New parties, new independents, and every
> regular citizen who decides to become politically active are additions the
> types already accommodate — because they arrive holding an interface that
> already exists.**

Campaigning therefore changes the topology continuously and costs nothing, which
is the correct answer for a democracy and was *not* available to the CEO. The
difference is uniformity of interface, and it is worth knowing what would destroy
it: give parties a capability individuals lack — a manifesto endpoint, a
whip — and the family stops being constant.

## Open, and in roughly the order they matter

1. **Cycle policy.** Detection is solved. What should *happen*? Candidates: the
   vote abstains; it falls back to a `×` second choice; it returns to the
   citizen as a notification; it is split evenly round the cycle. These are
   different political theories and the formalism does not choose.
2. **Coarsest presentation** of a delegation, per above.
3. **What a party is.** A party that delegates to its members is a runner like
   any other. A party that has a *line* is a leaf. Both should be expressible,
   and the difference should be visible to the citizen delegating to it.
4. **Whether the chat room is inside the algebra.** Debate changes minds, which
   changes votes. A container says what a valid answer is and nothing about how
   it was arrived at, so debate may be entirely outside — or `⊠` over
   participants with a fold is the tally and the debate is the fold's argument.
5. **Budget allocation**, which the brief explicitly sets aside. Worth noting
   that `federation/business-model.pdf` is about exactly the case where consensus
   cannot be reached and a resource must be allocated or fought over, so the
   extension has somewhere to start.

## What to build first

A tree of issues, a handful of citizens with refinable delegations, and
`resolve(citizen, issue)` that walks the chain with `visited` in the prompt and
reports either a vote or the cycle it fell into. That is small, it is the part
everything else rests on, and it makes the cycle question concrete enough to
argue about.

`lib/` is not vendored yet; it will be, from `federation`, when there is code.
