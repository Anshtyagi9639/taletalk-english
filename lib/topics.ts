/** Topics for AI stories, interests (placement + Settings) and daily talk topics. */

/** Topics you can choose for "Create a story for me". */
export const STORY_TOPICS = [
  { id: "office", label: "Office", emoji: "💼" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "friends", label: "Friends", emoji: "🤝" },
  { id: "interview", label: "Job interview", emoji: "🎤" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "mystery", label: "Mystery", emoji: "🔍" },
  { id: "love", label: "Love", emoji: "❤️" },
  { id: "motivation", label: "Motivation", emoji: "🌟" },
] as const;

export type StoryTopic = (typeof STORY_TOPICS)[number]["id"];

/** Interests: the story topics + kinds of classic books. `genres` match books.genre. */
export const INTERESTS: { id: string; label: string; genres: string[] }[] = [
  { id: "office", label: "Office life", genres: ["Office"] },
  { id: "travel", label: "Travel", genres: ["Travel", "Adventure"] },
  { id: "friends", label: "Friends & family", genres: ["Friends", "Children", "Classic"] },
  { id: "interview", label: "Jobs & interviews", genres: ["Job interview"] },
  { id: "tech", label: "Technology", genres: ["Tech", "Sci-fi"] },
  { id: "mystery", label: "Mystery & crime", genres: ["Mystery"] },
  { id: "love", label: "Love stories", genres: ["Love", "Romance"] },
  { id: "motivation", label: "Motivation", genres: ["Motivation", "Self-help", "Biography"] },
  { id: "adventure", label: "Adventure", genres: ["Adventure"] },
  { id: "fairy", label: "Fairy tales", genres: ["Fairy tales"] },
  { id: "funny", label: "Funny stories", genres: ["Humor", "Short stories"] },
  { id: "scary", label: "Scary stories", genres: ["Horror"] },
];

export function genresForInterests(ids: string[]) {
  return new Set(INTERESTS.filter((i) => ids.includes(i.id)).flatMap((i) => i.genres));
}

/** One topic per day for Talk (picked by date). */
export const TALK_TOPICS = [
  "How was your day?",
  "Your favourite food and how to cook it",
  "A movie or series you watched recently",
  "Your plans for the weekend",
  "A normal day at your office",
  "A place you want to travel to",
  "Your best friend",
  "A skill you are learning now",
  "Your morning routine",
  "A problem you solved at work",
  "Your favourite festival",
  "Shopping: online or in a shop?",
  "Your dream job",
  "A book or story you like",
  "Healthy habits",
  "Your home town",
];
