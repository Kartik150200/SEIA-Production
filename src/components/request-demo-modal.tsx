import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { trackEvent } from "../lib/track";

const demoSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z
    .string()
    .trim()
    .email("Enter a valid work email")
    .max(255)
    .refine(
      (v) =>
        !/@(gmail|yahoo|outlook|hotmail|icloud|proton(mail)?|aol)\./i.test(v),
      "Please use a work email address",
    ),
  company: z.string().trim().min(2, "Company is required").max(120),
  role: z.string().trim().min(1, "Select a role"),
});

type DemoForm = z.infer<typeof demoSchema>;

const ROLE_OPTIONS = [
  "Financial Advisor",
  "Operations Lead",
  "RIA Principal / Executive",
  "Business Development",
  "Other",
];

export function RequestDemoButton({
  className = "",
  variant = "primary",
  label = "Request a demo",
  source = "cta",
  children,
}: {
  className?: string;
  variant?: "primary" | "nav" | "gold" | "bare";
  label?: string;
  source?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const base =
    variant === "nav"
      ? "group inline-flex items-center gap-2 border-b border-bark pb-1 text-[11px] uppercase tracking-[0.22em] text-ink transition-colors hover:text-bark"
      : variant === "gold"
        ? "inline-flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-medium text-primary-foreground shadow-elegant transition-transform hover:-translate-y-0.5"
        : variant === "bare"
          ? ""
          : "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 hover:bg-bark";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          trackEvent("demo_open", { source });
          setOpen(true);
        }}
        className={`${base} ${className}`}
      >
        {children ?? (
          <>
            {label}
            {variant === "nav" ? (
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">↗</span>
            ) : variant === "gold" ? (
              <span aria-hidden>→</span>
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </>
        )}
      </button>
      <RequestDemoModal open={open} onOpenChange={setOpen} />
    </>
  );
}

export function RequestDemoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState<DemoForm>({
    name: "",
    email: "",
    company: "",
    role: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof DemoForm, string>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  function update<K extends keyof DemoForm>(key: K, value: DemoForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = demoSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof DemoForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof DemoForm;
        if (!next[k]) next[k] = issue.message;
      }
      setErrors(next);
      return;
    }
    setStatus("submitting");
    trackEvent("demo_submit", { role: parsed.data.role });
    await new Promise((r) => setTimeout(r, 700));
    setStatus("success");
  }

  function reset() {
    setForm({ name: "", email: "", company: "", role: "" });
    setErrors({});
    setStatus("idle");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTimeout(reset, 200);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {status === "success" ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
              <CheckCircle2 className="h-6 w-6 text-gold" />
            </div>
            <DialogHeader className="mt-4">
              <DialogTitle className="text-center font-serif text-2xl">
                Thanks, {form.name.split(" ")[0]}
              </DialogTitle>
              <DialogDescription className="text-center">
                Growth Labs access is BDO-only. Create your account to open the live dashboard.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  navigate({
                    to: "/auth",
                    search: { mode: "signup" },
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-bark"
              >
                Sign up <ArrowRight className="h-4 w-4" />
              </button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Request a demo</DialogTitle>
              <DialogDescription>
                Tell us about your role — Growth Labs access is limited to the Business Development Office.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-4" noValidate>
              <Field
                label="Full name"
                error={errors.name}
                input={
                  <input
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    className="w-full rounded-md border border-sand bg-background px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                }
              />
              <Field
                label="Work email"
                error={errors.email}
                input={
                  <input
                    type="email"
                    autoComplete="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full rounded-md border border-sand bg-background px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                }
              />
              <Field
                label="Company"
                error={errors.company}
                input={
                  <input
                    type="text"
                    autoComplete="organization"
                    maxLength={120}
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    className="w-full rounded-md border border-sand bg-background px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                }
              />
              <Field
                label="Role"
                error={errors.role}
                input={
                  <select
                    value={form.role}
                    onChange={(e) => update("role", e.target.value)}
                    className="w-full rounded-md border border-sand bg-background px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  >
                    <option value="">Select a role…</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                }
              />
              <DialogFooter className="mt-2 gap-2 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full border border-sand px-5 py-2 text-sm text-ink hover:bg-sand/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-bark disabled:opacity-60"
                >
                  {status === "submitting" ? "Submitting…" : "Continue"}
                </button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  input,
  error,
}: {
  label: string;
  input: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-bark/80">
        {label}
      </span>
      {input}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
