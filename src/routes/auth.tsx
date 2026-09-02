import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { ArrowRight, Loader2 } from "lucide-react";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "BDO Sign in — SEIA Growth Labs" },
      { name: "description", content: "Sign in or create a BDO account for the SEIA Growth Labs dashboard." },
      { property: "og:title", content: "BDO Sign in — SEIA Growth Labs" },
      { property: "og:description", content: "Business Development Office access to the SEIA Growth Labs dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/dashboard";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirectTo, replace: true });
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirectTo}`,
            data: { full_name: fullName, role: "bdo" },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: redirectTo, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: redirectTo, replace: true });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-bark/70">BDO Access Only</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">
            {mode === "signup" ? "Create your BDO account" : "Sign in to Growth Labs"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access is restricted to the Business Development Office team.
          </p>
        </div>

        <div className="rounded-lg border border-sand bg-card p-6 shadow-sm">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-sand bg-background px-4 py-2.5 text-sm font-medium text-ink hover:bg-sand/30"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-sand" /> or <div className="h-px flex-1 bg-sand" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-sand bg-background px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                />
              </Field>
            )}
            <Field label="Work email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-sand bg-background px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-sand bg-background px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
              />
            </Field>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-bark disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create BDO account" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Growth Labs?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
              }}
              className="font-medium text-ink underline-offset-2 hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create a BDO account"}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-ink">← Back to workflow</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-bark/80">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.14 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}
