/** How well a search result fits the title we read from the photo (0 = no match, 1 = same). */

const STOP = new Set(["the", "a", "an", "of", "and", "in", "on", "to", "or", "by", "with", "for"]);

function words(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
}

/** Share of the photo title's words found in the result title (+ a little for the same author). */
export function matchScore(wantTitle: string, wantAuthor: string | null, title: string, author: string | null) {
  const want = words(wantTitle);
  if (want.length === 0) return 0;
  const have = new Set(words(title));
  const found = want.filter((w) => have.has(w)).length;
  // Mostly: are the photo's words there? A little: does the result have extra words ("... Workbook")?
  const titleScore = (found / want.length) * (0.7 + (0.3 * found) / Math.max(1, have.size));
  // 85% title + 15% author (same family name).
  const last = wantAuthor ? words(wantAuthor).pop() : undefined;
  const authorScore = last && author && words(author).includes(last) ? 1 : 0;
  return titleScore * 0.85 + authorScore * 0.15;
}
