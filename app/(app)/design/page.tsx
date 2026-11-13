import { Palette } from "lucide-react";
import { DesignKit } from "@/components/design/design-kit";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Design kit" };

/** A preview of the TaleTalk design system (colors, fonts and shared components). */
export default function DesignPage() {
  return (
    <>
      <PageHeader title="Design kit" description="All the building blocks of TaleTalk on one page." icon={Palette} tone="violet" />
      <DesignKit />
    </>
  );
}
