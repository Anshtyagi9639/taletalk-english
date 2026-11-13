/** Lists and types for the Practice tools (shared by browser and server). */

export const SITUATIONS = [
  "Asking my manager for a day off",
  "Saying sorry for being late",
  "Meeting someone new",
  "Disagreeing politely in a meeting",
  "Asking a colleague for help",
  "Ordering at a restaurant",
  "Complaining about a product",
  "Introducing myself in a job interview",
  "Calling customer care",
  "Small talk with a colleague",
  "Giving feedback to a teammate",
  "Saying no politely",
] as const;

export const TONES = [
  { id: "formal", label: "Formal" },
  { id: "polite", label: "Polite" },
  { id: "friendly", label: "Friendly" },
  { id: "confident", label: "Confident" },
] as const;

export type Tone = (typeof TONES)[number]["id"];

export type Note = { wrong: string; right: string; type: string; reason: string };

export type WordHelp = {
  meaning: string;
  part_of_speech: string;
  examples: { office: string; friends: string; interview: string };
  wrong_usage: { wrong: string; right: string; reason: string }[];
  formal: string;
  casual: string;
  synonyms: string[];
  hindi: string;
};

export type WhichAnswer = {
  correct: "A" | "B" | "both" | "neither";
  best: string;
  explanation: string;
  examples: string[];
  tip: string;
};

export type PhraseSet = {
  phrases: { phrase: string; when: string }[];
  dont_say: { dont: string; say: string; reason: string }[];
};

export type WritingResult = {
  paragraphs: { original: string; corrected: string; notes: Note[] }[];
  overall: string;
  score: number;
  tip: string;
};

export type StoryTurn = { corrected: string; notes: Note[]; praise: string; next_part: string };

export type TranslateDirection = "en-hi" | "hi-en";

export type TranslateResult = {
  english: string;
  hindi: string;
  hindi_roman: string;
  is_correct: boolean;
  mistakes: (Note & { reason_hindi: string })[];
  pattern: { formula: string; name: string; explain_hindi: string };
  word_map: { hindi: string; english: string }[];
  other_ways: { english: string; when: string }[];
  hindi_trap: string;
};

/** Example sentences to try (tap to fill). */
export const TRANSLATE_EXAMPLES: Record<TranslateDirection, string[]> = {
  "en-hi": [
    "I am working here since two years.",
    "Yesterday I go to market with my friend.",
    "Please do the needful and revert back.",
    "She don't like coffee.",
  ],
  "hi-en": [
    "मैं कल बाज़ार गया था।",
    "मुझे तुमसे कुछ बात करनी है।",
    "main 2 saal se yahan kaam kar raha hoon",
    "kya aap meri madad kar sakte hain?",
  ],
};

/** Ideas for free writing. */
export const WRITING_IDEAS = [
  "Write about your best day last month.",
  "Describe your job (or your dream job) to a new friend.",
  "Write an email to your manager asking to work from home on Friday.",
  "What do you do to stay healthy?",
  "Describe your home town to a tourist.",
  "Write about a problem you solved at work.",
  "Your plans for the next 5 years.",
  "A review of a movie or series you watched.",
];
