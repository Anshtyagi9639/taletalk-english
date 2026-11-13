import { PenLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackToPractice } from "@/components/practice/back-to-practice";
import { WritingPractice } from "@/components/practice/writing-practice";

export const metadata = { title: "Writing Practice" };

export default function WritingPage() {
  return (
    <>
      <BackToPractice />
      <PageHeader icon={PenLine} tone="amber" title="Writing Practice" description="Write in English. The AI corrects you paragraph by paragraph." />
      <WritingPractice />
    </>
  );
}
