import type { ChapterDraft } from "../types";

/** What we get from any uploaded file. */
export type ParsedBook = {
  title: string | null;
  author: string | null;
  chapters: ChapterDraft[];
};

/** A problem with the file. `message` is safe to show to the user. */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
