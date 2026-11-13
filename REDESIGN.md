# REDESIGN.md — TaleTalk: Free Stack + New UI + New Reader

Read CLAUDE.md and PROGRESS.md first. Then follow this file step by step.

---

## 0. IMPORTANT: 100% FREE

This project must be 100% FREE. Do not use any paid API or paid package.
Remove OpenAI from the project and replace it with the free stack below.

### Free stack
- **AI text** (chat, grammar, stories, summaries, interview):
  Google Gemini API free tier (Flash or Flash-Lite model). Model name from env var
  `GEMINI_MODEL`, key from `GEMINI_API_KEY` (free from Google AI Studio).
  Backup provider: Groq free tier (OpenAI-compatible API), env vars `GROQ_API_KEY`,
  `GROQ_MODEL`. If Gemini returns 429, automatically try Groq.
  Put this logic in `lib/ai.ts` so every module uses it.
- **Book cover photo:** Gemini Flash (reads images) on the free tier.
- **Text-to-speech (human-like):** Kokoro TTS in the browser with `kokoro-js`
  (WebGPU, WASM fallback). Use the timestamped Kokoro model (see HeadTTS on GitHub) if it
  works, so we can highlight each word. Fallback: browser `speechSynthesis`.
- **Speech-to-text:** browser Web Speech API (SpeechRecognition) in Chrome/Edge.
  If not supported, show a friendly message and allow typing instead.
- **Database + login:** Supabase free tier. **Hosting:** Vercel free (Hobby).
- **Book data:** Gutendex (Project Gutenberg) and Open Library APIs.
- **UI packages (all free/open source):** shadcn/ui, Tailwind CSS, Framer Motion,
  lucide-react (icons), sonner (toasts), vaul (bottom sheets), embla-carousel (shelves),
  recharts (charts), canvas-confetti (celebrations), next-themes (themes).

### Free-tier rules
- Cache every reusable AI answer (word meanings, summaries, questions) in the database.
- Cache Kokoro audio in the browser (IndexedDB), not in Supabase.
- Load the Kokoro model only on first Listen, with a "Downloading voice (first time
  only)" progress bar, then keep it cached.
- Simple rate limit + friendly message "Daily free AI limit reached, try again later"
  when both providers return 429.
- Free Gemini may use data to improve Google products: never send passwords or private
  personal data to the AI.
- Update `.env.example` and remove all OpenAI env vars and code.

---

## 1. GOAL

Redesign the whole TaleTalk UI to look modern, calm, warm, and premium — like a cozy
library inside a modern app. Keep ALL existing modules and features working exactly the
same. Upgrade the Reader into a beautiful "read + listen" experience with a natural
human-like voice, based on my interests.

---

## STEP 1 — Research (no code yet)
- Web search the UI of: Kindle, Apple Books, Speechify, Readwise Reader, Duolingo,
  ELSA Speak, Headway, Blinkist, Spotify (player), Headspace (calm feel).
- Search current UI/UX best practices for reading apps, audio players, and
  language-learning apps. Check latest docs for Gemini free tier, Groq free tier,
  kokoro-js.
- Give me a short summary in simple English: 10 design ideas we should use, and why.
- Show the final design system (Section 3 below) with any improvements you suggest.
- Wait for my "OK".

## STEP 2 — Switch to the free stack
- Replace OpenAI with Gemini + Groq in `lib/ai.ts`, OpenAI TTS with Kokoro, OpenAI
  speech-to-text with the Web Speech API.
- Test every AI feature still works. Wait for my "OK".

---

## STEP 3 — Design system (build this first, then use it everywhere)

### 3.1 Feel
- Calm, warm, friendly, not childish. Lots of white space. One main action per screen.
- Rule: every screen must answer "What should I do now?" with one clear big button.

### 3.2 Colors (CSS variables / design tokens in one file)
- Primary: deep indigo (around `#4F46E5`) — buttons, active tab, links.
- Accent: warm amber (around `#F59E0B`) — streaks, rewards, highlights.
- Success green, warning amber, error red — soft versions for backgrounds.
- Level colors for badges: A1 green, A2 teal, B1 blue, B2 purple, C1 rose.
- App background: very light warm gray (around `#F8F7F4`), cards white.
- Dark mode: background around `#0F1115`, cards around `#171A21`, soft text (not pure white).
- Reading themes:
  - Light: paper `#FBFAF7`, text `#1F2328`
  - Sepia: paper `#F4ECD8`, text `#5B4636`
  - Dark: paper `#121212`, text `#E6E1D6`
- Use gradients only in the Today hero card and the full-screen player.
- All text must pass WCAG AA contrast.

### 3.3 Typography (free Google Fonts via `next/font`)
- UI font: Inter or Plus Jakarta Sans (choose the better one in Step 1).
- Reading font: Literata (option in Reader settings: Literata, Lora, Merriweather,
  OpenDyslexic-style readable option, and the UI font).
- Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 px. Reading text default 19px, line height 1.7.

### 3.4 Shape, spacing, depth
- 4px / 8px spacing grid.
- Radius: 12px (buttons, inputs), 20px (cards), 28px (hero, sheets).
- Soft shadows (low opacity, large blur). Cards lift a little on hover (desktop).
- Icons: lucide-react only, same stroke width everywhere.

### 3.5 Motion
- Framer Motion: page fade + small slide (200ms), cards appear with a small stagger,
  buttons scale to 0.97 on press.
- Bottom sheets slide up (vaul). Progress rings animate on load.
- Confetti only for big wins (finish a book, 7-day streak, level up).
- Short vibration on mobile for key actions (`navigator.vibrate`), if supported.
- Respect `prefers-reduced-motion`: turn off animations.

### 3.6 Shared components (build once, reuse)
- `BookCover` — real cover image with a soft shadow and thin "spine" edge; if no image,
  generate a nice colored cover with title + author.
- `ProgressRing`, `LevelBadge`, `StreakFlame`, `Chip`, `StatCard`.
- `Shelf` — horizontal scroll row with snap (embla), "See all" link.
- `BottomSheet` (mobile) / `Dialog` (desktop) — same content, responsive.
- `EmptyState` — simple illustration, one line of text, one button.
- `Skeleton` loaders for every list and card.
- `DiffText` — shows my wrong words in red strikethrough and correct words in green.
- `MicButton` — big round button with a pulsing ring while listening.
- `MiniPlayer` / `FullPlayer`.
- Global search (Ctrl+K on laptop, search icon on phone) to find books, words, phrases.

### 3.7 Layout & navigation
- Phone: bottom tab bar with 5 tabs — Today, Library, Reader, Talk, More
  (More = Practice, Speak, Interview, Progress, Settings). Active tab = filled icon +
  label. Mini player sits just above the tab bar.
- Laptop: left sidebar (collapsible to icons), content max width ~1200px, centered.
- Tablet landscape: Reader can show two pages side by side.

---

## STEP 4 — Page-by-page redesign (keep every feature)

### Today
- Hero card: greeting by time of day (Good morning / afternoon / evening), date,
  streak flame, level badge, and two goal rings (Reading, Talking).
- "Continue" card first if I have a book in progress: big cover, chapter, % done,
  big "Continue listening" button.
- Mood picker chips: Relax / Learn / Challenge.
- Today's story card with "Why today" reason.
- Word of the day as a flip card (front: word + listen, back: meaning + example).
- "Fix yesterday's mistakes" as a 5-card swipe quiz.
- Today's talk topic card with one "Start talking" button.
- Small weekly streak calendar (7 dots).
- Show "Find your level" card only until the test is done.

### Library
- Sticky search bar + filter chips (Level, Length, Genre, Source).
- Shelves: For you, Continue listening, Short stories (5 min), Classics at your level,
  Because you liked ..., My uploads, AI stories.
- Grid view toggle with covers.
- Floating "+" button opening a sheet with 4 choices:
  Search free books / Upload file / Photo of a book / Create AI story.
- Upload: drag-and-drop zone with progress per file.
- Photo search: camera view with a frame guide, then result cards to pick from.

### Book detail page (new)
- Big cover, background tinted with the cover's main color.
- Title, author, level badge, reading time, listening time, genre chips.
- Short description, chapter list, buttons: Read, Listen, Add to shelf.

### Reader
- See Step 6.

### Talk
- Chat bubbles (mine right, AI left), AI avatar with a friendly name ("Alex").
- Under my message: small collapsible "Better way to say" card using `DiffText`
  and a one-line reason.
- Big `MicButton` at the bottom, live transcript while speaking, typing indicator
  while AI replies.
- Suggested reply chips to help me continue the conversation.
- Topic and role-play picker as cards at the start.
- End-of-chat summary card: top 3 mistakes, 5 new phrases, "Save all".

### Practice
- Grid of tool cards (Grammar, Word helper, Situation phrases, Writing) with icons
  and one-line descriptions.
- Grammar results with `DiffText`, score ring, and a mistakes list.
- Phrases shown as cards with a listen button and a favorite heart.

### Speak
- One sentence in big text in the center, `MicButton` below.
- After speaking: each word colored (green = correct, red = missed), a score ring,
  listen-normal and listen-slow buttons, "Try again" and "Next".

### Interview
- Interviewer card with question number stepper (e.g. 3 of 10) and optional timer.
- Answer by voice or text; feedback in 4 small sections: Content, Grammar,
  Confident words, Better answer.
- End report card with strengths and 3 things to improve.

### Progress
- Stat cards: minutes read, minutes talked, books finished, words learned.
- Activity heatmap (like GitHub) and a weekly chart (recharts).
- Badges/achievements grid (First book, 7-day streak, 100 words, etc.).
- Flashcards: swipe cards with flip animation (right = I know it, left = again).
- Mistakes notebook grouped by type with "Practice these" button.

### Settings
- Grouped list like phone settings: Profile & level, Interests, Daily goals,
  Reading (font, size, theme), Voice (pick + preview Kokoro voices, speed),
  Hindi help, Data & privacy, About.

### PWA
- App icon, splash screen, theme color, works offline for downloaded books and
  cached audio.

---

## STEP 5 — Interest-based experience
- "Your interests" onboarding (3 short screens with big chips): genres (mystery,
  adventure, romance, motivation, science, tech, fantasy, real life), favorite story
  length, why I learn English (interview, office, friends, travel).
- Use interests + level + mood for the Today recommendation and Library shelves,
  and always show the reason.

---

## STEP 6 — New Reader (most important)

### Reading
- Full-screen, distraction-free. Tap the center to show/hide controls.
- Scroll mode and Page-turn mode (swipe on phone, arrow keys on laptop).
- Controls sheet: font, size, line spacing, margin, theme (light/sepia/dark).
- Chapter drawer, thin progress bar at top, "X min left in chapter".
- Tap a word: small popup with meaning, listen, example, save.
- Select a sentence: Explain, Translate to Hindi, Grammar.
- Saved words are underlined softly in the text.

### Listening (human-like, free)
- Kokoro voices in the browser. Choose and preview voices in Settings
  (American and British, male and female).
- Default voice by genre (calm for classics, lively for adventure, soft for fairy
  tales). Optional different voice for dialogue in quotes.
- Word highlight if timestamps work; otherwise sentence highlight (soft amber
  background). Auto-scroll keeps the current sentence in the middle of the screen.
- Generate audio sentence by sentence; prepare the next 2 sentences ahead.
- Mini player above the tab bar on every page: cover, title, play/pause, progress line.
- Full player: blurred cover background, big cover, chapter title, progress bar with
  time, play/pause, back/forward sentence, back/forward 10s, speed 0.5x–1.5x,
  sleep timer (10/20/30 min, end of chapter), voice picker.
- Lock screen and headphone controls with the Media Session API.

### Listening modes (segmented switch in the player)
1. Audiobook – just listen, big cover, minimal text.
2. Read-along – read + listen with highlight (default).
3. Learn – pause after each sentence: Repeat, Slow, Explain, Next.
4. Shadow – play a sentence, I repeat it, speech-to-text checks me.
5. Quick summary – a 2-minute simple summary of the chapter first.

### After each chapter
- Celebration card, short summary, 3 questions, "Tell it in your own words"
  (type or speak), new words added to flashcards.
- "Talk to a character" role-play in Talk (public-domain books, uploads, AI stories only).

---

## STEP 7 — Quality checks
- Install Playwright (free) as a dev tool. Take screenshots of every page at 375px
  (phone) and 1440px (laptop), in light and dark mode. Look at them yourself and fix
  anything that looks broken, crowded, or misaligned.
- Lighthouse score 90+ for Performance and Accessibility. Use `next/image` and lazy
  load covers.
- Run `npm run build` and fix all errors and warnings.
- Check all old features: login, library search, uploads, cover photo search,
  Talk corrections, Practice, Speak, Interview, Progress.

---

## RULES
- Small steps. After each step, explain in simple English what changed and what to
  test, then wait for my "OK".
- Do not delete data or tables. New tables/columns go in a new migration file.
- Keep the copyright rules from CLAUDE.md.
- Update CLAUDE.md (free stack, design system, Reader plan) and PROGRESS.md after each step.
