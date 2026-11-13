"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

/** Shortest password we accept (Supabase's default minimum is 6). */
const MIN_PASSWORD = 8;

/** Turns Supabase error messages into simple, friendly English. */
function friendlyError(message: string, mode: Mode) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Wrong email or password. Please try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Check your inbox.";
  if (m.includes("already registered") || m.includes("already exists"))
    return "This email already has an account. Please log in.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "New accounts are turned off. Turn on sign-ups in Supabase first.";
  if (m.includes("sending") && m.includes("email"))
    return "We could not send the confirmation email. In Supabase, turn off \"Confirm email\" or set up your own email (SMTP).";
  if (m.includes("email rate limit"))
    return "Supabase can send only a few emails per hour. Wait an hour, or turn off \"Confirm email\" in Supabase.";
  if (m.includes("email") && (m.includes("invalid") || m.includes("not authorized")))
    return "This email address cannot be used. Please try another email.";
  if (m.includes("password")) return `Please use a stronger password (at least ${MIN_PASSWORD} characters).`;
  if (m.includes("fetch") || m.includes("network")) return "Cannot connect. Please check your internet.";
  if (m.includes("rate") || m.includes("too many")) return "Too many tries. Please wait a minute.";
  return mode === "login"
    ? "Sorry, we could not log you in. Please try again."
    : "Sorry, we could not create your account. Please try again.";
}

/** One form for both "Log in" and "Create account". */
export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Supabase's own words, shown small under the friendly message (helps fix problems).
  const [detail, setDetail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = mode === "signup";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setDetail(null);
    setNotice(null);
    setConfirm("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDetail(null);
    setNotice(null);

    if (isSignup) {
      if (password.length < MIN_PASSWORD) {
        setError(`Password must be at least ${MIN_PASSWORD} characters.`);
        return;
      }
      if (password !== confirm) {
        setError("The two passwords are not the same.");
        return;
      }
    }

    setLoading(true);
    try {
      const auth = createClient().auth;

      if (isSignup) {
        const { data, error } = await auth.signUp({
          email,
          password,
          // The link in the confirmation email comes back here.
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });
        if (error) throw error;
        // Supabase returns an empty identities list when the email is already used.
        if (data.user && data.user.identities?.length === 0) {
          throw new Error("already registered");
        }
        if (!data.session) {
          // Email confirmation is ON in Supabase: the user must click the link first.
          setNotice("Account created! Check your email and click the link to confirm it.");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      console.error(`[${mode}] Supabase error:`, err);
      setError(friendlyError(raw, mode));
      setDetail(raw || null);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? MIN_PASSWORD : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 text-base"
        />
      </div>
      {isSignup && (
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-base">
            Password again
          </Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          <p>{error}</p>
          {detail && <p className="mt-1 text-sm opacity-80">Details: {detail}</p>}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-muted p-3 text-base">
          {notice}
        </p>
      )}

      <Button type="submit" disabled={loading} className="h-12 w-full text-base">
        {loading && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {loading
          ? isSignup
            ? "Creating account…"
            : "Logging in…"
          : isSignup
            ? "Create account"
            : "Log in"}
      </Button>

      <p className="text-center text-base text-muted-foreground">
        {isSignup ? "Already have an account? " : "New here? "}
        <button
          type="button"
          onClick={() => switchMode(isSignup ? "login" : "signup")}
          className="font-medium text-primary underline underline-offset-4"
        >
          {isSignup ? "Log in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
