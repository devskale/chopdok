// Pure helpers for mapping pages -> parts. Kept out of the component so they're
// unit-testable. A part's identity is its START PAGE (stable when splits move).

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
