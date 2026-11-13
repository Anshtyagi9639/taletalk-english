import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { UserEmail } from "@/components/layout/user-email";
import { MORE_ITEMS } from "@/lib/nav";

export const metadata = { title: "More" };

/** Phone-only page with the menu items that don't fit in the bottom bar. */
export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />

      <Card className="gap-0 py-0">
        <ul className="divide-y">
          {MORE_ITEMS.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-muted">
                <Icon className="size-6 shrink-0 text-primary" aria-hidden />
                <span className="flex-1">
                  <span className="block text-base font-medium">{label}</span>
                  <span className="block text-sm text-muted-foreground">{hint}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 space-y-3">
        <Suspense fallback={null}>
          <UserEmail />
        </Suspense>
        <SignOutButton />
      </div>
    </>
  );
}
