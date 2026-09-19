import { describe, it, expect } from "vitest";
import { ingestFile, MAX_FILE_BYTES, WARN_PAGES, MAX_PAGES } from "./ingest";

/** File with a faked `size` (avoids allocating huge buffers in tests). */
function fileOfSize(bytes: number, name = "big.pdf"): File {
  const f = new File([new Uint8Array(0)], name, { type: "application/pdf" });
  Object.defineProperty(f, "size", { value: bytes });
  return f;
}

describe("ingest guards", () => {
  it("rejects files over MAX_FILE_BYTES before touching the pdf engine", async () => {
    const result = await ingestFile(fileOfSize(MAX_FILE_BYTES + 1));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/max is 100 MB/);
  });

  it("accepts a file at the size limit boundary semantics (below limit is not size-rejected)", async () => {
    // Below the limit the size guard must NOT fire — the pdf path would then
    // try the engine, which we don't have in jsdom; we assert the guard via
    // the distinct error message instead (corrupt-pdf path, not size path).
    const result = await ingestFile(fileOfSize(1024, "small.pdf"));
    expect(result.ok).toBe(false);
    expect(result.error).not.toMatch(/max is 100 MB/);
  });

  it("rejects unsupported files with a friendly message", async () => {
    const result = await ingestFile(
      new File([new Uint8Array(4)], "notes.txt", { type: "text/plain" })
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/isn't a supported PDF or image/);
  });

  it("page-count thresholds are ordered", () => {
    expect(WARN_PAGES).toBeGreaterThan(0);
    expect(MAX_PAGES).toBeGreaterThan(WARN_PAGES);
  });
});
