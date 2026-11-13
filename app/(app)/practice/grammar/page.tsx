import { SpellCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackToPractice } from "@/components/practice/back-to-practice";
import { GrammarChecker } from "@/components/practice/grammar-checker";

export const metadata = { title: "Grammar Checker" };

export default function GrammarPage() {
  return (
    <>
      <BackToPractice />
      <PageHeader icon={SpellCheck} tone="amber" title="Grammar Checker" description="Paste your English. See the correct version and why." />
      <GrammarChecker />
    </>
  );
}
