# CLAUDE.md — "TaleTalk": Learn English with Stories, Speaking & Daily Practice

You are building a personal English-learning web app for ONE user (me).
My English is not perfect. My goals:
- Read and listen to many stories and novels every day.
- Speak English in daily friendly talk without mistakes.
- Know which word/sentence is correct for which situation.
- Prepare for job interviews and improve pronunciation.

The app must be **simple, clear, friendly, and mobile-first**.
Build step by step. After each phase, run the app, fix errors, and tell me what to test.

---

## 1. Tech Stack (do not change unless I ask)

| Part | Choice | Why |
|------|--------|-----|
| Framework | Next.js (latest, App Router) + TypeScript | Frontend + backend in one project |
| UI | Tailwind CSS + shadcn/ui | Clean, mobile friendly |
| Database + file storage | Supabase (free tier: Postgres + Storage) | Store books, progress, uploads |
| AI (100% FREE, see REDESIGN.md) | Google Gemini free tier (main) + Groq free tier (backup on 429/errors) | Chat, grammar, stories, interview |
| Image reading (book cover photo) | Gemini (Flash-Lite reads images) | Read title/author from a photo |
| Speech-to-text | Browser Web Speech API (Talk, live) + Groq Whisper free (Speak, Interview) | Check my speaking |
| Text-to-speech | Kokoro (`kokoro-js`) in the browser, cached in IndexedDB (+ browser speechSynthesis fallback) | Listen to stories |
| Book search | Gutendex API (Project Gutenberg) + Open Library API | Free public-domain books and book info |
| File parsing | `pdfjs-dist` (PDF), `epubjs` or `epub2` (EPUB), plain text (TXT), `mammoth` (DOCX) | Read uploaded books |
| Deploy | Vercel (free) | GitHub push → live link |
| Login | Supabase Auth (email + password, one user) | Private app |

### Environment variables (`.env.local`, never commit)
```
GEMINI_API_KEY=          # free: aistudio.google.com → Get API key
GEMINI_MODEL=gemini-3.5-flash-lite
GROQ_API_KEY=            # free: console.groq.com → API Keys
GROQ_MODEL=openai/gpt-oss-120b
GROQ_STT_MODEL=whisper-large-v3-turbo
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # new Supabase "publishable" key
SUPABASE_SECRET_KEY=                    # new Supabase "secret" key (server only)
```
- AI keys are used ONLY on the server. Never send them to the browser.
- 100% free: no paid API or paid package (see REDESIGN.md §0). No OpenAI.
- All model names come from env vars.
- Create `.env.example` and add `.env*.local` to `.gitignore`.

---

## 2. Menu (bottom tab bar on phone, sidebar on laptop)

1. **Today** – daily plan (home page after login)
2. **Library** – all stories and novels
3. **Reader** – read + listen
4. **Talk** – daily friendly English chat (text + voice)
5. **Practice** – grammar check, word helper, situation phrases, writing
6. **Speak** – pronunciation practice
7. **Interview** – interview prep
8. **Progress** – mistakes notebook, words learned, streak
9. **Settings**

Shared code:
- `lib/ai.ts` → `chat()`, `checkGrammar()`, `transcribe()`, `speak()`, `readImage()`
- `lib/prompts.ts` → every system prompt, easy for me to edit
- `lib/books/` → search, parse, and chunk books

**Global rule for all AI answers:** very simple English, short sentences, encouraging tone.
Settings toggle: "Also explain in Hindi".

---

## 3. Features in Detail

### 3.1 Today (home page)
After login, show:
- **Today's story** – one recommended story for my level (see 3.3).
- **Continue reading** – the book I was reading, with % done.
- **Word of the day** – meaning, example, listen button.
- **Today's talk topic** – one button to start Talk mode.
- **Fix yesterday's mistakes** – 5 quick questions from my mistakes notebook.
- Streak counter and today's goal (e.g. 15 min reading, 10 min talking).

### 3.2 Library
Four ways to add books:

**a) Search free classic books (full text)**
- Search box → Gutendex API (Project Gutenberg) by title, author, or topic.
- Show cover, title, author, level tag, "Add to Library".
- Download the plain-text version and save chapters in the database.
- Also show Open Library results for cover images and book details.

**b) Upload my own files**
- Upload PDF, EPUB, TXT, DOCX (drag & drop or file picker; multiple files at once).
- Store the file in Supabase Storage (private bucket), extract text on the server,
  split into chapters/pages, save to database.
- Show upload progress and a clear error if a file can't be read (e.g. scanned PDF with no text).

**c) Book cover photo**
- Button "Take photo of a book" (uses phone camera via `<input type="file" accept="image/*" capture>`).
- Send image to the vision model → get title + author as JSON.
- Search Gutendex + Open Library with that title/author → show matches, I pick the right one.
- If the book is **public domain** (found on Project Gutenberg) → add full text to Library.
- If the book is **still under copyright** → show book details, cover, an AI-written short
  summary (a few paragraphs, own words, no copied text), level estimate, and links to legal
  sources (Open Library borrow page, Google Books, Amazon/Kindle). Tell me I can upload my own
  purchased copy (EPUB/PDF) to read it in the app.
- The app must NEVER ask the AI to generate or "recreate" the full text of a copyrighted book.

**d) AI-written practice stories**
- "Create a story for me": choose level (A1–C1), topic (office, travel, friends, interview,
  tech, mystery, love, motivation), length (2/5/10 min).
- AI writes an original story using useful daily-life words, then adds 5 key words and
  3 comprehension questions.

Library page features:
- Grid with covers, filter by level, length, genre, source (Classic / My upload / AI story).
- Search inside my library by title, author, or word in text.
- Tabs: Reading now, Finished, Want to read.

### 3.3 Daily Story Recommendation
- Store my level (start with a 5-minute placement quiz on first login, update over time).
- Each day, pick 1 story + 1 backup using: my level, my interests, what I finished, and
  words I keep getting wrong.
- Good starter list to preload (public domain): Aesop's Fables, Grimm's Fairy Tales,
  O. Henry short stories, Sherlock Holmes stories, Alice in Wonderland, The Wonderful Wizard
  of Oz, Anne of Green Gables, Treasure Island, Pride and Prejudice (advanced).
  Tag each with a difficulty level.
- Show reason: "Why this story today" in one line.

### 3.4 Reader (read + listen)
- Clean reading view: font size, light/dark/sepia mode, line spacing.
- **Listen button**: reads the chapter aloud with TTS; highlight the current sentence while
  playing; speed 0.75x / 1x / 1.25x; pause and continue.
  - Generate audio per paragraph and cache it in Supabase Storage so I don't pay twice.
  - Offer free browser voice as a cheaper option in Settings.
- **Tap any word** → popup: meaning, pronunciation (listen), example sentence, "Save word".
- **Select a sentence** → "Explain simply", "Translate to Hindi", "Grammar of this sentence".
- **Simplify mode**: AI rewrites the current page in easier English (for public-domain text,
  my uploads, and AI stories only).
- After each chapter: short summary (AI), 3 questions, and "Tell the story in your own words"
  (I type or speak, AI corrects my answer).
- Save reading position automatically; track time spent.

### 3.5 Talk (daily friendly English chat)
- A friendly AI buddy ("Alex"). I chat by text or voice; AI replies in text + voice.
- Topics: my day, food, movies, weekend, office life, travel, or a random daily topic.
- Role-play situations: meeting a new friend, ordering food, calling customer care,
  talking to a manager, asking for help, small talk at office.
- **Correction style**: conversation stays natural; under each of my messages show a small
  "Better way to say" box with:
  - my sentence → corrected sentence
  - mistake type (tense, article, preposition, word choice)
  - one-line simple reason
- End of chat: summary with top 3 mistakes, 5 new useful phrases, and save all to Progress.
- AI must return structured JSON for corrections so the UI can show them cleanly.

### 3.6 Practice
- **Grammar Checker** – paste text → corrected text, mistakes listed as
  `wrong → right — reason`, score /10. Save mistakes.
- **Word & Sentence Helper** – meaning, 3 examples (office/friends/interview), common wrong
  usage, formal vs casual, synonyms. "Which is correct?" mode for two options
  (e.g. "discuss about" vs "discuss").
- **Situation Phrases** – choose situation + tone → 8–10 phrases with when to use them,
  plus "Don't say → Say instead". Save favorites.
- **Writing practice** – I write a short paragraph or article; AI corrects paragraph by
  paragraph and explains. Also "Write a story" mode where I continue a story and AI corrects.

### 3.7 Speak (pronunciation)
- Read-aloud practice: app shows a sentence (often from my current story) → I record →
  speech-to-text → compare with target → highlight missed/wrong words.
- Listen to the correct version (normal + slow).
- Phonetic help for hard words (e.g. "comfortable" → KUMF-ter-bul).
- Shadowing mode: play a sentence, I repeat it, next sentence.
- Note in UI: this is practice feedback, not an exact accent score.

### 3.8 Interview
- Settings: my role and tech topics I am learning, experience level.
- Modes: Common HR questions, Technical questions, Full mock interview (one question at a
  time, voice or text).
- Feedback per answer: content, grammar, confident words, a better sample answer.
- Answer Bank to save and revise best answers. End report: strengths + 3 things to improve.

### 3.9 Progress
- Mistakes notebook grouped by type; "Practice my mistakes" quiz.
- Saved words (flashcards with listen button, spaced repetition: show again after 1, 3, 7 days).
- Stats: minutes read, minutes talked, books finished, words learned, streak chart.

### 3.10 Settings
- Level, interests, daily goal, Hindi explanations on/off, TTS voice and speed,
  OpenAI voice vs free browser voice, approximate AI usage this month.

---

## 4. Database Tables (Supabase)
- `profiles` (user_id, level, interests text[], daily_goal_minutes, hindi_help bool, voice)
- `books` (id, user_id, title, author, cover_url, source: 'gutenberg'|'upload'|'ai'|'info_only',
  level, genre, is_public_domain bool, file_path, summary, created_at)
- `chapters` (id, book_id, number, title, content text)
- `reading_progress` (id, book_id, chapter_id, position, percent, status, minutes, updated_at)
- `audio_cache` (id, chapter_id, paragraph_index, voice, file_path)
- `saved_words` (id, word, meaning, example, next_review_date, interval_days)
- `mistakes` (id, wrong, right, reason, type, source_feature, created_at)
- `conversations` (id, topic, messages jsonb, summary, created_at)
- `saved_phrases` (id, situation, phrase, usage_note)
- `answer_bank` (id, question, my_answer, improved_answer, feedback)
- `daily_plan` (id, date, story_book_id, reason, completed bool)
- `practice_log` (id, feature, date, minutes)
- `ai_usage` (id, feature, created_at)

Enable Row Level Security on all tables (user can only see own rows).
Put SQL in `supabase/migrations/` so I can paste it into the Supabase SQL editor.

---

## 5. Building Rules
- Mobile-first; add PWA manifest so I can "Add to Home Screen".
- Simple words in UI, big buttons, loading state on every AI call.
- Friendly error messages, never raw errors.
- Rate-limit AI routes; cache TTS audio and AI summaries to save API cost.
- Large books: process in chunks, never send a whole book to the AI at once.
- Copyright: full text only for public-domain books, my own uploads, and AI-written original
  stories. For other books show info + short summary + legal links only.
- Clean, commented code, small components, no unused packages.
- After each phase run `npm run build` and fix all errors.

---

## 6. Build Phases
1. Setup: Next.js, Tailwind, shadcn/ui, Supabase Auth login, layout + menu, `.env.example`.
2. Library: Gutendex search + add book + chapter splitting + starter books preloaded.
3. Reader: reading view, progress saving, tap-word popup.
4. Listen: TTS with sentence highlight + audio caching.
5. Uploads: PDF/EPUB/TXT/DOCX upload and parsing.
6. Book cover photo search (vision → search → pick).
7. AI stories + level placement quiz + Today page with daily recommendation.
8. Talk: friendly chat with corrections (text, then voice).
9. Practice tools: grammar, word helper, phrases, writing.
10. Speak: pronunciation + shadowing.
11. Interview prep + Answer Bank.
12. Progress, flashcards, Settings, PWA, final polish, deploy to Vercel.

---

## 7. Deploy Steps (explain in simple words at Phase 12)
1. Push the project to a private GitHub repo.
2. Create a free Supabase project → run migration SQL → create private Storage buckets
   `books` and `audio` → copy URL and keys.
3. vercel.com → "Add New Project" → import the repo.
4. Add all env variables in Vercel → Settings → Environment Variables.
5. Deploy → get link like `https://taletalk-yourname.vercel.app`.
6. Open on phone → browser menu → "Add to Home Screen".
7. Every GitHub push updates the app automatically.

---

## 8. Decisions from the plan review (Step 1, agreed with me)
- Project lives in `C:\dev\taletalk` (not in OneDrive: sync breaks `node_modules`).
- Next.js 16: use `proxy.ts` (not `middleware.ts`). Cache Components is ON: any code that
  reads cookies (login) must be inside `<Suspense>`. Call `await connection()` before any
  code that reads the clock (`Date.now()`, `new Date()`, Supabase `getClaims()`).
- Every table has `user_id` + RLS. `chapters` / `audio_cache` check the owner through `books`.
- Uploads go straight from the browser to Supabase Storage (Vercel limit is 4.5 MB per request),
  then the server parses the file from Storage.
- PDF parsing: `unpdf`. EPUB parsing: small parser with `jszip` (epubjs/epub2 are unmaintained).
- TTS audio is made and cached **per sentence** (Kokoro in the browser, IndexedDB cache), so sentence highlight is exact.
- Speech-to-text never gets the target sentence as a hint (so it does not hide my mistakes).
- Rate limits are counted in the `ai_usage` table (tokens; cost is 0 on the free tiers). Both providers 429 → "Daily free AI limit reached".
- Spaced repetition: 1, 3, 7, 14, 30 days.
- Full-text search index on `chapters.content`. Cache AI summary/questions on `chapters`.
- Login page has a "Create an account" option (sign-up). Keep Supabase sign-ups ON and
  "Confirm email" OFF (free email service allows only ~2 emails per hour).
- Check the Gemini / Groq model pages when a model changes and put names in `.env.local`. Never send passwords or private data to the AI (free Gemini may use it).

Next.js version rules: @AGENTS.md
- Design system (REDESIGN Step 3): all tokens in `app/globals.css` (indigo #4F46E5, warm amber, page #F8F7F4,
  dark #0F1115/#171A21, level colors A1–C1, reading papers, radius 12/20/28, soft shadows, type 12–36 px).
  Fonts via `next/font`: Plus Jakarta Sans (UI), Literata (reading), Lora / Merriweather / Atkinson Hyperlegible
  (Reader options, not preloaded). Gradient only via `bg-hero` (Today hero + full-screen player).
- Shared components live in `components/ui/` (Sheet, Shelf, Chip, LevelBadge, StreakFlame, StatCard, ProgressRing,
  EmptyState, Skeleton, DiffText, MicButton, motion helpers) + `components/library/book-cover.tsx`.
  Use them instead of new one-off styles. Preview: `/design`.
- Bottom sheet = Base UI `Drawer` (already installed), not vaul. Animations = `motion`; shelves = `embla-carousel-react`;
  confetti = `canvas-confetti` (big wins only, via `celebrate()` in `lib/feedback.ts`). All respect reduced motion.
- Phone tabs: Today, Library, Reader, Talk, More. Laptop sidebar folds to icons. Global search: Ctrl+K / search icon.
- Offline (REDESIGN Step 4): `public/sw.js` is registered only in production. Pages cache = "taletalk-pages"
  (cleared on log out). Never cache /api, /auth, /login. `/offline` is public in the proxy; `sw.js` is skipped by the proxy matcher.
- Talk replies return `suggestions` (3 reply ideas) stored inside `conversations.messages` JSON.
- Reader settings (per device): theme, font (`READING_FONTS`), size, line height — shown in the Reader and in Settings.
- Server pages must not pass icon components into "use client" components (not serializable): keep such
  wrappers (e.g. `components/settings/group.tsx`) server-safe.
