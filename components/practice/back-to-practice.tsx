import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackToPractice() {
  return (
    <Link href="/practice" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
      <ArrowLeft className="size-4" /> Practice
    </Link>
  );
}
