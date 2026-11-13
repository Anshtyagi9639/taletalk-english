/** Demo data for the Step 3 design directions (preview pages under /design/…). Not real user data. */
export const OZ = {
  title: "The Wonderful Wizard of Oz",
  author: "L. Frank Baum",
  cover: "https://www.gutenberg.org/cache/epub/55/pg55.cover.medium.jpg",
  /** Soft color taken from the cover (in the real app: read in the browser). */
  tint: "#4d6b3c",
  chapter: 2,
  chapterTitle: "The Council with the Munchkins",
  chapters: 24,
  minutesLeft: 4,
  page: 12,
  pages: 40,
  percent: 42,
};

export const STORY = { title: "A New Job in the City", author: "TaleTalk AI", level: "B1", minutes: 8, why: "At your level, about office life — one of your interests." };

export const WORD = { word: "journey", meaning: "a trip from one place to another", example: "The journey to work takes 20 minutes." };

export const TALK_TOPIC = "A movie or series you watched recently";

export const STREAK = { days: 4, restDaysLeft: 1, week: [true, true, "rest", true, true, false, false] as (boolean | "rest")[], todayIndex: 4 };

export const GOAL = { reading: 6, readingGoal: 15, talking: 0, talkingGoal: 10 };

/** Public-domain text (Baum, 1900), chapter 2. */
export const PASSAGE = [
  "She was awakened by a shock, so sudden and severe that if Dorothy had not been lying on the soft bed she might have been hurt.",
  "As it was, the jar made her catch her breath and wonder what had happened; and Toto put his cold little nose into her face and whined dismally.",
  "Dorothy sat up and noticed that the house was not moving; nor was it dark, for the bright sunshine came in at the window, flooding the little room.",
  "She sprang from her bed and with Toto at her heels ran and opened the door.",
  "The little girl gave a cry of amazement and looked about her, her eyes growing bigger and bigger at the wonderful sights she saw.",
];

export const SHELF = [
  { title: "The Fox and the Grapes", author: "Aesop", level: "A2", minutes: 6 },
  { title: "A New Job in the City", author: "TaleTalk AI", level: "B1", minutes: 8 },
  { title: "My Travel Notes", author: null, level: "B1", minutes: 33 },
  { title: "The Gift of the Magi", author: "O. Henry", level: "B2", minutes: 14 },
  { title: "Pride and Prejudice", author: "Jane Austen", level: "C1", minutes: 620 },
  { title: "Treasure Island", author: "R. L. Stevenson", level: "B2", minutes: 410 },
];
