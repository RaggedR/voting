// issues.ts — the issue tree, and delegation by inheritance.
//
// An issue is a path: "education/art". Its ancestors are its prefixes, which is
// the whole of the tree structure and needs no separate parent table.
//
// A delegation is a PARTIAL function on this tree denoting a TOTAL function on
// its leaves: an assignment at a node governs everything below it until
// something more specific overrides. The lazy delegation — one party for
// everything — is the constant function, presented by a single entry at "".

export type IssueId = string;

/** What kind of answer an issue admits. The container's positions depend on
 *  this, which is the dependency `PosAt` exists to carry. */
export type Kind =
  | { tag: "Binary" }
  | { tag: "Choice"; options: readonly string[] }
  | { tag: "Amount"; lo: number; hi: number };

export interface Issue {
  readonly id: IssueId;
  readonly kind: Kind;
  readonly children: readonly IssueId[];
}

/** A vote. Which constructors are legal depends on the issue's kind; `legal`
 *  below is the runtime half of that and `VoteFor` in type-tests is the
 *  type-level half. */
export type Vote =
  | { tag: "Aye" }
  | { tag: "Nay" }
  | { tag: "Pick"; option: string }
  | { tag: "Amount"; value: number };

export type VoteFor<K extends Kind> = K extends { tag: "Binary" }
  ? { tag: "Aye" } | { tag: "Nay" }
  : K extends { tag: "Choice" } ? { tag: "Pick"; option: string }
  : K extends { tag: "Amount" } ? { tag: "Amount"; value: number }
  : never;

export const legal = (k: Kind, v: Vote): boolean => {
  switch (k.tag) {
    case "Binary": return v.tag === "Aye" || v.tag === "Nay";
    case "Choice": return v.tag === "Pick" && k.options.includes(v.option);
    case "Amount": return v.tag === "Amount" && v.value >= k.lo && v.value <= k.hi;
  }
};

// ── The tree, as prefixes ─────────────────────────────────────────────

/** "education/art" -> ["education/art", "education", ""]. Most specific first,
 *  which is the order inheritance wants. */
export function ancestors(id: IssueId): IssueId[] {
  const out: IssueId[] = [];
  let cur = id;
  for (;;) {
    out.push(cur);
    if (cur === "") return out;
    const cut = cur.lastIndexOf("/");
    cur = cut === -1 ? "" : cur.slice(0, cut);
  }
}

export const isAncestor = (anc: IssueId, of: IssueId): boolean =>
  anc === "" || of === anc || of.startsWith(anc + "/");

/** The nearest assignment at or above `issue`. This is inheritance, and it is
 *  the only place the tree is used. */
export function nearest<T>(
  assign: ReadonlyMap<IssueId, T>,
  issue: IssueId,
): { at: IssueId; value: T } | null {
  for (const a of ancestors(issue)) {
    const v = assign.get(a);
    if (v !== undefined) return { at: a, value: v };
  }
  return null;
}

// ── An issue tree, as a registry ──────────────────────────────────────

export class Issues {
  readonly byId: ReadonlyMap<IssueId, Issue>;
  constructor(list: readonly Issue[]) {
    this.byId = new Map(list.map((i) => [i.id, i]));
  }
  kind(id: IssueId): Kind | null {
    return this.byId.get(id)?.kind ?? null;
  }
  /** Every leaf at or below `id`. Leaves are where votes actually happen. */
  leaves(id: IssueId = ""): IssueId[] {
    const node = this.byId.get(id);
    if (!node) return [];
    if (node.children.length === 0) return [id];
    return node.children.flatMap((c) => this.leaves(c));
  }
}
