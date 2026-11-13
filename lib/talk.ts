/** Talk with Alex: topics, role-plays and message types (shared by browser and server). */

export const TALK_SUBJECTS = [
  { id: "my-day", label: "My day", emoji: "☀️", about: "the learner's day today: what they did, how they feel" },
  { id: "food", label: "Food", emoji: "🍛", about: "food: favourite dishes, cooking, eating out" },
  { id: "movies", label: "Movies & series", emoji: "🎬", about: "movies and TV series the learner likes" },
  { id: "weekend", label: "Weekend", emoji: "🌴", about: "the learner's last or next weekend" },
  { id: "office", label: "Office life", emoji: "💼", about: "the learner's work and office life" },
  { id: "travel", label: "Travel", emoji: "✈️", about: "travel: places visited or dream trips" },
  { id: "random", label: "Surprise me", emoji: "🎲", about: "a light, interesting everyday topic that you choose" },
] as const;

export const ROLE_PLAYS = [
  {
    id: "new-friend",
    label: "Meeting a new friend",
    emoji: "👋",
    scene: "You are Alex, a friendly person at a weekend meetup. The learner just met you. Get to know each other.",
  },
  {
    id: "order-food",
    label: "Ordering food",
    emoji: "🍽️",
    scene: "You are Alex, a waiter at a busy restaurant. The learner is the customer who wants to order a meal and drinks.",
  },
  {
    id: "customer-care",
    label: "Calling customer care",
    emoji: "📞",
    scene:
      "You are Alex, a polite customer care agent at an internet company. The learner calls because their internet is slow. Ask for details and solve it step by step.",
  },
  {
    id: "manager",
    label: "Talking to my manager",
    emoji: "🧑‍💼",
    scene:
      "You are Alex, the learner's manager at work. The learner comes to talk to you (for example about a project update or asking for a day off). Be professional and kind.",
  },
  {
    id: "ask-help",
    label: "Asking for help",
    emoji: "🙋",
    scene: "You are Alex, a stranger at a big train station. The learner needs help (directions, tickets, a lost bag).",
  },
  {
    id: "small-talk",
    label: "Small talk at the office",
    emoji: "☕",
    scene: "You are Alex, a colleague at the coffee machine on a Monday morning. Make light, friendly small talk.",
  },
] as const;

export type TalkSetup = { kind: "topic"; topic: string } | { kind: "roleplay"; topic: string };

export type TalkMistake = { wrong: string; right: string; type: string; reason: string };

/** "Better way to say": correction of ONE learner message. */
export type TalkCorrection = { ok: boolean; better: string; mistakes: TalkMistake[] };

export type TalkMessage = {
  role: "user" | "assistant";
  text: string;
  correction?: TalkCorrection;
  /** Alex's messages: 3 short reply ideas for the learner (suggestion chips). */
  suggestions?: string[];
  /** true if I spoke it (then punctuation/capital letters are not judged). */
  voice?: boolean;
  at: string;
};

export type TalkSummary = {
  summary: string;
  top_mistakes: TalkMistake[];
  phrases: { phrase: string; meaning: string }[];
  encouragement: string;
};

/** Title + what Alex should talk about, for a setup. Free text (daily topic) is allowed for "topic". */
export function describeSetup(setup: TalkSetup) {
  if (setup.kind === "roleplay") {
    const rp = ROLE_PLAYS.find((r) => r.id === setup.topic);
    return rp ? { title: rp.label, about: rp.scene, roleplay: true } : null;
  }
  const subject = TALK_SUBJECTS.find((s) => s.id === setup.topic);
  if (subject) return { title: subject.label, about: `Talk about ${subject.about}.`, roleplay: false };
  const free = setup.topic.trim().slice(0, 120);
  return free ? { title: free, about: `Today's topic: "${free}".`, roleplay: false } : null;
}

/** Longest chat we keep (then you start a new one). */
export const MAX_TALK_MESSAGES = 80;
