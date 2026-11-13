import type { ReactNode } from "react";

/**
 * Keeps focused pages (reading, chat, forms) at a comfortable width on big screens,
 * while dashboards (Today, Library, Progress) use the full width.
 */
export function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl">{children}</div>;
}
