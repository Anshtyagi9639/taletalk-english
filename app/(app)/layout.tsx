import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { SetupNotice } from "@/components/layout/setup-notice";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { TimezoneSync } from "@/components/layout/timezone-sync";
import { UserEmail } from "@/components/layout/user-email";

/**
 * Layout for all logged-in pages: sidebar on laptop, bottom tabs on phone.
 * proxy.ts already sends logged-out visitors to /login.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <AppSidebar
        footer={
          <>
            <Suspense fallback={<span className="block h-5 text-sm text-muted-foreground">…</span>}>
              <UserEmail />
            </Suspense>
            <SignOutButton />
          </>
        }
      />

      {/* Extra bottom padding on phones so the tab bar never hides content. */}
      <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
        <MobileTopBar />
        <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 md:py-10 lg:px-10">
          <Suspense fallback={null}>
            <SetupNotice />
          </Suspense>
          {children}
        </div>
      </main>

      <BottomNav />
      <GlobalSearch />
      <TimezoneSync />
    </div>
  );
}
