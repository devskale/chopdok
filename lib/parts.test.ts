import { describe, it, expect } from "vitest";
import { getPartInfo } from "./parts";

describe("getPartInfo", () => {
  it("with no splits, every page is part 1 starting at page 1", () => {
    for (let p = 1; p <= 10; p++) {
      expect(getPartInfo([], p)).toEqual({ startPage: 1, partIndex: 1 });
    }
  });

  it("assigns parts by split boundaries", () => {
    const sp = [4];
    expect(getPartInfo(sp, 1)).toEqual({ startPage: 1, partIndex: 1 });
    expect(getPartInfo(sp, 3)).toEqual({ startPage: 1, partIndex: 1 });
    expect(getPartInfo(sp, 4)).toEqual({ startPage: 4, partIndex: 2 });
    expect(getPartInfo(sp, 6)).toEqual({ startPage: 4, partIndex: 2 });
  });

  it("handles multiple splits", () => {
    const sp = [2, 4];
    expect(getPartInfo(sp, 1)).toEqual({ startPage: 1, partIndex: 1 });
    expect(getPartInfo(sp, 2)).toEqual({ startPage: 2, partIndex: 2 });
    expect(getPartInfo(sp, 3)).toEqual({ startPage: 2, partIndex: 2 });
    expect(getPartInfo(sp, 4)).toEqual({ startPage: 4, partIndex: 3 });
    expect(getPartInfo(sp, 6)).toEqual({ startPage: 4, partIndex: 3 });
  });

  it("sorts unsorted split points", () => {
    const sp = [4, 2];
    expect(getPartInfo(sp, 3)).toEqual({ startPage: 2, partIndex: 2 });
    expect(getPartInfo(sp, 4)).toEqual({ startPage: 4, partIndex: 3 });
  });

  // Regression for issue #4: a renamed part's identity (startPage) must NOT
  // change when an earlier split is added — names are keyed by startPage, not
  // by positional index (which would slide the label onto the wrong pages).
  it("a part's startPage is stable when an earlier split is added (#4 anchor)", () => {
    expect(getPartInfo([4], 4).startPage).toBe(4); // part starts at page 4
    expect(getPartInfo([2, 4], 4).startPage).toBe(4); // still page 4 after earlier split
    expect(getPartInfo([2, 4], 2).startPage).toBe(2); // new middle part starts at 2
    // index shifts (2 -> 3) but identity (startPage) is stable:
    expect(getPartInfo([4], 4).partIndex).toBe(2);
    expect(getPartInfo([2, 4], 4).partIndex).toBe(3);
  });
});
