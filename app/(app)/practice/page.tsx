import { BookA, ChevronRight, Languages, MessageSquareQuote, PenLine, SpellCheck } from "lucide-react";
import Link from "next/link";
import { IconTile, PageHeader, type Tone } from "@/components/layout/page-header";

export const metadata = { title: "Practice" };

const TOOLS: { href: string; icon: typeof SpellCheck; tone: Tone; title: string; text: string }[] = [
  {
    href: "/practice/translate",
    icon: Languages,
    tone: "rose",
    title: "Translate & Learn (हिंदी ⇄ English)",
    text: "Write in Hindi or English. See the right English, the Hindi meaning, and how to build the sentence.",
  },
  {
    href: "/practice/grammar",
    icon: SpellCheck,
    tone: "amber",
    title: "Grammar Checker",
    text: "Paste your text. Get the correct version, your mistakes and a score.",
  },
  {
    href: "/practice/words",
    icon: BookA,
    tone: "blue",
    title: "Word & Sentence Helper",
    text: "Meaning, examples, common mistakes — and “Which is correct?”.",
  },
  {
    href: "/practice/phrases",
    icon: MessageSquareQuote,
    tone: "emerald",
    title: "Situation Phrases",
    text: "What to say at work, in a shop, on the phone… and what not to say.",
  },
  {
    href: "/practice/writing",
    icon: PenLine,
    tone: "violet",
    title: "Writing Practice",
    text: "Write a paragraph or a story together with the AI. It corrects you.",
  },
];

export default function PracticePage() {
  return (
    <>
      <PageHeader icon={PenLine} tone="amber" title="Practice" description="Small tools to fix your English, one step at a time." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map(({ href, icon, tone, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-start gap-4 rounded-card bg-card p-5 shadow-soft ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-primary/30"
            >
              <IconTile icon={icon} tone={tone} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold group-hover:text-primary">{title}</span>
                <span className="block text-base text-muted-foreground">{text}</span>
              </span>
              <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
