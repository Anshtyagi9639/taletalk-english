import { BookOpen, Headphones, MessageCircle, Mic, Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

const FEATURES = [
  { icon: BookOpen, text: "Read stories and classic books at your level" },
  { icon: Headphones, text: "Listen while every sentence lights up" },
  { icon: MessageCircle, text: "Chat with Alex and learn a better way to say it" },
  { icon: Mic, text: "Practise pronunciation and job interviews" },
];

/** Login page: brand panel (laptop) + login / create-account form. */
export default function LoginPage() {
  const ready = getSupabaseEnv() !== null;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel (laptop and bigger) */}
      <section className="relative hidden overflow-hidden bg-hero p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-2 text-2xl font-bold">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <Sparkles className="size-6" aria-hidden />
          </span>
          TaleTalk
        </div>
        <div className="relative space-y-6">
          <h1 className="max-w-md text-4xl leading-tight font-bold">Learn English with stories, a friendly chat buddy and daily practice.</h1>
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-lg">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm opacity-80">A little English every day makes a big difference.</p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center lg:justify-start">
            <Logo />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Welcome! 👋</h2>
            <p className="text-base text-muted-foreground">Log in, or create an account, to keep learning English.</p>
          </div>
          <div className="rounded-card bg-card shadow-soft ring-1 ring-border p-6 shadow-sm">
            {ready ? (
              <LoginForm />
            ) : (
              <p role="alert" className="rounded-lg bg-muted p-3 text-base">
                Setup needed: add your Supabase URL and key to the <code>.env.local</code> file, then restart the app.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
