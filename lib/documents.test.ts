import { describe, it, expect, beforeEach } from "vitest";
import {
  DocumentItem,
  moveItem,
  insertItems,
  removeItems,
  deriveParts,
  assignPartIndices,
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

  it("a partStart marker begins a new part; identity is the live item's id", () => {
    const items = five();
    const parts = deriveParts(items, { i3: { deleted: false, partStart: true } });
    expect(parts).toHaveLength(2);
    expect(parts[1].startItemId).toBe("i3");
    expect(parts[1].items.map((i) => i.id)).toEqual(["i3", "i4", "i5"]);
  });

  it("deleted items are excluded but do not merge neighbouring parts", () => {
    // Cut at i3, then delete i3: the boundary (and name) carries to i4.
    const items = five();
    const edits = {
      i3: { deleted: true, partStart: true, name: "B" },
      i2: { deleted: true, partStart: false },
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
    const edits = {
      i3: { deleted: true, partStart: true },
      i4: { deleted: true, partStart: false },
      i5: { deleted: true, partStart: false },
    };
    const parts = deriveParts(items, edits);
    expect(parts).toHaveLength(1);
    expect(parts[0].items.map((i) => i.id)).toEqual(["i1", "i2"]);
  });

  it("names are keyed to the part, not a position (reorder-safe)", () => {
    // Part anchored at i3 named "B"; inserting items before keeps the name.
    const items = five();
    const edits = { i3: { deleted: false, partStart: true, name: "B" } };
    const before = deriveParts(items, edits);
    const after = deriveParts(insertItems(items, [item()], 0), edits);
    expect(after[1].name).toBe(before[1].name); // "B" still anchored to i3's part
    expect(after[1].startItemId).toBe("i3");
  });

  it("consecutive markers do not create empty parts", () => {
    const items = five();
    const edits = {
      i2: { deleted: false, partStart: true },
      i3: { deleted: false, partStart: true },
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
    const edits = {
      i2: { deleted: true, partStart: false },
      i3: { deleted: false, partStart: true },
    };
    expect(assignPartIndices(items, edits)).toEqual([0, 0, 1, 1, 1]);
  });

  it("deleted boundary item tints with the following part's origin clamped to previous", () => {
    const items = [item(), item(), item()];
    const edits = { i2: { deleted: true, partStart: true } };
    expect(assignPartIndices(items, edits)).toEqual([0, 0, 1]);
  });

  it("all items before the first live one clamp to 0", () => {
    const items = [item(), item(), item()];
    const edits = { i1: { deleted: true, partStart: false } };
    expect(assignPartIndices(items, edits)).toEqual([0, 0, 0]);
  });
});
