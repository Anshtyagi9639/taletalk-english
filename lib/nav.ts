import {
  BookOpen,
  Briefcase,
  Ellipsis,
  Library,
  MessageCircle,
  Mic,
  PenLine,
  Settings,
  Sun,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One short line shown on the "More" page and placeholder pages. */
  hint: string;
};

/** The 9 main menu items, in the order from CLAUDE.md. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: Sun, hint: "Your plan for today" },
  { href: "/library", label: "Library", icon: Library, hint: "All your stories and books" },
  { href: "/reader", label: "Reader", icon: BookOpen, hint: "Read and listen" },
  { href: "/talk", label: "Talk", icon: MessageCircle, hint: "Chat in English with Alex" },
  { href: "/practice", label: "Practice", icon: PenLine, hint: "Grammar, words and phrases" },
  { href: "/speak", label: "Speak", icon: Mic, hint: "Practice your pronunciation" },
  { href: "/interview", label: "Interview", icon: Briefcase, hint: "Get ready for job interviews" },
  { href: "/progress", label: "Progress", icon: TrendingUp, hint: "Mistakes, words and streak" },
  { href: "/settings", label: "Settings", icon: Settings, hint: "Level, voice and goals" },
];

/** Phone bottom bar: Today, Library, Reader, Talk + "More" (a phone has room for 5). */
const BOTTOM_HREFS = ["/", "/library", "/reader", "/talk"];
export const BOTTOM_ITEMS: NavItem[] = [
  ...NAV_ITEMS.filter((i) => BOTTOM_HREFS.includes(i.href)),
  { href: "/more", label: "More", icon: Ellipsis, hint: "All other pages" },
];

/** Items shown on the "More" page (everything not in the bottom bar). */
export const MORE_ITEMS = NAV_ITEMS.filter((i) => !BOTTOM_HREFS.includes(i.href));

/** True when `pathname` is this menu item's page (or a page inside it). */
export function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
