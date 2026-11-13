import type { Level } from "@/lib/books/types";

/**
 * Placement quiz: 20 questions, 4 per level (A1 → C1). About 5 minutes.
 * The right answers are NOT here (they live on the server in answers.ts).
 */
export type PlacementQuestion = { level: Level; question: string; options: string[] };

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // A1
  { level: "A1", question: "She ___ a teacher.", options: ["am", "is", "are", "be"] },
  { level: "A1", question: "I ___ coffee every morning.", options: ["drink", "drinks", "drinking", "am drink"] },
  { level: "A1", question: "Where ___ you from?", options: ["is", "are", "do", "does"] },
  { level: "A1", question: "The opposite of “hot” is ___.", options: ["cold", "tall", "fast", "happy"] },
  // A2
  { level: "A2", question: "Yesterday we ___ to the cinema.", options: ["go", "goes", "went", "gone"] },
  { level: "A2", question: "This bag is ___ than that one.", options: ["more cheap", "cheaper", "cheapest", "the cheaper"] },
  { level: "A2", question: "I have lived here ___ 2019.", options: ["for", "since", "from", "at"] },
  { level: "A2", question: "There isn’t ___ milk in the fridge.", options: ["some", "any", "many", "a"] },
  // B1
  { level: "B1", question: "If it ___ tomorrow, we will stay at home.", options: ["will rain", "rains", "rained", "raining"] },
  { level: "B1", question: "I’m not used to ___ up so early.", options: ["get", "getting", "got", "gets"] },
  { level: "B1", question: "The report ___ by the manager yesterday.", options: ["wrote", "was written", "has written", "is writing"] },
  { level: "B1", question: "Can you ___ me how to get to the station?", options: ["say", "tell", "speak", "talk"] },
  // B2
  { level: "B2", question: "If I ___ about the meeting, I would have come.", options: ["knew", "had known", "have known", "would know"] },
  { level: "B2", question: "She suggested ___ a taxi.", options: ["to take", "taking", "take", "that taking"] },
  { level: "B2", question: "The meeting was ___ because the manager was ill.", options: ["called off", "called up", "called out", "called back"] },
  { level: "B2", question: "By the time we arrived, the film ___.", options: ["already started", "had already started", "has already started", "was already start"] },
  // C1
  { level: "C1", question: "___ the bad weather, the event was a success.", options: ["Despite", "Although", "However", "Even"] },
  { level: "C1", question: "Not until I read the letter ___ how serious it was.", options: ["I realised", "did I realise", "I did realise", "realised I"] },
  { level: "C1", question: "Her argument was so ___ that nobody could disagree.", options: ["compelling", "compulsive", "compelled", "compulsory"] },
  { level: "C1", question: "It’s high time we ___ something about this problem.", options: ["do", "did", "will do", "have done"] },
];
