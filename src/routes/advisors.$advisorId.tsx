import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, Mail, TrendingUp } from "lucide-react";
import { Breadcrumbs } from "../components/breadcrumbs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  getAdvisor, leadsByAdvisor, STAGES,
  LEAD_TRIAGE, enrichLead, type ResearchState, type EnrichedLead, type Stage,
} from "../data/leads";
import { TodayLabel } from "../components/today-label";


export const Route = createFileRoute("/advisors/$advisorId")({
  head: ({ params }) => {
    const a = getAdvisor(params.advisorId);
    return {
      meta: [
        { title: a ? `${a.name} — Advisor profile · SEIA` : "Advisor not found" },
        { name: "description", content: a ? `${a.name} — $${a.bookAum}M book, ${(a.winRate * 100).toFixed(0)}% win rate.` : "Advisor not found" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  validateSearch: (s: Record<string, unknown>): { from?: "activity"; fromBranch?: string; fromOffice?: string } => ({
    from: s.from === "activity" ? ("activity" as const) : undefined,
    fromBranch: typeof s.fromBranch === "string" ? (s.fromBranch as string) : undefined,
    fromOffice: typeof s.fromOffice === "string" ? (s.fromOffice as string) : undefined,
  }),
  loader: ({ params }) => {
    const advisor = getAdvisor(params.advisorId);
    if (!advisor) throw notFound();
    return { advisor };
  },
  component: AdvisorPage,
  notFoundComponent: AdvisorNotFound,
  errorComponent: AdvisorError,
});

function AdvisorNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Advisor not found</h1>
      <Link to="/dashboard" className="mt-6 inline-block text-gold hover:underline">← Dashboard</Link>
    </main>
  );
}

function AdvisorError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Couldn't load advisor</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={() => { router.invalidate(); reset(); }}
        className="mt-6 rounded-md bg-gold px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}

const PIE_COLORS = [
  "oklch(0.82 0.14 82)",
  "oklch(0.65 0.15 200)",
  "oklch(0.7 0.13 170)",
  "oklch(0.68 0.13 300)",
  "oklch(0.72 0.16 150)",
];

const tooltipStyle = {
  backgroundColor: "oklch(0.98 0.006 85)",
  border: "1px solid oklch(0.32 0.02 250 / 60%)",
  borderRadius: 8,
};
const tooltipText = { color: "oklch(0.2 0.02 60)" };

type LeadSort = "aum_desc" | "aum_asc" | "recent" | "oldest";
const SORT_LABEL: Record<LeadSort, string> = {
  aum_desc: "Highest AUM",
  aum_asc: "Lowest AUM",
  recent: "Most recently onboarded",
  oldest: "Least recently onboarded",
};
const ACTIVE_SORT_KEYS: LeadSort[] = ["aum_desc", "aum_asc"];

function firstStageDate(l: EnrichedLead) {
  return new Date(l.timeline[0]?.at ?? 0).getTime();
}
function onboardedDate(l: EnrichedLead) {
  return new Date(l.timeline[l.timeline.length - 1]?.at ?? 0);
}
function formatOnboardedOn(l: EnrichedLead) {
  const d = onboardedDate(l);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function sortLeads<T extends EnrichedLead>(leads: T[], sort: LeadSort, dateFn: (l: T) => number): T[] {
  const copy = [...leads];
  copy.sort((a, b) => {
    switch (sort) {
      case "aum_desc": return b.estAum - a.estAum;
      case "aum_asc": return a.estAum - b.estAum;
      case "recent": return dateFn(b) - dateFn(a);
      case "oldest": return dateFn(a) - dateFn(b);
    }
  });
  return copy;
}

function safeDecodeBranch(v: string) {
  try { return decodeURIComponent(v); } catch { return v; }
}




function AdvisorPage() {
  const { advisor } = Route.useLoaderData() as { advisor: ReturnType<typeof getAdvisor> & object };
  const { from, fromBranch, fromOffice } = Route.useSearch();
  const navigate = useNavigate();
  const myLeads = useMemo(() => leadsByAdvisor(advisor.id).map(enrichLead), [advisor.id]);
  const openLeads = myLeads.filter((l) => l.stage !== "Client Won");
  const wonLeads = myLeads.filter((l) => l.stage === "Client Won");

  const pipelineAum = openLeads.reduce((s, l) => s + l.estAum, 0);
  const clientAum = wonLeads.reduce((s, l) => s + l.estAum, 0);

  const openLeadInDashboard = (id: string) =>
    navigate({ to: "/dashboard", search: { lead: id, from: "pipeline" as const, advisor: advisor.id, fromBranch, fromOffice } });
  const openClientInDashboard = (id: string) =>
    navigate({ to: "/dashboard", search: { lead: id, from: "won" as const, advisor: advisor.id, fromBranch, fromOffice } });


  const pipelineByStage = STAGES.map((s) => ({
    stage: s.replace(" ", "\n"),
    count: myLeads.filter((l) => l.stage === s).length,
  }));

  const backTab = from === "activity" ? "activity" : "advisors";
  const backLabel = from === "activity" ? "Activity" : "Advisor performance";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Breadcrumbs
        items={
          fromOffice
            ? [
                { label: "Branch details", link: { to: "/dashboard", search: { tab: "offices" } } },
                {
                  label: safeDecodeBranch(fromOffice),
                  link: { to: "/offices/$officeId", params: { officeId: fromOffice } },
                },
                { label: advisor.name },
              ]
            : fromBranch
            ? [
                { label: "Sources", link: { to: "/dashboard", search: { tab: "branches" } } },
                {
                  label: safeDecodeBranch(fromBranch),
                  link: { to: "/branches/$branchId", params: { branchId: fromBranch } },
                },
                { label: advisor.name },
              ]
            : [
                { label: backLabel, link: { to: "/dashboard", search: { tab: backTab } } },
                { label: advisor.name },
              ]
        }
      />

      <header className="border-b border-border pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Advisor profile</p>
            <h1 className="mt-1 font-display text-4xl font-semibold">{advisor.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{advisor.title}</p>
            <a href={`mailto:${advisor.email}`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold">
              <Mail className="h-3.5 w-3.5" /> {advisor.email}
            </a>
          </div>
          <TodayLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <KPI label="Pipeline AUM" value={`$${pipelineAum.toFixed(1)}M`} />
          <KPI label="Client AUM" value={`$${clientAum.toFixed(1)}M`} />
          <KPI label="Leads" value={advisor.leads.toString()} />
          <KPI label="Meetings" value={advisor.meetings.toString()} />
          <KPI label="Proposals" value={advisor.proposals.toString()} />
          <KPI label="Won" value={advisor.won.toString()} />
          <KPI label="Win rate" value={`${(advisor.winRate * 100).toFixed(1)}%`} />
        </div>
      </header>


      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Monthly wins" icon={<TrendingUp className="h-4 w-4 text-gold" />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={advisor.monthlyWins}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.02 250 / 40%)" />
              <XAxis dataKey="month" stroke="oklch(0.45 0.02 60)" fontSize={11} />
              <YAxis stroke="oklch(0.45 0.02 60)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipText} labelStyle={tooltipText} />
              <Bar dataKey="wins" fill="oklch(0.82 0.14 82)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Pipeline by stage">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.02 250 / 40%)" />
              <XAxis type="number" stroke="oklch(0.45 0.02 60)" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" stroke="oklch(0.45 0.02 60)" fontSize={10} width={90} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipText} labelStyle={tooltipText} />
              <Bar dataKey="count" fill="oklch(0.65 0.15 200)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Source mix">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={advisor.sourceMix} dataKey="pct" nameKey="source" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {advisor.sourceMix.map((_: unknown, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => `${v}%`}
                contentStyle={tooltipStyle}
                itemStyle={tooltipText}
                labelStyle={tooltipText}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.45 0.02 60)" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <ActiveLeadsSection leads={openLeads} onSelectLead={openLeadInDashboard} />
      <ClientsWonSection leads={wonLeads} onSelect={openClientInDashboard} />

    </main>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg">{value}</div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ResearchPill({ label, state }: { label: string; state: ResearchState }) {
  const tone = state === "done"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    : state === "pending"
    ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
    : "border-border bg-surface-elevated text-muted-foreground";
  const dot = state === "done" ? "●" : state === "pending" ? "◐" : "○";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}>
      <span aria-hidden>{dot}</span>{label}
    </span>
  );
}

function SortSelect({ value, onChange, keys }: { value: LeadSort; onChange: (s: LeadSort) => void; keys?: LeadSort[] }) {
  const opts = keys ?? (Object.keys(SORT_LABEL) as LeadSort[]);
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      Sort
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LeadSort)}
        className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground"
      >
        {opts.map((k) => (
          <option key={k} value={k}>{SORT_LABEL[k]}</option>
        ))}
      </select>
    </label>
  );
}


function ActiveLeadsSection({ leads, onSelectLead }: { leads: EnrichedLead[]; onSelectLead: (id: string) => void }) {
  const [stageFilter, setStageFilter] = useState<Stage | "All">("All");
  const [sortKey, setSortKey] = useState<"days" | "aum">("aum");
  const [daysDir, setDaysDir] = useState<"desc" | "asc">("desc");
  const [aumDir, setAumDir] = useState<"desc" | "asc">("desc");

  const availableStages = Array.from(new Set(leads.map((l) => l.stage)));
  const filtered = stageFilter === "All" ? leads : leads.filter((l) => l.stage === stageFilter);
  const rows = [...filtered].sort((a, b) => {
    if (sortKey === "days") {
      return daysDir === "desc" ? b.daysInStage - a.daysInStage : a.daysInStage - b.daysInStage;
    }
    return aumDir === "desc" ? b.estAum - a.estAum : a.estAum - b.estAum;
  });

  const toggleDays = () => {
    if (sortKey !== "days") { setSortKey("days"); return; }
    setDaysDir((d) => (d === "desc" ? "asc" : "desc"));
  };
  const toggleAum = () => {
    if (sortKey !== "aum") { setSortKey("aum"); return; }
    setAumDir((d) => (d === "desc" ? "asc" : "desc"));
  };

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Active leads</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {leads.length} open · {rows.length} shown
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            Stage
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as Stage | "All")}
              className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground"
            >
              <option value="All">All stages</option>
              {availableStages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Click <span className="font-medium text-foreground">Days</span> or <span className="font-medium text-foreground">Est. AUM</span> to sort
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-primary text-left text-xs uppercase tracking-wider text-primary-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Lead/Client</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Need</th>
                <th className="px-4 py-3 font-semibold">Research</th>
                <th className="px-4 py-3 text-right font-semibold">
                  <button
                    type="button"
                    onClick={toggleDays}
                    className="inline-flex items-center gap-1 uppercase tracking-wider text-primary-foreground hover:opacity-80"
                  >
                    Days
                    <ArrowUpDown className="h-3 w-3" />
                    <span className="text-[10px] opacity-70">{sortKey === "days" ? (daysDir === "desc" ? "↓" : "↑") : ""}</span>
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  <button
                    type="button"
                    onClick={toggleAum}
                    className="inline-flex items-center gap-1 uppercase tracking-wider text-primary-foreground hover:opacity-80"
                  >
                    Est. AUM
                    <ArrowUpDown className="h-3 w-3" />
                    <span className="text-[10px] opacity-70">{sortKey === "aum" ? (aumDir === "desc" ? "↓" : "↑") : ""}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const t = LEAD_TRIAGE[l.id];
                const breach = l.daysInStage > 4;
                return (
                  <tr key={l.id} className="border-t border-border/60 align-top hover:bg-ink-soft/60">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onSelectLead(l.id)}
                        className="text-left font-medium hover:text-gold"
                      >
                        {l.name}
                      </button>
                      <div className="text-xs text-muted-foreground">{l.id} · {l.city}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{l.stage}</td>
                    <td className="px-4 py-3">
                      <div>{l.source}</div>
                      <div className="text-xs text-muted-foreground">{l.branch}</div>
                    </td>
                    <td className="px-4 py-3">{t?.statedNeed ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <ResearchPill label="Catchlight" state={t?.catchlight ?? "not_started"} />
                        <ResearchPill label="PlanScout" state={t?.planScout ?? "not_started"} />
                        <ResearchPill label="Discovery Prep" state={t?.discoveryPrep ?? "not_started"} />
                      </div>
                      {t?.reworkReason && (
                        <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">↩ Rework: {t.reworkReason}</div>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${breach ? "font-medium text-destructive" : ""}`}>{l.daysInStage}d</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">${l.estAum.toFixed(1)}M</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No open leads match those filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ClientsWonSection({ leads, onSelect }: { leads: EnrichedLead[]; onSelect: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<"date" | "aum" | "name">("date");
  const [dateSort, setDateSort] = useState<"recent" | "oldest">("recent");
  const [aumSort, setAumSort] = useState<"recent" | "oldest">("recent");
  const [nameSort, setNameSort] = useState<"asc" | "desc">("asc");
  const rows = (() => {
    if (sortKey === "name") {
      const copy = [...leads];
      copy.sort((a, b) => nameSort === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
      return copy;
    }
    return sortKey === "date"
      ? sortLeads(leads, dateSort, (l) => onboardedDate(l).getTime())
      : sortLeads(leads, aumSort, (l) => l.estAum);
  })();
  const total = leads.reduce((s, l) => s + l.estAum, 0);
  const toggleDateSort = () => {
    if (sortKey !== "date") { setSortKey("date"); return; }
    setDateSort((s) => (s === "recent" ? "oldest" : "recent"));
  };
  const toggleAumSort = () => {
    if (sortKey !== "aum") { setSortKey("aum"); return; }
    setAumSort((s) => (s === "recent" ? "oldest" : "recent"));
  };
  const toggleNameSort = () => {
    if (sortKey !== "name") { setSortKey("name"); return; }
    setNameSort((s) => (s === "asc" ? "desc" : "asc"));
  };

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-xl">Clients won</h2>
          <p className="text-xs text-muted-foreground">{leads.length} signed · ${total.toFixed(1)}M AUM</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Click <span className="font-medium text-foreground">Client</span>, <span className="font-medium text-foreground">Onboarded</span> or <span className="font-medium text-foreground">Est. AUM</span> to sort
        </p>
      </div>
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-primary text-left text-xs uppercase tracking-wider text-primary-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">
              <button
                type="button"
                onClick={toggleNameSort}
                className="inline-flex items-center gap-1 uppercase tracking-wider text-primary-foreground hover:opacity-80"
              >
                Client
                <ArrowUpDown className="h-3 w-3" />
                <span className="text-[10px] opacity-70">{sortKey === "name" ? (nameSort === "asc" ? "A–Z" : "Z–A") : ""}</span>
              </button>
            </th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">
              <button
                type="button"
                onClick={toggleDateSort}
                className="inline-flex items-center gap-1 uppercase tracking-wider text-primary-foreground hover:opacity-80"
              >
                Onboarded
                <ArrowUpDown className="h-3 w-3" />
                <span className="text-[10px] opacity-70">{sortKey === "date" ? (dateSort === "recent" ? "↓" : "↑") : ""}</span>
              </button>
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              <button
                type="button"
                onClick={toggleAumSort}
                className="inline-flex items-center gap-1 uppercase tracking-wider text-primary-foreground hover:opacity-80"
              >
                Est. AUM
                <ArrowUpDown className="h-3 w-3" />
                <span className="text-[10px] opacity-70">{sortKey === "aum" ? (aumSort === "recent" ? "↓" : "↑") : ""}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} className="border-t border-border/60 hover:bg-ink-soft/60">
              <td className="px-4 py-3">
                <button type="button" onClick={() => onSelect(l.id)} className="font-medium text-left hover:text-gold">
                  {l.name}
                </button>
                <div className="text-xs text-muted-foreground">{l.id}</div>
              </td>
              <td className="px-4 py-3 text-xs">{l.source}</td>
              <td className="px-4 py-3 text-xs tabular-nums text-foreground">
                {formatOnboardedOn(l)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">${l.estAum.toFixed(1)}M</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No clients won yet.</td></tr>
          )}
        </tbody>
      </table>

    </section>

  );
}
