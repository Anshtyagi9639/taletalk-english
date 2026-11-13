import type { ReactNode } from "react";
import { Narrow } from "@/components/layout/narrow";

/** Focused page: comfortable reading width on big screens. */
export default function Layout({ children }: { children: ReactNode }) {
  return <Narrow>{children}</Narrow>;
}
