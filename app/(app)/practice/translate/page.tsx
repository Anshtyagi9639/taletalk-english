import { Languages } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { BackToPractice } from "@/components/practice/back-to-practice";
import { TranslatePractice } from "@/components/practice/translate-practice";

export const metadata = { title: "Translate & Learn" };

export default function TranslatePage() {
  return (
    <>
      <BackToPractice />
      <PageHeader
        icon={Languages}
        tone="rose"
        title="Translate & Learn"
        description="Think in Hindi, speak in English. See the right sentence and how to build it."
      />
      <TranslatePractice />
    </>
  );
}
