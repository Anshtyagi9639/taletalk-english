# TaleTalk — Progress

## ✅ Step 1 — Plan review (done)
Problems and fixes are saved in CLAUDE.md, section 8.

## ✅ Phase 1 — Setup (done, tested: login works)
- Next.js 16.4 + TypeScript + Tailwind CSS 4 + shadcn/ui (base-nova style).
- Login with Supabase (email + password).
- "Create an account" option on the login page (sign-up), plus `/auth/confirm`
  for the confirmation email link.
- `proxy.ts` protects every page: if you are logged out, it sends you to `/login`.
- Menu: sidebar on laptop, bottom tabs on phone (Today, Library, Talk, Practice, More).
  The "More" page has Reader, Speak, Interview, Progress, Settings.
- Today page (sample layout) and "coming soon" pages for all other menu items.
- Friendly error page. Log out button (sidebar, More page, Settings).
- `.env.example` (`.env.local` is ignored by git).
- `supabase/migrations/0001_profiles.sql` (profiles table + Row Level Security).
- `npm run build` and `npm run lint` pass with no errors.

- Fixed: `Date.now()` prerender error (`await connection()` before `getClaims()`).

### Known notes
- Node.js 20 works, but Supabase warns that it is old. Please install Node.js 24 LTS.

## ✅ Phase 2 — Library (built, waiting for your test)
- `supabase/migrations/0002_library.sql`: `books`, `chapters` (full-text search index,
  cached summary/questions columns), `reading_progress`. RLS on all; chapters check the
  owner through `books`.
- Search free classics (`/library/add`): Gutendex + Gutenberg's fast OPDS search as backup
  (Gutendex is often slow), plus Open Library book info (info + link only).
- "Add to Library": server checks the book is **public domain** on gutenberg.org, downloads
  the text, removes the licence header/footer, splits it into chapters, measures the level.
- Chapter splitter (`lib/books/split.ts`): headings or the Contents list; long chapters cut
  into ~5,000-word parts. Tested on all 9 starter books.
- 9 starter books (A2 → C1) with one "Add all" button.
- Library page: tabs (All / Reading now / Want to read / Finished), filters (level, length,
  genre, source), search by title, author, or a word in the text.
- Book page (`/library/[id]`): cover, level, summary, chapter list, reading status, remove.

## ✅ AI setup (shared by all AI phases)
- `lib/ai.ts`: `chat()`, `checkGrammar()`, `transcribe()`, `speak()`, `readImage()`, `aiAction()`.
  Every call: login check → rate limit (20/min, 600/day) → OpenAI → usage + cost saved in `ai_usage`.
  Friendly errors (wrong key, no credit, model not found, busy).
- `lib/prompts.ts`: all system prompts (simple English + optional Hindi help).
- SDK: `openai@7.45.1` (pinned exact version).
- Models checked on OpenAI's pages (Nov 2026), set in `.env.local`:
  - `OPENAI_MODEL=gpt-6-luna` (cheapest, reads images, JSON output)
  - `OPENAI_STT_MODEL=gpt-transcribe`
  - `OPENAI_TTS_MODEL=gpt-4o-mini-tts` ⚠️ deprecated, shuts down 6 Jan 2027 → decide in Phase 4.

## ✅ Phase 3 — Reader (built, waiting for your test)
- `supabase/migrations/0003_ai_words_reading.sql`: `ai_usage`, `saved_words`, `practice_log`,
  `save_reading_progress()` function.
- `/reader/[bookId]/[chapter]`: reading view, text size, light/sepia/dark, line spacing
  (saved on this device), chapter picker, previous/next.
- Saves the paragraph where I stopped + % of the book; counts active reading minutes
  (also into `practice_log` for the streak); last chapter end → "Finished".
- Tap a word → AI meaning in this sentence, sound guide, example, tip, Hindi (if on),
  free browser "Listen", "Save word" (first review tomorrow).
- Select text → Explain simply / Hindi / Grammar.
- `/reader`: Continue reading list. Book page: Start/Continue button, chapters are links.
- Later: chapter summary + 3 questions + "tell the story" (with Phase 7), Simplify mode.

## ✅ Phase 4 — Listen (built, waiting for your test)
- `supabase/migrations/0004_audio.sql`: `audio_cache` table + private Storage bucket `audio`
  (policies: each user only their own folder; mp3 only, max 5 MB).
- "Listen" in the Reader: reads sentence by sentence and highlights the sentence; the page follows.
  Play/pause, previous/next sentence, speed 0.75x / 1x / 1.25x, stop. Goes on to the next chapter.
- Voices: **Free voice** (browser, default) or **AI voice** (OpenAI: Marin, Cedar, Coral, Sage, Ash).
  Choice + speed saved in `profiles`.
- AI voice: `/api/tts` reads the sentence from MY chapter on the server, makes the mp3 once,
  saves it in Storage + `audio_cache`; next time it is free. The next 2 sentences load early.
- If the AI voice fails (no key, no credit, model shut down), it switches to the free voice.
- Removing a book also deletes its audio files.
- `lib/text/sentences.ts`: one sentence splitter for browser + server (tested: 36,026 sentences
  in the 9 starter books rebuild every paragraph exactly).
- AI rate limit raised to 40/min, 1500/day (cached sentences do not count).
- ⚠️ `gpt-4o-mini-tts` shuts down 6 Jan 2027. After that the free voice still works;
  only `speak()` in `lib/ai.ts` needs a new model.

## ✅ Phase 5 — Uploads (built, waiting for your test)
- `supabase/migrations/0005_book_uploads.sql`: private Storage bucket `books` (50 MB, PDF/EPUB/DOCX/TXT),
  each user only their own folder.
- `/library/add` → "Upload my own books": drag & drop or choose, many files, progress bar per file.
  The browser uploads straight to Storage (Vercel's 4.5 MB limit), then `processUpload` reads it.
- Parsers in `lib/books/parse/` (tested on real and generated files, also inside a production build):
  - PDF (`unpdf@1.9.1`): lines from positions, paragraphs from gaps/indents, big text = chapter titles,
    page numbers + repeating headers removed. Scanned PDF → clear message. Password → clear message.
  - EPUB (`jszip@3.10.2`): reading order + table of contents for chapter names; DRM → clear message;
    Gutenberg licence pages skipped.
  - DOCX (`mammoth@1.13.0`): Word headings → chapters; title/author from file properties.
  - TXT: UTF-8 / UTF-16 / Windows text; Gutenberg files cleaned.
- Unreadable file → deleted from Storage again. Removing a book deletes its file.
- ⚠️ PDF reading needs **Node.js 22+** (`engines` set in package.json; Vercel is fine).

## ✅ Phase 6 — Book cover photo (built, waiting for your test)
- `supabase/migrations/0006_book_info.sql`: `books.external_url`, `published_year`, `level_reason`.
- `/library/add` → "Take a photo of a book": camera (`capture="environment"`) or gallery.
  The browser shrinks the photo (≤1280 px JPEG, < 1 MB); server action limit set to 2 MB.
- `readBookPhoto`: vision model reads title/author as JSON ("not a book" / unclear photo → friendly tip).
  Title and author can be edited → "Search again".
- `findBookMatches`: Gutenberg + Open Library at the same time, ranked by `lib/books/match.ts`
  (tested: The Hobbit / Atomic Habits → info only; Pride and Prejudice → free book first).
- Public domain → normal "Add to Library" (full text).
- Under copyright → `addInfoOnlyBook`: Open Library details + AI summary in its own words (prompt
  forbids copying or recreating the text; Open Library "excerpts" are never sent), level + reason, genre.
  Book page shows "still under copyright", legal links (Open Library, Google Books, Kindle) and
  "Upload my copy". Library card shows "Info only".

## ✅ Phase 7 — AI stories + level quiz + Today (built, waiting for your test)
- `supabase/migrations/0007_stories_today.sql`: `mistakes` notebook, `daily_plan`, `chapters.key_words`.
- `/library/create`: "Create a story for me" — level A1–C1, 8 topics, 2/5/10 min → original story +
  5 key words + 3 questions (saved as an "AI story" book, opens in the Reader).
- Reader, end of every chapter: "Check my understanding" → summary + key words + 3 questions
  (made once, cached on the chapter) + "Tell the story in your own words" → score, feedback,
  corrections; mistakes saved to the notebook.
- `/placement`: 20-question level test (answers only on the server) or "I know my level", + interests.
  Rule: highest level with ≥3/4 right AND ≥75% right up to it (tested with 7 answer patterns).
- Today page (`/`): level-test card (until done), streak + reading/talking goal bars,
  today's story + backup + "Why today" (scored by level, interests, length, AI story, not in the last 7 days;
  saved in `daily_plan`), continue reading, word of the day (my due saved word first), talk topic
  of the day (→ Talk), "Fix yesterday's mistakes" (which sentence is correct?).
- Time zone cookie (`tz`) so "today" and the streak follow MY day.
- Not yet: level changes by itself over time (later: from quiz scores), "words I keep getting wrong" in the story pick.

## ✅ Phase 8 — Talk (built, waiting for your test)
- `supabase/migrations/0008_talk.sql`: `conversations` (messages as JSON) + `saved_phrases`.
- `/talk`: today's topic (from Today or `?topic=`), 7 topics, 6 role-plays (new friend, ordering food,
  customer care, manager, asking for help, office small talk), recent chats.
- `/talk/[id]`: chat with Alex at my level. ONE AI call per message returns JSON: Alex's reply +
  correction of MY last message → "Better way to say it" box (better sentence, wrong → right,
  type, reason) or "Great English!". Mistakes go to the notebook at once.
- Voice: mic button → `/api/transcribe` (`gpt-transcribe`, no hint of the "right" words; max 90 s)
  → sent as a spoken message (punctuation not judged). Alex's replies read aloud (free voice, or AI
  voice via `/api/talk-tts`, which reads the text from my saved chat; falls back to the free voice).
- "End chat" → summary, top 3 mistakes, 5 useful phrases (saved to `saved_phrases`).
- Talk minutes → `practice_log` (Today's talking goal + streak).
- `components/voice/use-recorder.ts`: reusable recorder (for Phase 10 Speak).

## ✅ Phase 9 — Practice tools (built, waiting for your test)
- No new SQL (uses `mistakes`, `saved_phrases`, `practice_log`).
- `/practice` → 4 tools:
  - `/practice/grammar`: corrected text, mistakes (wrong → right — type · reason), score /10; mistakes saved.
  - `/practice/words`: "Explain a word" (meaning, office/friends/interview examples, common mistakes,
    formal vs casual, synonyms, Hindi if on) and "Which is correct?" (A / B / both / neither + why + examples + tip).
  - `/practice/phrases`: 12 situations or my own + tone (formal/polite/friendly/confident) → 8–10 phrases
    with "when", "Don't say → Say instead"; save favourites; "My saved phrases" (also from Talk) with delete.
  - `/practice/writing`: free writing (topic ideas) corrected paragraph by paragraph + score + tip;
    "Write a story": AI starts → I write → AI corrects my part, praises, continues.
- Practice minutes → `practice_log` ('practice'). Shared `useActiveMinutes()` hook (Talk uses it too).

## ✅ Phase 10 — Speak (built, waiting for your test)
- No new SQL. `/speak`:
  - Sentences: **My story** (book I'm reading, from where I stopped, 5–25-word sentences),
    **Everyday** (8 per level), **Tricky sounds** (v/w, th, z/s, vowels, silent letters, stress, -ed),
    **My sentence**.
  - **Read aloud**: record → `/api/transcribe` (no hint) → `lib/speak/compare.ts` lines up the words
    (normalises "I'm"/"I am", "2"/"two", "let's"/"lets") → right / almost / wrong / missed + score + "we heard".
    Tested on 9 examples (e.g. "wery vell" → almost, "this" → "the" → wrong).
  - **Listen** normal / slow (free voice, or AI voice: story sentences use the cached `/api/tts`,
    others the new `/api/speak` (≤ 300 chars); falls back to the free voice).
  - **How to say these words**: AI sound guide (KUMF-ter-bul) + one mouth tip per hard word.
  - **Shadowing**: plays the sentence, then records by itself (time based on length), result, Next.
  - Note on the page: practice feedback, not an exact accent score. Minutes → `practice_log` ('speak').

## ✅ Phase 11 — Interview (built, waiting for your test)
- `supabase/migrations/0009_interview.sql`: `interview_sessions` (questions, turns, report) + `answer_bank`.
- `/interview`: my interview profile (role, experience, tech topics → `profiles`), 3 modes
  (HR 6 q, Technical 6 q from role/topics, Full mock 8 q intro → closing), recent interviews.
- `/interview/[id]`: one question at a time (read aloud), hint, answer by text or voice
  (`/api/transcribe`, sent as spoken); feedback per answer: content score + comment, grammar
  (wrong → right, saved to notebook), confidence (weak phrases → stronger), better sample answer.
  Mock mode hides feedback until the report (can peek). Skip / next / end → report
  (score, overall, strengths, 3 things to improve).
- `/interview/bank`: Answer Bank — first answer + editable best answer + coach note, listen,
  delete, "practice mode" hides answers. Minutes → `practice_log` ('interview').

## ✅ Phase 12 — Progress, Settings, PWA, deploy steps (built, waiting for your test)
- No new SQL.
- `/progress`: streak, total practice, books finished, words saved; 30-day stacked bar chart
  (reading / talking / practice / speaking / interview); time by activity; links.
- `/progress/words`: flashcards for due words (show → "I knew it" / "Again"), spaced repetition
  1 → 3 → 7 → 14 → 30 days (`lib/srs.ts`); list of all words with next review + delete.
- `/progress/mistakes`: notebook grouped by type (filter chips), source + date, delete,
  "Practise my mistakes" (10 least-practised).
- `/settings`: level, interests, daily goal, Hindi help, voice (free / AI) + speed → `profiles`;
  AI usage this month (requests, approximate $, by area); retake level test; interview profile; log out.
- PWA: `app/manifest.ts` (name, colors, icons incl. maskable, shortcuts), `public/icon-*.png`,
  `apple-touch-icon.png`, `app/icon.png`; iPhone web-app meta; the login guard lets the manifest through.
- Cleanup: removed the unused "coming soon" component and starter SVGs.
- README: setup, env vars, SQL order, Supabase login settings, Vercel deploy steps, costs.

## ✅ Fixes + new look (after your test)
- Cause of "Today / Library / Reader do not work": only `0001` was run in Supabase → tables missing.
  New `supabase/setup_all.sql` = 0002–0009 in ONE file. A yellow notice shows on every page until it is run.
- Fixed "Date.now() while prerendering" on all pages: `createClient()` now waits for the request
  (`await connection()`). Tested logged in (temporary test user, deleted after).
- Model names filled in `.env.local` and `.env.example`: `gpt-6-luna`, `gpt-4o-mini-tts`, `gpt-transcribe`.
- New UI: soft blue-grey theme with white cards, automatic dark mode (follows the device), wider
  dashboards on laptops (Today, Library, Progress, Practice/Talk/Interview home) and narrow focused
  pages (reading, chat, forms); grouped sidebar; new Today page (greeting, streak, goal rings,
  big "Today's story", side column with word / talk topic / quick practice); Library search +
  filters in one bar and up to 5 book columns.

## ✅ AI check + more UI (latest)
- Settings → **AI check** ("Test my AI setup"): tests the key + chat, JSON answers, images, AI voice,
  speech-to-text with tiny requests, using the same code as the real features. Shows ✓/✗ + reason.
- Clearer AI errors: wrong/deleted key (how to make a new one), no credit, model not found (names the model),
  no model access.
- Speech-to-text: sends `languages: ["en"]` to gpt-transcribe (`language` to older models) and retries
  without it if a model refuses. AI voice no longer sends `speed` (speed is set while playing).
- UI: new login page (brand panel on laptop), page headers with coloured icon tiles, phone tab bar
  with an active "pill", Practice home with coloured tool cards, book covers lift on hover.
- End-to-end test (temporary test user, deleted after): 46/46 pass — data saving, RLS (another user
  sees nothing), all 25 pages, book search API, friendly AI-voice error, logged-out redirect.
- ⚠️ Still needed: a NEW OpenAI key (the current one is rejected by OpenAI: invalid_api_key).

## ✅ Translate & Learn + full AI test (latest)
- New Practice tool `/practice/translate` (first card on Practice): **English → हिंदी** (my English
  corrected + Hindi to check the meaning) and **हिंदी → English** (Devanagari or Roman Hindi; optional
  "my English try" is checked). Shows: both sides with Listen (English + Hindi browser voice), mistakes
  with the reason in English AND Hindi, "For this sentence we say" formula + Hindi explanation,
  word map, other ways to say it, the common Hindi-speaker trap. Mistakes go to the notebook.
- `.env.local`: `OPENAI_MODEL` line was missing → added back. New OpenAI key works.
- Fixes: a new key in `.env.local` now makes a new OpenAI client (the old one was cached);
  copy-paste problems in the key are explained; speech-to-text file name now matches the real
  audio format (mp3/m4a were refused as "corrupted").
- **AI end-to-end test: 21/21 pass** (real server actions, temporary user deleted after):
  AI check (5/5), Translate both ways, Grammar, Word helper, Which is correct, Phrases, Writing,
  Story together, Reader (word, explain, Hindi, chapter check + cache, retelling), AI story,
  Talk (start → correction → summary), Interview (start → feedback → report), Speak tips,
  book cover photo → matches, AI voice → speech-to-text. 29 AI calls ≈ $0.005.

## 🔄 UI POLISH PASS (replaces REDESIGN Steps 5–7)
Priorities agreed: 1 shared-element motion, 3 Now Playing + mini player, 4 word highlight,
5 first-run flow, 7 calm Today (bento) — plus 2 "where am I", 6 kind streaks, 10 saved highlights.
UI/UX only, no new backend features. Lighthouse / Core Web Vitals measured on the production build.

### ✅ Step 1 — Research (OK given)
ADA 2025/2026, Liquid Glass + Material 3 Expressive, Duolingo/Speechify/Readwise/Kindle; trends to use/avoid.

### ✅ Step 2 — Honest design audit (done; waiting for your "OK")
How: production build, 27 pages × 375/820/1180/1440 px × light/dark (216 screenshots), axe-core 4.14
(WCAG 2.2 AA), tap-target/primary-button/card counts, Lighthouse 12 mobile, 4× CPU + Slow 4G test.
- Average page score 6.5/10 (lowest: Player 5.3, Today 5.8, Reader 5.9, Settings 5.9).
- Speed is the weakest point: Lighthouse Performance 36–72 (Today 36–40, blocking time 8–16 s
  on a slow phone); every page blocks ≥ 1.5 s. Accessibility 100 in Lighthouse, but axe found:
  nested button (word card, flashcard), aria-label on a div, unnamed search button (Add books),
  low contrast under the glass tab bar and on drawn covers, no h1 on Login; 20 px delete buttons.
- Bugs found: Reader stays bright paper in dark mode; heatmap on phone opens at the oldest weeks;
  "Interviewer · Hr"; stat labels cut ("Minutes re…"); cover tint not taken from Gutenberg covers;
  "Find your level" card shows even when a level is set; shelves repeat the same books.

### ✅ Step 3 — Fix plan + 2 directions (done; waiting for your choice)
Preview pages with demo data (not linked in the menu): `/design/today-a|b`, `/design/library-a|b`,
`/design/reader-a|b`, `/design/player-a|b` (`components/design/directions/`). A = "Calm focus",
B = "Warm & playful". The chosen one becomes the real page in Step 4; the previews are then removed.

## ✅ REDESIGN Step 4 — Page-by-page redesign (done; waiting for your "OK")
Every feature kept; every page now uses the Step 3 design system.
- **Today**: hero (greeting by time, date, streak, level, 2 goal rings, 7-day streak dots); "Continue" card
  first (big cover, chapter, % done, **Continue listening** → opens the chapter and starts the voice at the
  saved place via `?listen=1`); story card with **mood chips Relax / Learn / Challenge** (`getMoodPicks`);
  **flip card** word of the day; **5-card mistakes quiz** (cards slide away, confetti on 5/5); talk topic card
  with one "Start talking" button; "Find your level" only until the test is done.
- **Library**: sticky search + filter chips (level, length, source, genre); **shelves** (Continue, For you,
  Short stories, Classics at your level, Because you liked …, My uploads, AI stories) or **grid** (remembered
  per device); floating **+ Add** button → sheet with the 4 ways to add; **live camera with a book frame**
  for the photo search (falls back to the phone camera app); upload already had drag & drop + progress per file.
- **Book page (new look)**: background tinted with the cover color, big cover, level badge, reading AND
  listening time, genre chips, **Read / Listen / Add to shelf** (shelf sheet, confetti when finished),
  chapter list with "You are here", **Save for offline**.
- **Talk**: Alex avatar, bubbles (Alex left, me right), typing dots, collapsible **"Better way to say it"**
  with `DiffText` + one-line reason, **reply idea chips** (AI now also returns 3 `suggestions` per message —
  stored in the `messages` JSON, no new column), big `MicButton` with live words, summary card ("All saved ✓").
- **Practice**: tool cards; Grammar shows your text with red/green word changes + a score ring;
  Situation phrases as cards with listen + ❤️ favourite.
- **Speak**: big centered sentence (reading font), `MicButton`, words colored after a try
  (green right / amber almost / red wrong or missed), score ring, Listen + Slow, Try again / Next.
- **Interview**: question stepper (progress bar + numbers), interviewer card, optional **timer**, voice or text,
  feedback in 4 small sections (Content, Grammar, Confident words, Better answer), report card with score ring.
- **Progress**: stat cards (minutes read, minutes talked, books finished, words learned), **activity heatmap**
  (18 weeks), 30-day chart, **badges** (10 achievements), **swipe flashcards** (flip; right = I knew it,
  left = again), mistakes notebook with "Practice these".
- **Settings**: grouped like phone settings — Profile & level, Interests, Daily goal, **Reading** (colors, font,
  size, spacing — new **reading font** option: Literata / Lora / Merriweather / Easy to read / App font,
  also in the Reader), Voice, Hindi help (switch), Data & privacy (AI usage + AI check), About, Account.
- **PWA**: icon, theme color and splash (from the manifest; Android draws the splash from it). **Offline**:
  `public/sw.js` (registered only in production) keeps app files and the pages you open; chapters you read or
  saved with "Save for offline" open without internet; `/offline` page otherwise; log out clears saved pages.
  Voice audio was already cached on the device (IndexedDB).
- All hard-coded greens/ambers/reds replaced with design tokens; old boxes use the new card style.
- **Extra polish (after web research on 2026 app UI + Apple iPad sidebar guidance):**
  original SVG **illustrations** (`components/ui/illustrations.tsx`: reading book, chat, mic, shelf, trophy)
  in the Today hero, page headers (Library, Speak, Progress) and empty states; **Alex has a face** (AlexFace);
  phone tab bar is now a **floating glass bar**; **tablet (iPad) layout**: icons-only side menu at tablet
  width, full menu on large screens (Apple HIG sidebar pattern); Reader bars float above the tab bar.
- **Tested:** app 48/48, AI 21/21 (Talk returns reply ideas), build OK, screenshots at phone 375/390,
  iPad 820×1180 and 1180×820, laptop 1440 — light + dark, no sideways scroll, no console errors.
- Not done on purpose: **recharts** (the existing HTML chart + heatmap need no extra package);
  **iPhone splash images** (iOS needs ~10 image sizes; the app opens with the warm background color instead).

## ✅ REDESIGN Step 3 — Design system (done; OK given)
- **Tokens** (`app/globals.css`): deep indigo primary, warm amber for streaks/rewards, soft success/warning/error,
  level colors (A1 green → C1 rose), warm page #F8F7F4 + white cards, dark #0F1115 / cards #171A21 with soft text,
  reading papers (light/sepia/dark), radius 12/20/28 px, soft shadows, type 12/14/16/18/22/28/36, reading 19 px/1.7.
  **All text colors checked: WCAG AA in light and dark** (two greens were darkened to pass).
- **Fonts**: Plus Jakarta Sans (UI); Literata now used in the Reader; Lora, Merriweather, Atkinson Hyperlegible ready
  for the Reader font choice (Step 6) and downloaded only when used.
- **Motion**: page fade + small slide (200 ms), stagger lists, buttons scale to 0.97 on press, progress rings animate,
  confetti only for big wins, short vibration on phones; everything off with "reduce motion".
- **Shared components** (`components/ui/`): Sheet (bottom sheet on phone / dialog on laptop, Base UI Drawer),
  Shelf (swipe + arrows, "See all"), BookCover (spine edge + drawn cover with title and author), ProgressRing,
  LevelBadge, StreakFlame, Chip, StatCard, EmptyState, Skeletons, DiffText (my words red, right words green),
  MicButton (pulsing ring), global Search (Ctrl+K / search icon: pages, my books, saved words, saved phrases).
  MiniPlayer / FullPlayer come in Step 6 with the new Reader player.
- **Navigation**: phone tabs Today · Library · Reader · Talk · More (active = filled icon); phone top bar with logo +
  search; laptop sidebar folds to icons (remembered per browser); content max width 1200 px.
- New packages (free, MIT/ISC): motion 14.5.0, embla-carousel-react 8.6.0, canvas-confetti 1.9.4.
- Preview page: **/design**. Tested: screenshots at 375 px and 1440 px, light + dark, no sideways scroll,
  no console errors; sheet, search (type + Enter) and sidebar fold work. App test 48/48, tsc + lint clean.

## ✅ REDESIGN Step 2 — 100% free stack (done + tested; OK given)
- `lib/ai.ts` rewritten: **Gemini** (`GEMINI_MODEL=gemini-3.5-flash-lite`, REST, JSON schema via
  `responseJsonSchema`, falls back to "schema in the prompt" if refused) → **Groq** backup
  (`openai/gpt-oss-120b`, strict JSON schema) on limit/errors; images Gemini only;
  both 429 → "Daily free AI limit reached". Same functions as before, so all features keep working.
  `transcribe()` → **Groq Whisper** (`whisper-large-v3-turbo`). `speak()` removed. `pingProvider()` for the AI check.
- Voices: **Kokoro** in the browser (`kokoro-js@1.2.1`, Apache-2.0) in a Web Worker
  (`lib/tts/kokoro.worker.ts`, `lib/tts/engine.ts`): WebGPU (fp32) or WASM (q8, ~92 MB); download
  progress "first time only"; every sentence cached in **IndexedDB** (`lib/tts/audio-cache.ts`).
  6 voices (US/UK, female/male) in `lib/voices.ts`. Reader Listen, Speak, Interview and Talk use it;
  browser voice is the fallback. **Tested in headless Chrome (Playwright):** 92 MB download, voice
  played, no errors, cached replay 0.27 s.
- Talk: **live speech** with the browser Web Speech API (words appear while speaking);
  Firefox etc. → recording + Groq Whisper. Speak/Interview: recording + Groq Whisper.
- Removed: `openai` package, `/api/tts`, `/api/talk-tts`, `/api/speak`, all OPENAI_* env vars
  (`.env.local` + `.env.example`; the real OpenAI key is gone from `.env.example`).
  The `audio_cache` table/bucket stay (no data deleted).
- Settings: AI check = Gemini, Groq, JSON, image, speech-to-text; voice picker + Preview;
  "AI usage (free)" shows requests today vs the app limit. README + CLAUDE.md updated.
- Dev tool: `playwright@1.64.1` (+ headless Chromium) for browser tests.
- Fix: Google's new key format `AQ.…` is accepted (old `AIza…` too). A broken Gemini key now falls back to Groq.
- **Tested with real keys:** all 21 AI features pass (AI check 5/5, Translate, Grammar, Word helper,
  Phrases, Writing, Story, Reader word/explain/chapter/retell, AI story, Talk, Interview, Speak,
  cover photo, Groq Whisper heard "I would like a cup of tea, please."); 29 calls logged, cost $0.
  Non-AI test 48/48. tsc + lint clean.

## 🔄 REDESIGN (see REDESIGN.md) — Step 1: research done
Key findings (Nov 2026, from public sources; check the AI Studio / Groq console for exact numbers):
- Gemini free tier is much smaller now: Flash ≈ 20 requests/day, Flash-Lite ≈ 500/day (per project).
  → Plan: Flash-Lite for all text + images. Groq free (gpt-oss-120b, ≈ 1,000/day, strict JSON schema) as backup.
- Gemini's OpenAI-compatible layer has reported JSON-schema problems → use Gemini's own API for JSON answers.
- kokoro-js has no word timestamps; HeadTTS (Kokoro + timestamps, in-browser) does. Voice download
  ≈ 85 MB (WASM) to ≈ 300 MB (WebGPU), once, then cached.
- Web Speech API: Chrome/Edge/Safari (not Firefox); usually sends audio to a server and "fixes" words,
  which can hide pronunciation mistakes. Groq Whisper is a free alternative for Speak scoring.

## 💡 Ideas for later
- Level changes by itself (from chapter checks, Talk and interview scores).
- Daily story uses "words I keep getting wrong".
- New TTS model before `gpt-4o-mini-tts` shuts down (6 Jan 2027) — only `speak()` in `lib/ai.ts`.
- Offline reading (service worker), covers for uploaded EPUBs.
