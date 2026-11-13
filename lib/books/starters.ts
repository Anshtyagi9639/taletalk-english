import type { Level } from "./types";

export type StarterBook = {
  gutenbergId: number;
  title: string;
  author: string;
  level: Level;
  genre: string;
};

/**
 * Public-domain books to preload, easiest first (IDs checked on gutenberg.org).
 * The level here is a teacher's guess and replaces the automatic estimate.
 */
export const STARTER_BOOKS: StarterBook[] = [
  { gutenbergId: 21, title: "Aesop's Fables", author: "Aesop", level: "A2", genre: "Fairy tales" },
  { gutenbergId: 2591, title: "Grimms' Fairy Tales", author: "Jacob and Wilhelm Grimm", level: "A2", genre: "Fairy tales" },
  { gutenbergId: 55, title: "The Wonderful Wizard of Oz", author: "L. Frank Baum", level: "B1", genre: "Children" },
  { gutenbergId: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", level: "B1", genre: "Children" },
  { gutenbergId: 45, title: "Anne of Green Gables", author: "L. M. Montgomery", level: "B1", genre: "Classic" },
  { gutenbergId: 2776, title: "The Four Million (O. Henry stories)", author: "O. Henry", level: "B2", genre: "Short stories" },
  { gutenbergId: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", level: "B2", genre: "Mystery" },
  { gutenbergId: 120, title: "Treasure Island", author: "Robert Louis Stevenson", level: "B2", genre: "Adventure" },
  { gutenbergId: 1342, title: "Pride and Prejudice", author: "Jane Austen", level: "C1", genre: "Romance" },
];

export function findStarter(gutenbergId: number) {
  return STARTER_BOOKS.find((b) => b.gutenbergId === gutenbergId);
}
