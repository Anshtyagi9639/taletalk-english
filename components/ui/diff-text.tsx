import { cn } from "@/lib/utils";

type Part = { text: string; kind: "same" | "removed" | "added" };

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/** Word-by-word difference between two sentences (longest common subsequence). */
export function diffWords(from: string, to: string): Part[] {
  const a = from.split(/\s+/).filter(Boolean);
  const b = to.split(/\s+/).filter(Boolean);
  // dp[i][j] = length of the common part of a[i..] and b[j..]
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts: Part[] = [];
  const push = (text: string, kind: Part["kind"]) => {
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += ` ${text}`;
    else parts.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (norm(a[i]) === norm(b[j])) {
      push(b[j], "same");
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push(a[i++], "removed");
    else push(b[j++], "added");
  }
  while (i < a.length) push(a[i++], "removed");
  while (j < b.length) push(b[j++], "added");
  return parts;
}

/**
 * Shows my sentence → the better sentence in one line:
 * my wrong words in red strikethrough, the right words in green.
 */
export function DiffText({ from, to, className }: { from: string; to: string; className?: string }) {
  const parts = diffWords(from, to);
  return (
    <p className={cn("leading-relaxed", className)}>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && " "}
          {p.kind === "same" ? (
            p.text
          ) : p.kind === "removed" ? (
            <del className="rounded bg-destructive-soft px-1 text-destructive decoration-2" aria-label={`remove: ${p.text}`}>
              {p.text}
            </del>
          ) : (
            <ins className="rounded bg-success-soft px-1 font-semibold text-success no-underline" aria-label={`add: ${p.text}`}>
              {p.text}
            </ins>
          )}
        </span>
      ))}
    </p>
  );
}
