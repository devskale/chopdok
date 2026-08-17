import { describe, it, expect } from "vitest";

// float-tolerant comparison for rects built from FP arithmetic
const approx = (r: { x: number; y: number; w: number; h: number }) => ({
  x: Math.round(r.x * 1e9) / 1e9,
  y: Math.round(r.y * 1e9) / 1e9,
  w: Math.round(r.w * 1e9) / 1e9,
  h: Math.round(r.h * 1e9) / 1e9,
});
import { clampRect, rectFromDrag, rectToPixels, PRESET_RECTS } from "./crop";

describe("clampRect", () => {
  it("clamps position and size into the unit square", () => {
    expect(approx(clampRect({ x: -0.2, y: 0.1, w: 1.5, h: 0.5 }))).toEqual({
      x: 0,
      y: 0.1,
      w: 1,
      h: 0.5,
    });
    expect(approx(clampRect({ x: 0.8, y: 0.8, w: 0.5, h: 0.5 }))).toEqual({
      x: 0.8,
      y: 0.8,
      w: 0.2,
      h: 0.2,
    });
  });

  it("drops degenerate (zero/negative) sizes to zero", () => {
    expect(approx(clampRect({ x: 0.5, y: 0.5, w: -1, h: 0.25 }))).toEqual({
      x: 0.5,
      y: 0.5,
      w: 0,
      h: 0.25,
    });
  });
});

describe("rectFromDrag", () => {
  it("normalizes any drag direction (down-right, up-left, up-right)", () => {
    const a = { x: 0.2, y: 0.3 };
    expect(approx(rectFromDrag(a, { x: 0.6, y: 0.9 }))).toEqual({ x: 0.2, y: 0.3, w: 0.4, h: 0.6 });
    expect(approx(rectFromDrag({ x: 0.6, y: 0.9 }, a))).toEqual({ x: 0.2, y: 0.3, w: 0.4, h: 0.6 });
    expect(approx(rectFromDrag({ x: 0.8, y: 0.9 }, { x: 0.1, y: 0.2 }))).toEqual({
      x: 0.1,
      y: 0.2,
      w: 0.7,
      h: 0.7,
    });
  });

  it("clamps drags that leave the bitmap", () => {
    expect(approx(rectFromDrag({ x: 0.5, y: 0.5 }, { x: 1.7, y: 2.0 }))).toEqual({
      x: 0.5,
      y: 0.5,
      w: 0.5,
      h: 0.5,
    });
  });
});

describe("rectToPixels", () => {
  it("maps normalized to integer pixels", () => {
    expect(rectToPixels({ x: 0, y: 0, w: 0.5, h: 1 }, 600, 800)).toEqual({
      sx: 0,
      sy: 0,
      sw: 300,
      sh: 800,
    });
    expect(rectToPixels({ x: 0.25, y: 0.25, w: 0.5, h: 0.25 }, 400, 400)).toEqual({
      sx: 100,
      sy: 100,
      sw: 200,
      sh: 100,
    });
  });

  it("never returns zero-size or out-of-bounds regions", () => {
    expect(rectToPixels({ x: 0, y: 0, w: 0.001, h: 0.001 }, 100, 100)).toMatchObject({
      sw: 1,
      sh: 1,
    });
    const r = rectToPixels({ x: 0.9, y: 0.9, w: 0.2, h: 0.2 }, 100, 100);
    expect(r.sx + r.sw).toBeLessThanOrEqual(100);
    expect(r.sy + r.sh).toBeLessThanOrEqual(100);
  });
});

describe("PRESET_RECTS", () => {
  it("halves cover the full page without overlap", () => {
    expect(PRESET_RECTS.left.w + PRESET_RECTS.right.w).toBe(1);
    expect(PRESET_RECTS.top.h + PRESET_RECTS.bottom.h).toBe(1);
    expect(PRESET_RECTS.right.x).toBe(0.5);
    expect(PRESET_RECTS.bottom.y).toBe(0.5);
  });
});
