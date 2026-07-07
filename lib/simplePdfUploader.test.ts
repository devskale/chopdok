// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSimplePdfUploader } from "./simplePdfUploader";

describe("useSimplePdfUploader", () => {
  it("loadFile rejects a non-PDF file without loading it (#6 guard)", async () => {
    const { result } = renderHook(() => useSimplePdfUploader());
    expect(result.current.pdfFile).toBeNull();

    const textFile = new File(["not a pdf"], "notes.txt", { type: "text/plain" });
    await act(async () => {
      await result.current.loadFile(textFile);
    });

    // Guard fires before any pdf.js work, so state stays empty.
    expect(result.current.pdfFile).toBeNull();
    expect(result.current.fileInfo).toBeNull();
    expect(result.current.thumbnails).toEqual([]);
    expect(result.current.thumbnailProgress).toBe(0);
  });

  it("clearAll resets to the initial empty state", () => {
    const { result } = renderHook(() => useSimplePdfUploader());
    act(() => {
      result.current.clearAll();
    });
    expect(result.current.pdfFile).toBeNull();
    expect(result.current.fileInfo).toBeNull();
    expect(result.current.thumbnails).toEqual([]);
    expect(result.current.splitPDFs).toEqual([]);
  });
});
