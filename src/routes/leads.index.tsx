import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Search, ArrowUpRight, ArrowLeft, RotateCcw } from "lucide-react";
import { matchesQuery } from "@/lib/search-match";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useBackShortcut } from "@/lib/use-back-shortcut";
import {
  LEADS,
  ENRICHED_LEADS,
  STAGES,
  ownerName,
  isBreachingSla,
  type Source,
  type Stage,
} from "../data/leads";

export const Route = createFileRoute("/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — SEIA Growth Labs" },
      { name: "description", content: "Filter and drill into every open lead across the SEIA wealth-management pipeline." },
      { property: "og:title", content: "Leads — SEIA Growth Labs" },
      { property: "og:description", content: "Every lead, every stage, every owner — filterable and sortable." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { branch?: string; stage?: string; from?: string } => ({
    branch: typeof s.branch === "string" ? s.branch : undefined,
    stage: typeof s.stage === "string" ? s.stage : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
  }),
  component: LeadsPage,
});


const SOURCES: (Source | "All")[] = ["All", "Schwab", "Fidelity", "Website", "Seminar", "Referral"];
const STAGE_OPTS: (Stage | "All")[] = ["All", ...STAGES];

function LeadsPage() {
  const { branch: branchParam, stage: stageParam, from } = Route.useSearch();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [source, setSource] = useState<Source | "All">("All");
  const [stage, setStage] = useState<Stage | "All">(
    stageParam && (STAGES as readonly string[]).includes(stageParam) ? (stageParam as Stage) : "All",
  );
  const [onlyBreaches, setOnlyBreaches] = useState(false);

  const filtersActive =
    q.trim() !== "" || source !== "All" || stage !== "All" || onlyBreaches;

  const resetFilters = useCallback(() => {
    setQ("");
    setSource("All");
    setStage("All");
    setOnlyBreaches(false);
  }, []);

  // Back always lands on the exact originating Source Details route when a
  // source filter is present (works on direct URLs and refreshes). Otherwise
  // it uses browser history, falling back to the dashboard on a cold entry.
  const goBack = useCallback(() => {
    if (branchParam) {
      router.navigate({
        to: "/branches/$branchId",
        params: { branchId: branchParam },
        search: (from ? { from } : {}) as never,
      });
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    router.navigate({ to: "/dashboard" });
  }, [branchParam, from, router]);

  useBackShortcut(goBack);

  const base = useMemo(
    () => (branchParam ? ENRICHED_LEADS.filter((l) => l.branch === branchParam) : LEADS),
    [branchParam],
  );

  const filtered = useMemo(() => {
    return base.filter((l) => {
      if (source !== "All" && l.source !== source) return false;
      if (stage !== "All" && l.stage !== stage) return false;
      if (onlyBreaches && !isBreachingSla(l)) return false;
      if (q && !matchesQuery(`${l.name} ${l.city} ${l.id}`, q)) return false;
      return true;
    });
  }, [base, q, source, stage, onlyBreaches]);

  const totalAum = filtered.reduce((s, l) => s + l.estAum, 0);
  const breaches = filtered.filter(isBreachingSla).length;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Breadcrumbs
        items={[
          { label: "Dashboard", link: { to: "/dashboard" } },
          ...(branchParam
            ? [
                {
                  label: from === "geo" ? "Geographic overview" : "Source details",
                  link: { to: "/dashboard", search: { tab: from === "geo" ? "geo" : "branches" } },
                },
                {
                  label: branchParam,
                  link: {
                    to: "/branches/$branchId",
                    params: { branchId: branchParam },
                    search: from ? { from } : {},
                  },
                },
              ]
            : []),
          { label: "Leads" },
        ]}
      />

      <button
        type="button"
        onClick={goBack}
        title="Alt + ←"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" />
        {branchParam ? "Source details" : "Back"}
        <span className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider sm:inline">
          Alt + ←
        </span>
      </button>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Pipeline</p>
        <h1 className="mt-1 font-display text-4xl font-semibold">Leads</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every open referral moving through Intake → BDO → PlanScout → Advisor. Click any row for the full lead workspace.
        </p>
      </header>

      {branchParam && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Filtered to source{" "}
            <span className="font-medium text-foreground">{branchParam}</span>
          </span>
          <Link to="/leads" className="text-gold hover:underline">
            Clear source filter
          </Link>
        </div>
      )}


      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Open leads" value={filtered.length.toString()} />
        <Stat label="Est. pipeline AUM" value={`$${totalAum.toFixed(1)}M`} />
        <Stat
          label="Breaching SLA"
          value={breaches.toString()}
          tone={breaches > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, city, ID…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Select label="Source" value={source} onChange={(v) => setSource(v as Source | "All")} options={SOURCES} />
        <Select label="Stage" value={stage} onChange={(v) => setStage(v as Stage | "All")} options={STAGE_OPTS} />
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={onlyBreaches}
            onChange={(e) => setOnlyBreaches(e.target.checked)}
            className="accent-[color:var(--gold)]"
          />
          SLA breaches only
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-primary text-left text-xs uppercase tracking-wider text-primary-foreground">
            <tr>
              <th className="px-4 py-3">Lead/Client</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3 text-right">Est. AUM</th>
              <th className="px-4 py-3 text-right">Days in stage</th>
              <th className="px-4 py-3">Next action</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const breach = isBreachingSla(l);
              return (
                <tr key={l.id} className="border-t border-border/60 hover:bg-ink-soft/60">
                  <td className="px-4 py-3">
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="font-medium hover:text-gold"
                    >
                      {l.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{l.id} · {l.city}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">{l.source}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{l.stage}</td>
                  <td className="px-4 py-3 text-xs">{ownerName(l.ownerId)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">${l.estAum.toFixed(1)}M</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${breach ? "text-destructive" : ""}`}>
                    {l.daysInStage}
                    {breach && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{l.nextAction}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
                    >
                      Open <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center">
                  <p className="font-display text-lg text-foreground">No leads found</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    {base.length === 0 && branchParam
                      ? `No leads are currently attributed to ${branchParam}.`
                      : filtersActive
                        ? "No leads match the current search and filters. Try widening the stage or source, or clear the filters."
                        : "There are no leads to show right now."}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    {filtersActive && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:text-gold"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset filters
                      </button>
                    )}
                    {branchParam && (
                      <Link
                        to="/leads"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm hover:text-gold"
                      >
                        Clear source filter
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            )}

          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl ${tone === "warn" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
