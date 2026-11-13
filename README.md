# TaleTalk

Learn English with stories, speaking and daily practice. A personal app.

- Plan and rules: [CLAUDE.md](CLAUDE.md)
- What is done: [PROGRESS.md](PROGRESS.md)

## What you need
- **Node.js 22 or newer** (24 LTS is best). Check with `node -v`.
- A free **Supabase** project (database, login, file storage).
- A free **Gemini API key** (main AI) — aistudio.google.com → **Get API key** (no card needed).
- A free **Groq API key** (backup AI + speech-to-text) — console.groq.com → **API Keys** (no card needed).
- Everything is **100% free**. Voices run in the browser (Kokoro, open source).

## Run on your computer
```bash
npm install
cp .env.example .env.local   # then put your real keys in .env.local (NEVER in .env.example)
npm run dev                  # open http://localhost:3000
```

### Environment variables (`.env.local`)
| Name | What it is |
|---|---|
| `GEMINI_API_KEY` | Google Gemini key (free tier, server only) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (≈ 500 free requests a day; reads images too) |
| `GROQ_API_KEY` | Groq key (free tier, server only) — used when Gemini's free limit is reached |
| `GROQ_MODEL` | `openai/gpt-oss-120b` (≈ 1,000 free requests a day) |
| `GROQ_STT_MODEL` | `whisper-large-v3-turbo` (speech-to-text for Speak and Interview) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase "publishable" key |
| `SUPABASE_SECRET_KEY` | Supabase "secret" key (server only; the app does not need it at run time) |

### Database (run once, in order)
Supabase → **SQL Editor** → New query → paste each file → **Run**:

`supabase/migrations/0001_profiles.sql` → `0002_library.sql` → `0003_ai_words_reading.sql` →
`0004_audio.sql` → `0005_book_uploads.sql` → `0006_book_info.sql` → `0007_stories_today.sql` →
`0008_talk.sql` → `0009_interview.sql`

Every file is safe to run again. They also create the private Storage buckets `audio` and `books`.

### Login settings (Supabase → Authentication)
- **Sign In / Providers → Email**: sign-ups ON (the login page has "Create an account"),
  "Confirm email" OFF (the free email service sends only ~2 emails per hour).
- **URL Configuration**: Site URL = your app link; Redirect URLs = `http://localhost:3000/auth/confirm`
  and `https://<your-app>.vercel.app/auth/confirm`.

## Put it on the internet (Vercel) — step by step
1. **Check your secrets first.** Open `.env.example`: it must have only fake values
   (empty keys, `sb_publishable_...`). Real keys go only in `.env.local`, which git ignores.
   Run `git status` and make sure `.env.local` is NOT in the list.
2. **GitHub**: create a **private** repository and push the project
   (`git add .` → `git commit -m "TaleTalk"` → `git push`).
3. **Supabase**: if you have not yet, run all the SQL files above (in order).
4. **Vercel**: go to vercel.com → **Add New… → Project** → import your GitHub repository.
   Vercel finds Next.js by itself. (Node.js 22+ is set in `package.json`.)
5. **Environment variables**: before you press Deploy, open **Environment Variables** and add every
   line from your `.env.local` (name + value). You can also add them later in
   Project → Settings → Environment Variables, then **Redeploy**.
6. **Deploy** → after 1–2 minutes you get a link like `https://taletalk-yourname.vercel.app`.
7. **Supabase → Authentication → URL Configuration**: set Site URL to that link and add
   `https://taletalk-yourname.vercel.app/auth/confirm` to Redirect URLs.
8. **On your phone**: open the link and log in.
   - Android (Chrome): menu ⋮ → **Add to Home screen** / **Install app**.
   - iPhone (Safari): Share → **Add to Home Screen**.
   The microphone works on the Vercel link (it needs https).
9. **Updates**: every `git push` to GitHub updates the app automatically.

## Costs: $0
- Supabase and Vercel: free plans are enough for one person.
- AI: Gemini free tier first, Groq free tier as backup (about 1,500 requests a day together).
  When both are used up you see "Daily free AI limit reached, try again later".
  See **Settings → AI usage (free)** and **Settings → AI check**.
- Voices: Kokoro runs in your browser (downloads once, ~90–300 MB, then cached); Talk uses the
  browser's free live speech recognition (Chrome, Edge, Safari).
- Free Gemini may use requests to improve Google products: never type passwords or private details.
