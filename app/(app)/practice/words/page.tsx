import { BookA } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackToPractice } from "@/components/practice/back-to-practice";
import { WordHelper } from "@/components/practice/word-helper";

export const metadata = { title: "Word & Sentence Helper" };

export default function WordsPage() {
  return (
    <>
      <BackToPractice />
      <PageHeader icon={BookA} tone="amber" title="Word & Sentence Helper" description="Know which word is right for which situation." />
      <WordHelper />
    </>
  );
}
