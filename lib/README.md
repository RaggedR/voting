# lib — vendored

`algebra.ts`, `wire.ts` and `delegate.ts` are copied verbatim from `firm`, which
copied them from `federation`, from `stalin`, from `tower` — an implementation of
§4–§5 of Neil Ghani's *Containers for Typed Agentic AI*.

They are vendored rather than depended on so this repository stands alone. The
same library now serves a planned economy, a Čech cocycle, a firm and an
electorate, with no divergence in the library itself.

`wire.ts` reads an environment variable named `STALIN_INPROC`. The name belongs
to the first project and is left alone, because a rename here would be the
beginning of a fork.

There is exactly **one** divergence from upstream, inherited: `wire.ts`
originally imported `isRecord` from the tower's bookkeeping module, so the
four-line helper is inlined instead.

**Known defect, reported not patched.** `delegate` spawns each hop with an
unscoped `--allow-net`, so a server holding `--allow-run=deno` can reach any
host through the child regardless of its own network scoping. See
`firm/sandbox-check.sh`, which demonstrates it. Leaf-ness is enforced by
withholding `--allow-run`; per-edge topology is not enforced at all.
