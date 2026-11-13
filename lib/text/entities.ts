/** Named HTML entities that often appear in books (EPUB/HTML). */
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", copy: "©", reg: "®", deg: "°", middot: "·", bull: "•",
  eacute: "é", egrave: "è", ecirc: "ê", aacute: "á", agrave: "à", acirc: "â", iacute: "í",
  oacute: "ó", ocirc: "ô", uacute: "ú", ccedil: "ç", ntilde: "ñ", ouml: "ö", uuml: "ü", auml: "ä",
  aelig: "æ", AElig: "Æ", szlig: "ß", pound: "£", euro: "€", times: "×", shy: "",
};

/** Turns XML/HTML entities like &amp; &#8217; &rsquo; back into characters. */
export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return NAMED[code] ?? NAMED[code.toLowerCase()] ?? m;
  });
}
