// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDocumentAssembler } from "./useDocumentAssembler";
import { ingestFile } from "./ingest";

// The pdf.js/canvas render paths are browser-heavy; here we mock ingestFile
// (the real dispatch logic is covered by its own test file / integration).
vi.mock("./ingest", () => ({
  ingestFile: vi.fn(),
}));
const mockIngest = ingestFile as ReturnType<typeof vi.fn>;

const pngFile = () => new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });

const imageResult = (id: string) => ({
  ok: true,
  items: [
    {
      id,
      kind: "image" as const,
      label: id,
      thumbnailUrl: "blob:x",
      width: 10,
      height: 10,
      source: { type: "image" as const, file: pngFile() },
    },
  ],
});

describe("useDocumentAssembler", () => {
  it("rejects unsupported files without touching state (#6 guard, ported)", async () => {
    mockIngest.mockResolvedValueOnce({ ok: false, items: [], error: "nope" });
    const { result } = renderHook(() => useDocumentAssembler());
    await act(async () => {
      await result.current.addFiles([new File([], "notes.txt", { type: "text/plain" })]);
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.parts).toEqual([]);
    expect(mockIngest).toHaveBeenCalledTimes(1);
  });

  it("addFiles appends items and derives parts", async () => {
    mockIngest
      .mockResolvedValueOnce(imageResult("a"))
      .mockResolvedValueOnce(imageResult("b"));
    const { result } = renderHook(() => useDocumentAssembler());
    await act(async () => {
      await result.current.addFiles([pngFile(), pngFile()]);
    });
    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    // Two files -> two auto index segments (mergeable)
    expect(result.current.parts).toHaveLength(2);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.progress).toBe(100);
  });

  it("move/shift reorder items", async () => {
    mockIngest.mockResolvedValueOnce({
      ok: true,
      items: [...imageResult("a").items, ...imageResult("b").items, ...imageResult("c").items],
    });
    const { result } = renderHook(() => useDocumentAssembler());
    await act(async () => {
      await result.current.addFiles([pngFile()]);
    });
    act(() => result.current.move(0, 2));
    expect(result.current.items.map((i) => i.id)).toEqual(["b", "c", "a"]);
    act(() => result.current.shift(2, -1));
    expect(result.current.items.map((i) => i.id)).toEqual(["b", "a", "c"]);
  });

  it("addFiles auto-creates a virtual segment named after the file", async () => {
    mockIngest.mockResolvedValueOnce(imageResult("a"));
    const { result } = renderHook(() => useDocumentAssembler());
    await act(async () => {
      await result.current.addFiles([new File([], "My Doc.pdf", { type: "application/pdf" })]);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.edits["a"]).toMatchObject({ segmentStart: true, name: "My Doc" });
    expect(result.current.parts[0].name).toBe("My Doc");
  });

  it("toggleSegmentStart merges and re-splits", async () => {
    mockIngest.mockResolvedValueOnce({
      ok: true,
      items: [...imageResult("a").items, ...imageResult("b").items],
    });
    const { result } = renderHook(() => useDocumentAssembler());
    await act(async () => {
      await result.current.addFiles([new File([], "x.pdf", { type: "application/pdf" })]);
    });
    // Auto segment on item a; toggle OFF -> merged (name persists harmlessly)
    act(() => result.current.toggleSegmentStart("a"));
    expect(result.current.edits["a"]?.segmentStart).toBeFalsy();
    expect(result.current.parts).toHaveLength(1);
    // Toggle ON elsewhere -> two segments again
    act(() => result.current.toggleSegmentStart("b"));
    expect(result.current.parts).toHaveLength(2);
  });

  it("togglePartStart + name: segment identity survives reorder", async () => {
    mockIngest.mockResolvedValueOnce({
      ok: true,
      items: [...imageResult("a").items, ...imageResult("b").items, ...imageResult("c").items],
    });
    const { result } = renderHook(() => useDocumentAssembler());
    await act(async () => {
      await result.current.addFiles([pngFile()]);
    });
    act(() => result.current.toggleSegmentStart("b"));
    act(() => result.current.setSegmentName("b", "Middle"));
    // a carries its auto index segment (file name), b is a named split
    expect(result.current.parts.map((p) => p.name)).toEqual(["a", "Middle"]);

    // Move "a" after "b": b's segment still starts at b, name follows it.
    act(() => result.current.move(0, 1));
    expect(result.current.items.map((i) => i.id)).toEqual(["b", "a", "c"]);
    // b starts the doc now; a's index boundary opens a segment mid-doc.
    expect(result.current.parts).toHaveLength(2);
    expect(result.current.parts[0].startItemId).toBe("b");
    expect(result.current.parts[0].name).toBe("Middle");
  });

  it("toggleDeleted excludes items and can empty a part entirely", async () => {
    mockIngest.mockResolvedValueOnce({
      ok: true,
      items: [...imageResult("a").items, ...imageResult("b").items],
    });
    const { result } = renderHook(() => useDocumentAssembler());
    await act(async () => {
      await result.current.addFiles([pngFile()]);
    });
    act(() => result.current.toggleDeleted("a"));
    act(() => result.current.toggleDeleted("b"));
    expect(result.current.deletedCount).toBe(2);
    expect(result.current.parts).toHaveLength(0);
    await expect(result.current.exportAssembledPdf()).rejects.toThrow(/Nothing to export/);
  });

  it("clearAll resets state and cancels in-flight ingest", async () => {
    let never: () => void = () => {};
    mockIngest.mockImplementationOnce(
      (_file: File, opts: { isCancelled?: () => boolean }) =>
        new Promise((resolve) => {
          never = () => resolve({ ok: false, items: [], error: "stale" });
          // Simulate a long ingest that observes cancellation.
          setTimeout(() => {
            if (opts.isCancelled?.()) resolve({ ok: false, items: [], error: "stale" });
          }, 50);
        })
    );
    const { result } = renderHook(() => useDocumentAssembler());
    act(() => {
      void result.current.addFiles([pngFile()]);
    });
    act(() => result.current.clearAll());
    expect(result.current.items).toEqual([]);
    expect(result.current.isBusy).toBe(false);
    never(); // resolve the pending promise so vitest exits cleanly
  });
});
