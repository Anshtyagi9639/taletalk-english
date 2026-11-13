import { PageTransition } from "@/components/ui/motion";

/** Every page change: a soft fade + small slide up (off when "reduce motion" is on). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
