import type { Level } from "@/lib/books/types";

/** Everyday sentences to read aloud, by level. */
export const EVERYDAY: Record<"A2" | "B1" | "B2" | "C1", string[]> = {
  A2: [
    "Could you please help me with this bag?",
    "I usually take the bus to work.",
    "What time does the shop close today?",
    "My brother lives in a small town near the sea.",
    "I would like a cup of tea, please.",
    "We are going to the market this evening.",
    "Can you speak a little more slowly?",
    "It was very nice to meet you.",
  ],
  B1: [
    "I'm sorry, I didn't catch your name.",
    "Could we move the meeting to Thursday afternoon?",
    "I've been working here for almost three years.",
    "Let me check my calendar and get back to you.",
    "The traffic was terrible, so I arrived a bit late.",
    "Would you mind sending me the report by email?",
    "I think we should focus on the most important tasks first.",
    "Thank you for your patience while we solve this problem.",
  ],
  B2: [
    "I'd like to share a few thoughts before we make a final decision.",
    "Unfortunately, the delivery has been delayed until next week.",
    "Could you walk me through the main steps of the process?",
    "In my previous role, I was responsible for a team of five people.",
    "I completely understand your concern, and I'll look into it today.",
    "We need to find a balance between quality and speed.",
    "Honestly, I wasn't expecting the results to be this good.",
    "Whether we like it or not, the deadline can't be changed.",
  ],
  C1: [
    "The proposal is ambitious, but it's worth considering carefully.",
    "I'd argue that the real problem lies somewhere else entirely.",
    "Thoroughly testing the software is a necessary, if tedious, part of the job.",
    "Her presentation was remarkably clear, despite the complicated subject.",
    "We're particularly interested in candidates with international experience.",
    "Had we known about the issue earlier, we could have prevented it.",
    "The vocabulary in this novel is surprisingly rich and varied.",
    "It's essential that everyone understands the reasoning behind the decision.",
  ],
};

/** Sounds that are often hard for Hindi / Indian-language speakers. */
export const TRICKY: { sound: string; sentence: string }[] = [
  { sound: "v / w", sentence: "We were very well received in Vienna." },
  { sound: "v / w", sentence: "Victor wants a white van with wide windows." },
  { sound: "th (think)", sentence: "I think three things are worth thinking about." },
  { sound: "th (this)", sentence: "This is the weather they told us about." },
  { sound: "z / s", sentence: "The zoo is closed on Thursdays and Sundays." },
  { sound: "short and long vowels", sentence: "Please sit in this seat and eat your meal." },
  { sound: "silent letters", sentence: "I know the answer, but I doubt the receipt is right." },
  { sound: "word stress", sentence: "Photography is my favourite hobby, but I'm not a photographer." },
  { sound: "-ed endings", sentence: "She walked, talked, and finally decided to wait." },
  { sound: "comfortable words", sentence: "The vegetables in this comfortable restaurant are wonderful." },
];

export function everydayFor(level: Level) {
  const key = level === "A1" ? "A2" : level === "C2" ? "C1" : level;
  return EVERYDAY[key];
}
