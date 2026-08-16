import { describe, it, expect, beforeEach } from "vitest";
import {
  DocumentItem,
  moveItem,
  insertItems,
  removeItems,
  deriveParts,
  assignPartIndices,
  deriveDocRuns,
  deriveSplitUnits,
  ItemEdits,
} from "./documents";

let n = 0;
const item = (over: Partial<DocumentItem> = {}): DocumentItem => ({
  id: `i${++n}`,
  kind: "image",
  label: `Item ${n}`,
  thumbnailUrl: "blob:x",
  width: 100,
  height: 100,
  source: { type: "image", file: new File([], "x.png") },
  ...over,
});

const ids = (items: DocumentItem[]) => items.map((i) => i.id);

beforeEach(() => {
  n = 0;
});

describe("moveItem", () => {
  it("moves an item forward and backward", () => {
    const a = [item(), item(), item(), item()];
    expect(ids(moveItem(a, 0, 2))).toEqual(["i2", "i3", "i1", "i4"]);
    expect(ids(moveItem(a, 3, 1))).toEqual(["i1", "i4", "i2", "i3"]);
  });

  it("clamps out-of-range targets and ignores bad sources", () => {
    const a = [item(), item()];
    expect(ids(moveItem(a, 0, 99))).toEqual(["i2", "i1"]); // clamp to end
    expect(ids(moveItem(a, 0, -5))).toEqual(["i1", "i2"]); // clamp to start
    expect(ids(moveItem(a, -1, 0))).toEqual(["i1", "i2"]); // invalid from → no-op
    expect(ids(moveItem(a, 9, 0))).toEqual(["i1", "i2"]);
  });

  it("does not mutate the input", () => {
    const a = [item(), item(), item()];
    const before = ids(a);
    moveItem(a, 0, 2);
    expect(ids(a)).toEqual(before);
  });
});

describe("insertItems", () => {
  it("inserts at start, middle, and end (clamped)", () => {
    const a = [item(), item(), item()];
    const b = [item(), item()];
    expect(ids(insertItems(a, b, 0))).toEqual(["i4", "i5", "i1", "i2", "i3"]);
    expect(ids(insertItems(a, b, 2))).toEqual(["i1", "i2", "i4", "i5", "i3"]);
    expect(ids(insertItems(a, b, 99))).toEqual(["i1", "i2", "i3", "i4", "i5"]);
  });
});

describe("removeItems", () => {
  it("removes multiple indices and preserves order", () => {
    const a = [item(), item(), item(), item(), item()];
    expect(ids(removeItems(a, [0, 3]))).toEqual(["i2", "i3", "i5"]);
    expect(removeItems(a, [])).toHaveLength(5);
  });
});

describe("deriveParts (item-anchored segments)", () => {
  const five = () => [item(), item(), item(), item(), item()];

  it("no markers → a single part with all items", () => {
    const parts = deriveParts(five());
    expect(parts).toHaveLength(1);
    expect(parts[0].index).toBe(1);
    expect(parts[0].items).toHaveLength(5);
    expect(parts[0].startItemId).toBe("i1");
  });

  it("a boundary marker begins a new part; identity is the live item's id", () => {
    const items = five();
    const parts = deriveParts(items, { i3: { deleted: false, boundary: "split" } });
    expect(parts).toHaveLength(2);
    expect(parts[1].startItemId).toBe("i3");
    expect(parts[1].items.map((i) => i.id)).toEqual(["i3", "i4", "i5"]);
  });

  it("deleted items are excluded but do not merge neighbouring parts", () => {
    // Cut at i3, then delete i3: the boundary (and name) carries to i4.
    const items = five();
    const edits: ItemEdits = {
      i3: { deleted: true, boundary: "split", name: "B" },
      i2: { deleted: true },
    };
    const parts = deriveParts(items, edits);
    expect(parts).toHaveLength(2);
    expect(parts[1].startItemId).toBe("i4");
    expect(parts[1].name).toBe("B"); // name survived the deleted boundary
    expect(parts[0].items.map((i) => i.id)).toEqual(["i1"]); // i2 shaded
    expect(parts[1].items.map((i) => i.id)).toEqual(["i4", "i5"]);
  });

  it("a segment whose every item is deleted produces no part", () => {
    const items = five();
    const edits: ItemEdits = {
      i3: { deleted: true, boundary: "split" },
      i4: { deleted: true },
      i5: { deleted: true },
    };
    const parts = deriveParts(items, edits);
    expect(parts).toHaveLength(1);
    expect(parts[0].items.map((i) => i.id)).toEqual(["i1", "i2"]);
  });

  it("names are keyed to the part, not a position (reorder-safe)", () => {
    // Part anchored at i3 named "B"; inserting items before keeps the name.
    const items = five();
    const edits: ItemEdits = { i3: { deleted: false, boundary: "index", name: "B" } };
    const before = deriveParts(items, edits);
    const after = deriveParts(insertItems(items, [item()], 0), edits);
    expect(after[1].name).toBe(before[1].name); // "B" still anchored to i3's part
    expect(after[1].startItemId).toBe("i3");
  });

  it("consecutive markers do not create empty parts", () => {
    const items = five();
    const edits: ItemEdits = {
      i2: { deleted: false, boundary: "index" },
      i3: { deleted: false, boundary: "split" },
    };
    const parts = deriveParts(items, edits);
    expect(parts).toHaveLength(3);
    expect(parts.map((p) => p.items)).toHaveLength(3);
    expect(parts[1].items.map((i) => i.id)).toEqual(["i2"]);
    expect(parts[2].items.map((i) => i.id)).toEqual(["i3", "i4", "i5"]);
  });
});

describe("assignPartIndices (display helper)", () => {
  it("mirrors deriveParts boundaries including deleted items", () => {
    const items = [item(), item(), item(), item(), item()];
    const edits: ItemEdits = {
      i2: { deleted: true },
      i3: { deleted: false, boundary: "split" },
    };
    expect(assignPartIndices(items, edits)).toEqual([0, 0, 1, 1, 1]);
  });

  it("deleted boundary item tints with the following part's origin clamped to previous", () => {
    const items = [item(), item(), item()];
    const edits: ItemEdits = { i2: { deleted: true, boundary: "split" } };
    expect(assignPartIndices(items, edits)).toEqual([0, 0, 1]);
  });

  it("all items before the first live one clamp to 0", () => {
    const items = [item(), item(), item()];
    const edits: ItemEdits = { i1: { deleted: true } };
    expect(assignPartIndices(items, edits)).toEqual([0, 0, 0]);
  });
});

describe("deriveDocRuns (doc borders)", () => {
  const file = (name: string) => new File([], name);
  const from = (f: File): DocumentItem =>
    item({ source: { type: "image", file: f } });

  it("single file -> one run covering all items", () => {
    const f = file("scan.pdf");
    const runs = deriveDocRuns([from(f), from(f), from(f)]);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ file: f, startIndex: 0, length: 3 });
  });

  it("groups consecutive items by source FILE IDENTITY", () => {
    const a = file("a.pdf");
    const b = file("b.png");
    const runs = deriveDocRuns([from(a), from(a), from(b), from(a)]);
    expect(runs.map((r) => [r.file, r.startIndex, r.length])).toEqual([
      [a, 0, 2],
      [b, 2, 1],
      [a, 3, 1],
    ]);
  });

  it("reordering splits a file's pages into separate runs (dynamic)", () => {
    const a = file("a.pdf");
    const b = file("b.pdf");
    // b's page wedged between a's pages -> a shows as two bordered groups
    const runs = deriveDocRuns([from(a), from(b), from(a)]);
    expect(runs).toHaveLength(3);
    expect(runs.map((r) => r.file)).toEqual([a, b, a]);
  });

  it("same-named different files are distinct runs", () => {
    const runs = deriveDocRuns([from(file("x.pdf")), from(file("x.pdf"))]);
    expect(runs).toHaveLength(2);
  });

  it("empty list -> no runs", () => {
    expect(deriveDocRuns([])).toEqual([]);
  });
});

describe("boundary kinds (index vs split)", () => {
  const five = () => [item(), item(), item(), item(), item()];

  it("index boundaries segment WITHOUT cutting (virtual)", () => {
    const parts = deriveParts(five(), {
      i1: { deleted: false, boundary: "index", name: "Intro" },
      i3: { deleted: false, boundary: "index", name: "Body" },
    });
    expect(parts).toHaveLength(2);
    expect(parts[0].boundary).toBe("index");
    expect(parts.map((p) => p.name)).toEqual(["Intro", "Body"]);
  });

  it("implicit first part carries boundary: undefined", () => {
    const parts = deriveParts(five());
    expect(parts[0].boundary).toBeUndefined();
  });
});

describe("deriveSplitUnits (index is virtual, split is real)", () => {
  const five = () => [item(), item(), item(), item(), item()];

  it("ONLY index boundaries -> ONE physical unit, segments nested as bookmarks", () => {
    const units = deriveSplitUnits(five(), {
      i1: { deleted: false, boundary: "index", name: "A" },
      i3: { deleted: false, boundary: "index", name: "B" },
    });
    expect(units).toHaveLength(1);
    expect(units[0].items).toHaveLength(5);
    expect(units[0].segments.map((s) => s.name)).toEqual(["A", "B"]);
    expect(units[0].segments[0].items).toHaveLength(2);
    expect(units[0].segments[1].items).toHaveLength(3);
  });

  it("split boundaries cut into real units; index segments stay inside", () => {
    const units = deriveSplitUnits(five(), {
      i3: { deleted: false, boundary: "split", name: "Part Two" },
      i5: { deleted: false, boundary: "index", name: "tail" },
    });
    expect(units).toHaveLength(2);
    expect(units[0].items.map((i) => i.id)).toEqual(["i1", "i2"]);
    expect(units[1].name).toBe("Part Two");
    expect(units[1].items.map((i) => i.id)).toEqual(["i3", "i4", "i5"]);
    expect(units[1].segments.map((s) => s.name)).toEqual(["tail"]);
  });

  it("an index boundary directly after a split starts the unit's first segment", () => {
    const units = deriveSplitUnits(five(), {
      i3: { deleted: false, boundary: "split", name: "X" },
      i4: { deleted: false, boundary: "index", name: "inner" },
    });
    expect(units[1].segments.map((s) => s.name)).toEqual(["inner"]);
  });

  it("deleted split boundary carries to the next live item (name too)", () => {
    const units = deriveSplitUnits(five(), {
      i3: { deleted: true, boundary: "split", name: "kept" },
    });
    expect(units).toHaveLength(2);
    expect(units[1].startItemId).toBe("i4");
    expect(units[1].name).toBe("kept");
  });

  it("no boundaries at all -> one unit, no segments", () => {
    const units = deriveSplitUnits(five());
    expect(units).toHaveLength(1);
    expect(units[0].items).toHaveLength(5);
    expect(units[0].segments).toHaveLength(0);
  });
});
