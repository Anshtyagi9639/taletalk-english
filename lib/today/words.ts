import type { Level } from "@/lib/books/types";

/** Useful words for "Word of the day" (when I have no saved word to review). */
export type DayWord = { word: string; meaning: string; example: string; level: Level };

export const DAY_WORDS: DayWord[] = [
  // A2
  { level: "A2", word: "borrow", meaning: "to take something and give it back later", example: "Can I borrow your pen for a minute?" },
  { level: "A2", word: "on time", meaning: "not late; at the right time", example: "The train arrived on time." },
  { level: "A2", word: "busy", meaning: "having a lot of things to do", example: "I'm busy today, can we talk tomorrow?" },
  { level: "A2", word: "invite", meaning: "to ask someone to come to an event", example: "She invited me to her birthday party." },
  { level: "A2", word: "remember", meaning: "to keep something in your mind", example: "Please remember to call your mother." },
  { level: "A2", word: "cheap", meaning: "not costing much money", example: "This phone is cheap but good." },
  { level: "A2", word: "hurry", meaning: "to move or do things quickly", example: "Hurry up, the bus is coming!" },
  // B1
  { level: "B1", word: "deadline", meaning: "the last time or day to finish something", example: "The deadline for the report is Friday." },
  { level: "B1", word: "afford", meaning: "to have enough money for something", example: "I can't afford a new car this year." },
  { level: "B1", word: "suggest", meaning: "to give an idea for someone to think about", example: "I suggest we start the meeting at ten." },
  { level: "B1", word: "look forward to", meaning: "to feel happy about something that will happen", example: "I look forward to meeting you." },
  { level: "B1", word: "realise", meaning: "to suddenly understand or know something", example: "I realised I had left my keys at home." },
  { level: "B1", word: "manage", meaning: "to succeed in doing something difficult", example: "We managed to finish the project on time." },
  { level: "B1", word: "reliable", meaning: "can be trusted to do what is needed", example: "She is a very reliable team member." },
  // B2
  { level: "B2", word: "follow up", meaning: "to contact someone again about something", example: "I'll follow up with an email after the call." },
  { level: "B2", word: "reluctant", meaning: "not wanting to do something", example: "He was reluctant to share his idea at first." },
  { level: "B2", word: "straightforward", meaning: "easy to understand or do", example: "The new process is quite straightforward." },
  { level: "B2", word: "come up with", meaning: "to think of an idea or plan", example: "She came up with a great solution." },
  { level: "B2", word: "postpone", meaning: "to move an event to a later time", example: "We had to postpone the meeting until Monday." },
  { level: "B2", word: "overwhelmed", meaning: "feeling there is too much to deal with", example: "I felt overwhelmed in my first week at work." },
  { level: "B2", word: "keep in mind", meaning: "to remember something important", example: "Keep in mind that the office closes at six." },
  // C1
  { level: "C1", word: "pragmatic", meaning: "dealing with things in a practical way", example: "We need a pragmatic approach, not a perfect one." },
  { level: "C1", word: "nuance", meaning: "a very small difference in meaning or feeling", example: "Learning a language means learning its nuances." },
  { level: "C1", word: "streamline", meaning: "to make a process simpler and faster", example: "The new tool streamlined our work." },
  { level: "C1", word: "articulate", meaning: "able to express ideas clearly", example: "She gave an articulate answer in the interview." },
  { level: "C1", word: "leverage", meaning: "to use something to get the best result", example: "We can leverage our experience in this market." },
  { level: "C1", word: "candid", meaning: "honest and direct", example: "Thank you for your candid feedback." },
  { level: "C1", word: "resilient", meaning: "able to recover quickly from problems", example: "Children are often very resilient." },
];
