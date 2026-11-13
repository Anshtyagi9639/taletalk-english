/**
 * Small original illustrations (inline SVG, no image files, follow light/dark tokens).
 * Decorative: always aria-hidden. Size them with className (e.g. "w-40").
 */
import { cn } from "@/lib/utils";

type Art = { className?: string };

/** Open book with stars and a moon — reading at night. Used on the Today hero. */
export function ReadingArt({ className }: Art) {
  return (
    <svg viewBox="0 0 220 160" className={cn("h-auto", className)} aria-hidden fill="none">
      {/* glow */}
      <ellipse cx="110" cy="132" rx="86" ry="12" fill="#000" opacity="0.18" />
      {/* moon + stars */}
      <circle cx="176" cy="30" r="14" fill="#fde68a" />
      <circle cx="182" cy="25" r="12" fill="currentColor" opacity="0" />
      <path d="M176 16a14 14 0 1 0 12 21 11 11 0 0 1-12-21Z" fill="#fbbf24" />
      <path d="M40 22l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#fef3c7" />
      <path d="M150 58l1.6 3.8 3.8 1.6-3.8 1.6-1.6 3.8-1.6-3.8-3.8-1.6 3.8-1.6z" fill="#fef3c7" />
      <circle cx="70" cy="40" r="2" fill="#fef3c7" />
      <circle cx="128" cy="20" r="1.6" fill="#fef3c7" />
      {/* book: left + right pages */}
      <path d="M110 58c-18-10-42-12-66-6v74c24-6 48-4 66 6z" fill="#ffffff" />
      <path d="M110 58c18-10 42-12 66-6v74c-24-6-48-4-66 6z" fill="#eef0ff" />
      <path d="M110 58v74" stroke="#c7d2fe" strokeWidth="2" />
      {/* lines of text */}
      {[70, 80, 90, 100, 110].map((y, i) => (
        <g key={y} stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round">
          <path d={`M56 ${y + 2 - i * 0.6}c14-3 28-3 42 1`} />
          <path d={`M122 ${y + 2.4 - i * 0.6}c14-4 28-4 42-1`} opacity={i === 4 ? 0 : 1} />
        </g>
      ))}
      {/* bookmark */}
      <path d="M150 52v26l6-5 6 5V50z" fill="#f59e0b" />
      {/* cover edges */}
      <path d="M40 54v78c26-8 52-6 70 4 18-10 44-12 70-4V54" stroke="#a5b4fc" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** Two chat bubbles (Alex + me). */
export function ChatArt({ className }: Art) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-auto", className)} aria-hidden fill="none">
      <rect x="10" y="14" width="96" height="52" rx="20" className="fill-card stroke-border" strokeWidth="2" />
      <path d="M30 66l-6 16 20-16z" className="fill-card" />
      <circle cx="40" cy="40" r="5" className="fill-primary" opacity="0.35" />
      <circle cx="58" cy="40" r="5" className="fill-primary" opacity="0.6" />
      <circle cx="76" cy="40" r="5" className="fill-primary" />
      <rect x="56" y="62" width="94" height="44" rx="18" className="fill-primary" />
      <path d="M130 106l8 12-22-12z" className="fill-primary" />
      <path d="M74 84h58" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M74 94h34" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <path d="M140 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" className="fill-warm" />
    </svg>
  );
}

/** Microphone with sound waves. */
export function SpeakArt({ className }: Art) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-auto", className)} aria-hidden fill="none">
      <circle cx="80" cy="56" r="46" className="fill-primary-soft" />
      <rect x="66" y="22" width="28" height="48" rx="14" className="fill-primary" />
      <path d="M56 54a24 24 0 0 0 48 0" className="stroke-primary" strokeWidth="5" strokeLinecap="round" />
      <path d="M80 78v14M66 94h28" className="stroke-primary" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 50c6 6 6 14 0 20M12 42c11 11 11 25 0 36" className="stroke-warm" strokeWidth="4" strokeLinecap="round" />
      <path d="M138 50c-6 6-6 14 0 20M148 42c-11 11-11 25 0 36" className="stroke-warm" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** A stack of books with a little plant — for empty shelves. */
export function ShelfArt({ className }: Art) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-auto", className)} aria-hidden fill="none">
      <rect x="14" y="102" width="132" height="6" rx="3" className="fill-border" />
      <rect x="30" y="38" width="20" height="64" rx="3" fill="#3730a3" />
      <rect x="52" y="48" width="18" height="54" rx="3" fill="#0f766e" />
      <rect x="72" y="30" width="22" height="72" rx="3" fill="#9f1239" />
      <rect x="96" y="52" width="16" height="50" rx="3" fill="#a16207" transform="rotate(8 104 77)" />
      <path d="M36 50h8M58 60h6M78 44h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <rect x="120" y="80" width="18" height="22" rx="4" className="fill-warm" />
      <path d="M129 80c0-14-10-18-14-18 2 8 6 14 14 18zM129 80c0-12 8-16 12-16-1 7-5 12-12 16z" fill="#16a34a" />
    </svg>
  );
}

/** Trophy with sparkles — progress and badges. */
export function TrophyArt({ className }: Art) {
  return (
    <svg viewBox="0 0 160 120" className={cn("h-auto", className)} aria-hidden fill="none">
      <circle cx="80" cy="58" r="48" className="fill-warm-soft" />
      <path d="M56 26h48v22a24 24 0 0 1-48 0z" className="fill-warm" />
      <path d="M56 32H42a14 14 0 0 0 16 20M104 32h14a14 14 0 0 1-16 20" className="stroke-warm" strokeWidth="5" />
      <rect x="74" y="72" width="12" height="14" className="fill-warm" />
      <rect x="62" y="86" width="36" height="10" rx="3" className="fill-primary" />
      <path d="M80 36l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#fff" opacity="0.9" />
      <path d="M28 24l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM132 18l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" className="fill-primary" />
    </svg>
  );
}

/** Alex, the friendly English buddy (round face, glasses, a curl of hair). */
export function AlexFace({ className }: Art) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="alex-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#alex-bg)" />
      {/* face */}
      <circle cx="32" cy="36" r="18" fill="#fde7d4" />
      {/* hair */}
      <path d="M14 33c0-12 8-19 18-19s18 7 18 17c-4-5-10-7-16-7-7 0-13 3-20 9z" fill="#3b2a20" />
      <path d="M34 14c3-4 8-4 10-1-3 0-6 1-8 3z" fill="#3b2a20" />
      {/* glasses */}
      <circle cx="25" cy="36" r="5" fill="none" stroke="#1f2937" strokeWidth="1.8" />
      <circle cx="39" cy="36" r="5" fill="none" stroke="#1f2937" strokeWidth="1.8" />
      <path d="M30 36h4" stroke="#1f2937" strokeWidth="1.8" />
      <circle cx="25" cy="36.5" r="1.6" fill="#1f2937" />
      <circle cx="39" cy="36.5" r="1.6" fill="#1f2937" />
      {/* cheeks + smile */}
      <circle cx="21" cy="43" r="2.4" fill="#f9a8a8" opacity="0.7" />
      <circle cx="43" cy="43" r="2.4" fill="#f9a8a8" opacity="0.7" />
      <path d="M26 45c3 4 9 4 12 0" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
