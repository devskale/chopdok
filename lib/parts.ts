// Pure helpers for mapping pages -> parts. No DOM/pdf-lib deps -> unit-testable.
// A part's identity is its START PAGE (stable when splits move).

/**
 * For a given page, return the part it belongs to:
 *  - startPage: the page number that part starts on (stable identity for naming)
 *  - partIndex: the 1-based position of the part (for the default "Part N" label)
 */
export function getPartInfo(
  splitPoints: number[],
  pageNumber: number
): { startPage: number; partIndex: number } {
  const starts = [1, ...splitPoints].sort((a, b) => a - b);
  let startPage = 1;
  let partIndex = 1;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= pageNumber) {
      startPage = starts[i];
      partIndex = i + 1;
    }
  }
  return { startPage, partIndex };
}

/**
 * Compute the 0-based page indices for each part.
 *  - splitPoints: 0-based indices where a new part begins
 *  - shadedPages: 0-based indices to drop (deleted pages)
 *  - totalPages:  total page count (defines the final boundary)
 */
export function computePartRanges(
  splitPoints: number[],
  shadedPages: number[],
  totalPages: number
): number[][] {
  const ranges: number[][] = [];
  let startPage = 0;
  for (const splitPoint of [...splitPoints, totalPages]) {
    const pages = Array.from({ length: splitPoint - startPage }, (_, i) => startPage + i).filter(
      (p) => !shadedPages.includes(p)
    );
    ranges.push(pages);
    startPage = splitPoint;
  }
  return ranges;
}
