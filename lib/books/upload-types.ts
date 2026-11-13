/** File types you can upload (used in the browser and on the server). */
export const UPLOAD_TYPES = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
} as const;

export type UploadExt = keyof typeof UPLOAD_TYPES;

/** Biggest file we accept (also set on the Storage bucket). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** "My Book.EPUB" → "epub" (or null if we cannot read this type). */
export function uploadExt(fileName: string): UploadExt | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext in UPLOAD_TYPES ? (ext as UploadExt) : null;
}

/** "the_hobbit-final.pdf" → "the hobbit final" (title when the file has none). */
export function titleFromFileName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base || "My book";
}
