"use client";

import { BookOpen, Clock, Flame, Heart, Languages, PartyPopper, Plane, Search, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { openSearch } from "@/components/layout/global-search";
import { BookCover } from "@/components/library/book-cover";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DiffText } from "@/components/ui/diff-text";
import { EmptyState } from "@/components/ui/empty-state";
import { LevelBadge } from "@/components/ui/level-badge";
import { MicButton } from "@/components/ui/mic-button";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Sheet } from "@/components/ui/sheet";
import { Shelf } from "@/components/ui/shelf";
import { CardSkeleton, ListSkeleton, ShelfSkeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StreakFlame } from "@/components/ui/streak-flame";
import { celebrate } from "@/lib/feedback";

const BOOKS = [
  { title: "Aesop's Fables", author: "Aesop" },
  { title: "The Wonderful Wizard of Oz", author: "L. Frank Baum" },
  { title: "Alice's Adventures in Wonderland", author: "Lewis Carroll" },
  { title: "The Gift of the Magi", author: "O. Henry" },
  { title: "Treasure Island", author: "Robert Louis Stevenson" },
  { title: "Anne of Green Gables", author: "L. M. Montgomery" },
  { title: "Pride and Prejudice", author: "Jane Austen" },
];

const SWATCHES = [
  ["Primary", "bg-primary"],
  ["Warm", "bg-warm"],
  ["Success", "bg-success"],
  ["Error", "bg-destructive"],
  ["Page", "bg-background ring-1 ring-border"],
  ["Card", "bg-card ring-1 ring-border"],
  ["Muted", "bg-muted"],
  ["Primary soft", "bg-primary-soft"],
  ["Warm soft", "bg-warm-soft"],
  ["Success soft", "bg-success-soft"],
] as const;

/** Every shared building block on one page, to check the look in light and dark mode. */
export function DesignKit() {
  const [interests, setInterests] = useState<string[]>(["travel"]);
  const [listening, setListening] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const toggle = (id: string) => setInterests((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  return (
    <div className="space-y-12">
      <Section title="Hero card" note="Gradients are used only here and in the full-screen player.">
        <div className="relative overflow-hidden rounded-sheet bg-hero p-6 shadow-lift sm:p-8">
          <div className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <p className="text-sm font-semibold text-white/85">Today&apos;s story · 5 min</p>
          <h3 className="mt-1 max-w-md text-2xl font-bold">The Fox and the Grapes</h3>
          <p className="mt-2 max-w-md text-base text-white/90">Why today: short, easy words, and you liked animal stories.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button size="lg" className="bg-white text-[#3730a3] hover:bg-white/90">
              <BookOpen /> Start reading
            </Button>
            <StreakFlame days={6} className="bg-white/15 text-white [&_svg]:fill-warm [&_svg]:text-warm" />
          </div>
        </div>
      </Section>

      <Section title="Colors">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SWATCHES.map(([name, cls]) => (
            <li key={name} className="space-y-1.5">
              <div className={`h-14 rounded-xl ${cls}`} />
              <p className="text-sm font-medium">{name}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {["A1", "A2", "B1", "B2", "C1"].map((l) => (
            <LevelBadge key={l} level={l} size="md" />
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Light paper", "bg-paper-light text-ink-light"],
              ["Sepia paper", "bg-paper-sepia text-ink-sepia"],
              ["Dark paper", "bg-paper-dark text-ink-dark"],
            ] as const
          ).map(([name, cls]) => (
            <div key={name} className={`rounded-card p-5 ring-1 ring-border ${cls}`}>
              <p className="text-xs font-semibold tracking-wide uppercase opacity-70">{name}</p>
              <p className="mt-2 font-reading text-reading">Once upon a time, a little fox walked into the forest.</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <div className="space-y-2">
          <p className="text-3xl font-bold">Heading 36</p>
          <p className="text-2xl font-bold">Heading 28</p>
          <p className="text-xl font-semibold">Title 22</p>
          <p className="text-lg">Large 18</p>
          <p className="text-base">Body 16 — Plus Jakarta Sans</p>
          <p className="text-sm text-muted-foreground">Small 14 — muted</p>
          <p className="text-xs text-muted-foreground">Tiny 12</p>
          <p className="font-reading text-reading">Reading 19 — Literata, line height 1.7.</p>
          <p className="font-lora text-reading">Lora — a soft book font.</p>
          <p className="font-merriweather text-reading">Merriweather — strong and clear.</p>
          <p className="font-readable text-reading">Atkinson Hyperlegible — easy to read.</p>
        </div>
      </Section>

      <Section title="Buttons" note="They scale down a little when pressed.">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Main action</Button>
          <Button>Default</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="warm">
            <Trophy /> Reward
          </Button>
          <Button variant="destructive">Delete</Button>
          <Button size="sm">Small</Button>
        </div>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap gap-2">
          {[
            ["travel", "Travel", Plane],
            ["love", "Love", Heart],
            ["mystery", "Mystery", Search],
            ["motivation", "Motivation", Sparkles],
          ].map(([id, label, Icon]) => {
            const I = Icon as typeof Plane;
            return (
              <Chip key={id as string} selected={interests.includes(id as string)} onClick={() => toggle(id as string)} icon={<I />}>
                {label as string}
              </Chip>
            );
          })}
        </div>
      </Section>

      <Section title="Stats, rings and streak">
        <Stagger className="grid gap-3 sm:grid-cols-3">
          <StaggerItem>
            <StatCard icon={Clock} value="42" label="Minutes read" />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Flame} value="6" label="Day streak" tone="warm" />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Languages} value="128" label="Words learned" tone="success" />
          </StaggerItem>
        </Stagger>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <ProgressRing value={35} label="Book progress" />
          <ProgressRing value={70} size={72} stroke={7} tone="warm" label="Today's goal">
            <span className="text-sm">10/15</span>
          </ProgressRing>
          <ProgressRing value={100} tone="success" label="Done" />
          <StreakFlame days={6} />
          <StreakFlame days={0} />
        </div>
      </Section>

      <Section title="Book covers + shelf" note="Swipe on a phone, arrows on a laptop. Books without a picture get a drawn cover.">
        <Shelf title="Reading now" seeAllHref="/library">
          {BOOKS.map((b) => (
            <div key={b.title} className="w-32 space-y-2 sm:w-36">
              <BookCover title={b.title} author={b.author} coverUrl={null} sizes="144px" />
              <p className="line-clamp-2 text-sm font-semibold">{b.title}</p>
            </div>
          ))}
        </Shelf>
      </Section>

      <Section title="Better way to say it">
        <Card>
          <CardContent className="space-y-1 text-base">
            <p className="text-sm text-muted-foreground">You wrote → better:</p>
            <DiffText from="Yesterday I go to market with my friend" to="Yesterday I went to the market with my friend" />
          </CardContent>
        </Card>
      </Section>

      <Section title="Mic button">
        <div className="flex items-center gap-6">
          <MicButton listening={listening} onClick={() => setListening((l) => !l)} />
          <MicButton listening={false} busy onClick={() => {}} size="md" label="Checking" />
          <p className="text-base text-muted-foreground">{listening ? "Listening… tap to stop" : "Tap to speak"}</p>
        </div>
      </Section>

      <Section title="Sheet, search and celebration">
        <div className="flex flex-wrap gap-3">
          <Button variant="soft" onClick={() => setSheetOpen(true)}>
            Open a sheet
          </Button>
          <Button variant="outline" onClick={openSearch}>
            <Search /> Search (Ctrl+K)
          </Button>
          <Button variant="warm" onClick={() => void celebrate()}>
            <PartyPopper /> Big win!
          </Button>
        </div>
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="happy"
          description="/ˈhæp.i/ · HAP-ee"
          footer={
            <Button size="lg" className="w-full" onClick={() => setSheetOpen(false)}>
              Save word
            </Button>
          }
        >
          <p className="text-base">Feeling good and smiling.</p>
          <p className="mt-2 text-base text-muted-foreground">“I am happy to meet you.”</p>
          <p className="mt-4 text-sm text-muted-foreground">On a phone this slides up from the bottom (swipe down to close). On a laptop it is a dialog.</p>
        </Sheet>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
            <CardHeader>
              <CardTitle>Word of the day</CardTitle>
              <CardDescription>Cards lift a little on hover (laptop).</CardDescription>
            </CardHeader>
            <CardContent className="text-base">
              <span className="font-bold">grateful</span> — thankful for something.
            </CardContent>
          </Card>
          <EmptyState icon={BookOpen} title="No books yet" text="Add your first story to start reading." action={<Button>Add a book</Button>} />
        </div>
      </Section>

      <Section title="Loading">
        <div className="space-y-4">
          <ShelfSkeleton count={4} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CardSkeleton />
            <ListSkeleton rows={2} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}
