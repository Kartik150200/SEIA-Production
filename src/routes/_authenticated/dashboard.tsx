import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useBackShortcut } from "@/lib/use-back-shortcut";
import {
  ADVISORS as ADVISOR_PROFILES,
  ADVISOR_ACTIVITY,
  ENRICHED_LEADS,
  LEADS,
  LEAD_TRIAGE,
  triageBand,
  ownerName,
  isBreachingSla,
  type EnrichedLead,
  type ResearchState,
  type TriageBand,
  STAGES,
  BRANCHES,
} from "@/data/leads";
import { supabase } from "@/integrations/supabase/client";
import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  SOURCE_FUNNEL,
  PIPELINE_AGING,
  SLA_BY_STAGE,
  FUNNEL as REAL_FUNNEL,
  FUNNEL_RATES,
  type SourceKey,
} from "@/data/funnel";
import {
  Users,
  TrendingUp,
  Target,
  Clock,
  AlertTriangle,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  FileText,
  Trophy,
  MapPin,
  Building2,
  Activity,
  Filter,
  Download,
  Layers,
  Radio,
  Zap,
  PhoneCall,
  UserPlus,
  ArrowLeft,
  Search,
  ArrowUpDown,
  X,
} from "lucide-react";
import { LeadTabContext, useLeadTab } from "@/components/lead-tab-context";
import { LeadDetailView } from "@/components/lead-detail-view";
import { getLead } from "@/data/leads";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AnimatedCounter, Sparkline, ScrollReveal } from "@/components/flourish";
import { Podium } from "@/components/podium";
import { USBranchMap } from "@/components/us-branch-map";
import { OfficeMap } from "@/components/office-map";

import { matchesQuery } from "@/lib/search-match";
import { OFFICES, officeMapsUrl, officeSlug, officeForLead, isBranchStage, type Office } from "@/data/offices";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Growth Labs Dashboard — SEIA Referral Management" },
      {
        name: "description",
        content:
          "Referral management dashboard for SEIA: lead funnel, referral sources, advisor performance, assignment analytics, pipeline health, geography, and activity.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): {
    lead?: string;
    from?: "won" | "pipeline";
    advisor?: string;
    tab?: string;
    fromBranch?: string;
    fromOffice?: string;
  } => ({
    lead: typeof s.lead === "string" ? s.lead : undefined,
    from: s.from === "won" ? ("won" as const) : s.from === "pipeline" ? ("pipeline" as const) : undefined,
    advisor: typeof s.advisor === "string" ? s.advisor : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
    fromBranch: typeof s.fromBranch === "string" ? s.fromBranch : undefined,
    fromOffice: typeof s.fromOffice === "string" ? s.fromOffice : undefined,
  }),


  component: DashboardPage,
});

type TabId =
  | "triage"
  | "overview"
  | "pipeline"
  | "won"
  | "live"
  | "exec"
  | "funnel"
  | "sources"
  | "advisors"
  | "assignment"
  | "branches"
  | "offices"
  | "health"
  | "geo"
  | "activity";
type GroupId = "overview" | "funnel" | "team" | "ops";

// ─── Reconciliation constants (derived from the shared LEADS dataset so
//    every card on the dashboard agrees on the same source-of-truth).
const OPEN_LEADS = LEADS.filter((l) => l.stage !== "Client Won");
const WON_LEADS = LEADS.filter((l) => l.stage === "Client Won");
const TOTAL_TRACKED = LEADS.length;
const OPEN_COUNT = OPEN_LEADS.length;
const WON_COUNT = WON_LEADS.length;
const PIPELINE_AUM_M = OPEN_LEADS.reduce((s, l) => s + l.estAum, 0);
const CLIENT_AUM_M = WON_LEADS.reduce((s, l) => s + l.estAum, 0);

// ─── Shared dashboard filters (advisor + date range from reporting period)
type AdvisorFilterValue = "All" | string;
type DateRange = { start: Date; end: Date } | null;
type DashboardFilters = {
  advisorFilter: AdvisorFilterValue;
  setAdvisorFilter: (v: AdvisorFilterValue) => void;
  dateRange: DateRange;
  periodLabel: string;
};
const DashboardFiltersContext = createContext<DashboardFilters | null>(null);
function useDashboardFilters(): DashboardFilters {
  const v = useContext(DashboardFiltersContext);
  if (!v)
    return {
      advisorFilter: "All",
      setAdvisorFilter: () => {},
      dateRange: null,
      periodLabel: "",
    };
  return v;
}

// Compute the union bounding date range from selected reporting periods.
// Quarter strings like "2026 · Q3" become [Jul 1 – Sep 30]. "Trailing 12 months"
// returns null so widgets fall back to their own default window.
function periodsToDateRange(periods: string[]): DateRange {
  const quarters = periods.filter((p) => p !== "Trailing 12 months");
  if (quarters.length === 0) return null;
  let minStart: Date | null = null;
  let maxEnd: Date | null = null;
  for (const p of quarters) {
    const [ys, qs] = p.split(" · ");
    const year = Number(ys);
    const q = Number(qs.replace(/[^\d]/g, ""));
    if (!Number.isFinite(year) || !Number.isFinite(q)) continue;
    const startMonth = (q - 1) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
    if (!minStart || start < minStart) minStart = start;
    if (!maxEnd || end > maxEnd) maxEnd = end;
  }
  if (!minStart || !maxEnd) return null;
  return { start: minStart, end: maxEnd };
}

function inRange(iso: string | undefined, range: DateRange): boolean {
  if (!range) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

// All owner names (advisors + BDO) that appear on any lead.
const ALL_OWNER_NAMES = Array.from(new Set(LEADS.map((l) => ownerName(l.ownerId)))).sort();

const TABS: Record<TabId, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  triage: { label: "Triage Queue", icon: PhoneCall },
  overview: { label: "Pipeline Overview", icon: Layers },
  pipeline: { label: "Pipeline Leads", icon: Users },
  won: { label: "Clients Won", icon: Trophy },
  live: { label: "Live Metrics", icon: Radio },
  exec: { label: "Executive KPIs", icon: Trophy },
  funnel: { label: "Lead Funnel", icon: Target },
  sources: { label: "Referral Sources", icon: TrendingUp },
  advisors: { label: "Advisor Performance", icon: Award },
  assignment: { label: "Assignment & SLA", icon: Clock },
  branches: { label: "Source Details", icon: TrendingUp },
  offices: { label: "Branch Details", icon: Building2 },
  health: { label: "Pipeline Health", icon: AlertTriangle },
  geo: { label: "Geographic", icon: MapPin },
  activity: { label: "Activity", icon: Activity },
  
};

const GROUPS: { id: GroupId; label: string; tabs: TabId[] }[] = [
  { id: "overview", label: "Overview", tabs: ["overview", "pipeline", "won", "live", "exec"] },
  { id: "funnel", label: "Funnel", tabs: ["funnel", "sources"] },
  { id: "team", label: "Advisors & SLAs", tabs: ["advisors", "branches", "offices", "activity", "assignment"] },
  { id: "ops", label: "Health & Ops", tabs: ["health", "geo"] },
];



// Chart axis/grid tokens tuned for the warm-sand background
const AXIS = "oklch(0.45 0.02 60)";
const GRID = "oklch(0.78 0.036 82 / 0.5)";

// ─── Mock data ───────────────────────────────────────────────────────────
const FUNNEL: { stage: string; count: number; pct: number | null }[] = [
  { stage: "Referral", count: 125, pct: 100 },
  { stage: "Qualified", count: 75, pct: 60 },
  { stage: "Meeting", count: 50, pct: 40 },
  { stage: "Proposal", count: 45, pct: 36 },
  { stage: "Won Client", count: WON_COUNT, pct: Math.round((WON_COUNT / 125) * 1000) / 10 },
  { stage: "AUM ($M)", count: Math.round(CLIENT_AUM_M * 10) / 10, pct: null },
];

// Legacy per-source / SLA / aging mocks now live in @/data/funnel and are
// reconciled to the source-of-truth funnel (125→75→50→45→21, $16.5M AUM).

const ADVISORS = [
  { name: "Maya Alvarez", leads: 22, meetings: 10, proposals: 8, won: 4, aum: 3.4 },
  { name: "Sora Nakamura", leads: 20, meetings: 9, proposals: 8, won: 4, aum: 3.0 },
  { name: "Jared Whitaker", leads: 19, meetings: 8, proposals: 7, won: 4, aum: 2.9 },
  { name: "Ravi Patel", leads: 17, meetings: 7, proposals: 7, won: 3, aum: 2.2 },
  { name: "Lena Chen", leads: 27, meetings: 11, proposals: 10, won: 4, aum: 3.1 },
  { name: "Tomás O'Brien", leads: 20, meetings: 5, proposals: 5, won: 2, aum: 1.9 },
];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const REFERRALS_BY_MONTH = [10, 11, 13, 12, 15, 16, 15, 17, 16, 15, 14, 13];

const WON_YEARS: number[] = (() => {
  const set = new Set<number>();
  for (const l of LEADS) {
    if (l.stage !== "Client Won") continue;
    const last = l.timeline[l.timeline.length - 1]?.at;
    if (last) set.add(new Date(last).getFullYear());
  }
  set.add(new Date().getFullYear());
  return [...set].sort((a, b) => b - a);
})();

function monthlyForYear(year: number) {
  const wonByMonth = new Array(12).fill(0);
  for (const l of LEADS) {
    if (l.stage !== "Client Won") continue;
    const last = l.timeline[l.timeline.length - 1]?.at;
    if (!last) continue;
    const d = new Date(last);
    if (d.getFullYear() !== year) continue;
    wonByMonth[d.getMonth()] += 1;
  }
  const now = new Date();
  const cap = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  return MONTH_LABELS.slice(0, cap).map((m, i) => ({
    m,
    referrals: REFERRALS_BY_MONTH[i],
    won: wonByMonth[i],
  }));
}



// ─── Page ────────────────────────────────────────────────────────────────
function DashboardPage() {
  const { lead: leadParam, from: fromParam, advisor: advisorParam, tab: tabParam, fromBranch: fromBranchParam, fromOffice: fromOfficeParam } = Route.useSearch();
  const initialFrom: "pipeline" | "won" = fromParam === "won" ? "won" : "pipeline";
  const isValidTab = (t: string | undefined): t is TabId =>
    !!t && (Object.keys(TABS) as string[]).includes(t);
  const initialTab: TabId = leadParam
    ? initialFrom
    : (isValidTab(tabParam) ? tabParam : "overview");
  const [tab, setTab] = useState<TabId>(initialTab);
  const [openLeadId, setOpenLeadId] = useState<string | null>(leadParam ?? null);
  const [leadOrigin, setLeadOrigin] = useState<"pipeline" | "won">(initialFrom);
  const [leadAdvisorReturn, setLeadAdvisorReturn] = useState<string | null>(advisorParam ?? null);
  const [leadFromBranch, setLeadFromBranch] = useState<string | null>(fromBranchParam ?? null);
  const [leadFromOffice, setLeadFromOffice] = useState<string | null>(fromOfficeParam ?? null);
  const [userName, setUserName] = useState<string>("");
  const [pipelineSlaOnly, setPipelineSlaOnly] = useState(false);
  useEffect(() => {
    if (leadParam) {
      const from: "pipeline" | "won" = fromParam === "won" ? "won" : "pipeline";
      setOpenLeadId(leadParam);
      setLeadOrigin(from);
      setLeadAdvisorReturn(advisorParam ?? null);
      setLeadFromBranch(fromBranchParam ?? null);
      setLeadFromOffice(fromOfficeParam ?? null);
      setTab(from);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
      }
    } else if (isValidTab(tabParam)) {
      setTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadParam, fromParam, advisorParam, tabParam, fromBranchParam, fromOfficeParam]);


  const PERIOD_OPTIONS = [
    "2026 · Q3",
    "2026 · Q2",
    "2026 · Q1",
    "2025 · Q4",
    "2025 · Q3",
    "Trailing 12 months",
  ];
  const [periods, setPeriods] = useState<string[]>([PERIOD_OPTIONS[0]]);
  const [periodOpen, setPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setPeriodOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const togglePeriod = (p: string) =>
    setPeriods((prev) =>
      prev.includes(p) ? (prev.length === 1 ? prev : prev.filter((x) => x !== p)) : [...prev, p],
    );
  const periodLabel = periods.length === 0 ? "Select period" : formatPeriodLabel(periods);
  const activeGroup = GROUPS.find((g) => g.tabs.includes(tab))!.id;

  const [advisorFilter, setAdvisorFilter] = useState<AdvisorFilterValue>("All");
  const dateRange = useMemo(() => periodsToDateRange(periods), [periods]);
  const filters: DashboardFilters = useMemo(
    () => ({ advisorFilter, setAdvisorFilter, dateRange, periodLabel }),
    [advisorFilter, dateRange, periodLabel],
  );


  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user?: { user_metadata?: { full_name?: string }; email?: string } | null } }) => {
      const user = res.data.user;
      const name = user?.user_metadata?.full_name ?? user?.email ?? "";
      setUserName(name);
    });
  }, []);

  const [leadReturnTab, setLeadReturnTab] = useState<TabId | null>(null);

  const openLead = (id: string, from: "pipeline" | "won" = "pipeline", opts?: { returnTab?: string }) => {
    setOpenLeadId(id);
    setLeadOrigin(from);
    setLeadAdvisorReturn(null);
    setLeadFromBranch(null);
    setLeadFromOffice(null);
    const returnTab = opts?.returnTab && isValidTab(opts.returnTab) ? (opts.returnTab as TabId) : null;
    setLeadReturnTab(returnTab);
    setTab(returnTab ?? from);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const closeLead = () => {
    setOpenLeadId(null);
    setLeadAdvisorReturn(null);
    setLeadFromBranch(null);
    setLeadFromOffice(null);
    setLeadReturnTab(null);
  };


  const pipelineOpenId = tab === "pipeline" && leadOrigin === "pipeline" && !leadReturnTab ? openLeadId : null;
  const wonOpenId = tab === "won" && leadOrigin === "won" && !leadReturnTab ? openLeadId : null;



  return (
    <LeadTabContext.Provider value={{ openLead, openPipeline: (opts) => { setPipelineSlaOnly(!!opts?.slaOnly); setTab("pipeline"); } }}>
    <DashboardFiltersContext.Provider value={filters}>

    <main className="min-h-screen grid-bg">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          {!openLeadId ? (
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-gold pulse-gold" />
                Growth Labs · Referral Management
              </div>
              <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
                <span className="text-gold-gradient">Dashboard</span>
              </h1>
              {userName ? (
                <p className="mt-3 max-w-xl text-lg text-foreground">
                  Welcome back, <span className="font-semibold text-gold">BDO — {userName}</span>.
                </p>
              ) : (
                <p className="mt-3 max-w-xl text-muted-foreground">
                  Live view of SEIA's lead pipeline — from Schwab & Fidelity referrals through to won
                  clients and AUM growth.
                </p>
              )}
            </div>
          ) : <div />}
          {!openLeadId && (
          <div className="text-right">
            <TodayLabel />
            <div className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Reporting period
            </div>
            <div className="mt-1 flex items-center justify-end gap-2" ref={periodRef}>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPeriodOpen((o) => !o)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 font-display text-lg font-semibold text-foreground shadow-sm hover:border-gold focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                  aria-haspopup="listbox"
                  aria-expanded={periodOpen}
                >
                  <span>{periodLabel}</span>
                  <svg className={`h-4 w-4 transition-transform ${periodOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </button>
                {periodOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-border bg-surface p-2 text-left shadow-xl">
                    <div className="px-2 pb-2 pt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                      Select one or more quarters
                    </div>
                    {PERIOD_OPTIONS.map((p) => {
                      const checked = periods.includes(p);
                      return (
                        <label
                          key={p}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-background"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePeriod(p)}
                            className="h-4 w-4 accent-[hsl(var(--gold))]"
                          />
                          <span>{p}</span>
                        </label>
                      );
                    })}
                    <div className="mt-1 flex justify-between border-t border-border px-2 pt-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setPeriods([PERIOD_OPTIONS[0]])}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setPeriodOpen(false)}
                        className="font-medium text-gold hover:opacity-80"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </header>

        {openLeadId && (leadAdvisorReturn || leadFromBranch || leadFromOffice) ? (
          <div className="mt-8">
            <LeadBackButton advisorReturn={leadAdvisorReturn} fromBranch={leadFromBranch} fromOffice={leadFromOffice} defaultLabel="Back" onCloseLead={closeLead} />
            <LeadDetailView leadId={openLeadId} />
          </div>


        ) : (<>
        {/* Group tabs (primary) */}
        <div className="mt-8 overflow-x-auto">
          <div className="inline-flex gap-1 rounded-full border border-border bg-surface p-1">
            {GROUPS.map((g) => {
              const active = g.id === activeGroup;
              return (
                <button
                  key={g.id}
                  onClick={() => setTab(g.tabs[0])}
                  className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-gold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-tabs (secondary) */}
        <div className="mt-3 overflow-x-auto">
          <div className="inline-flex items-center gap-1 border-b border-border">
            {GROUPS.find((g) => g.id === activeGroup)!.tabs.map((id) => {
              const t = TABS[id];
              const active = tab === id;
              const Icon = t.icon;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors ${
                    active
                      ? "border-gold text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          {tab === "triage" && <TriageView />}
          {tab === "overview" && (openLeadId && leadReturnTab === "overview" ? (
            <div>
              <LeadBackButton advisorReturn={leadAdvisorReturn} fromBranch={leadFromBranch} defaultLabel="Back to pipeline overview" onCloseLead={closeLead} />
              <LeadDetailView leadId={openLeadId} />
            </div>
          ) : <OverviewView />)}
          {tab === "pipeline" && <PipelineLeadsCard openLeadId={pipelineOpenId} onCloseLead={closeLead} advisorReturn={leadAdvisorReturn} fromBranch={leadFromBranch} initialSlaOnly={pipelineSlaOnly} onConsumeSlaOnly={() => setPipelineSlaOnly(false)} />}
          {tab === "won" && <ClientsWonCard openLeadId={wonOpenId} onCloseLead={closeLead} advisorReturn={leadAdvisorReturn} fromBranch={leadFromBranch} />}


          {tab === "live" && <LiveView />}
          {tab === "exec" && <ExecView />}
          {tab === "funnel" && <FunnelView />}
          {tab === "sources" && <SourcesView />}
          {tab === "advisors" && <AdvisorsView />}
          {tab === "assignment" && <AssignmentView />}
          {tab === "branches" && <BranchesView />}
          {tab === "offices" && <OfficesView />}
          {tab === "health" && <HealthView />}
          {tab === "geo" && <GeoView />}
          {tab === "activity" && <ActivityView />}
        </div>
        </>)}


      </div>
    </main>
    </DashboardFiltersContext.Provider>
    </LeadTabContext.Provider>
  );
}

function TodayLabel() {
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    const update = () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setToday(
        new Date().toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: tz,
        }),
      );
    };
    update();
    // refresh at next local midnight
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(update, msToMidnight + 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground" suppressHydrationWarning>
      {today || "\u00A0"}
    </div>
  );
}

function formatPeriodLabel(periods: string[]): string {

  const trailing = periods.filter((p) => p === "Trailing 12 months");
  const quarters = periods
    .filter((p) => p !== "Trailing 12 months")
    .map((p) => {
      const [y, q] = p.split(" · ");
      return { year: Number(y), q: Number(q.replace(/[^\d]/g, "")) };
    })
    .filter((x) => Number.isFinite(x.year) && Number.isFinite(x.q));
  const byYear = new Map<number, number[]>();
  for (const { year, q } of quarters) {
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(q);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const parts = years.map((y) => {
    const qs = [...new Set(byYear.get(y)!)].sort((a, b) => a - b);
    const runs: number[][] = [];
    for (const q of qs) {
      const last = runs[runs.length - 1];
      if (last && q === last[last.length - 1] + 1) last.push(q);
      else runs.push([q]);
    }
    const label = runs
      .map((r) => (r.length === 1 ? `Q${r[0]}` : `Q${r[0]}-Q${r[r.length - 1]}`))
      .join(" & ");
    return `${y} · ${label}`;
  });
  return [...parts, ...trailing].join(", ");
}

// ─── Views ───────────────────────────────────────────────────────────────
function ExecView() {
  const [year, setYear] = useState<number>(WON_YEARS[0]);
  const chartData = useMemo(() => monthlyForYear(year), [year]);
  const kpis = [
    {
      label: "Total referrals",
      value: "125",
      delta: "+18%",
      up: true,
      icon: Users,
      spark: [10, 11, 13, 12, 15, 16, 17],
    },
    {
      label: "Qualified leads",
      value: "75",
      delta: "+14%",
      up: true,
      icon: Target,
      spark: [6, 7, 8, 8, 9, 10, 11],
    },
    {
      label: "Meetings scheduled",
      value: "50",
      delta: "+9%",
      up: true,
      icon: Calendar,
      spark: [4, 5, 5, 6, 6, 7, 7],
    },
    {
      label: "Proposals sent",
      value: "45",
      delta: "+6%",
      up: true,
      icon: FileText,
      spark: [3, 4, 4, 5, 5, 6, 6],
    },
    {
      label: "Clients won",
      value: String(WON_COUNT),
      delta: "+8%",
      up: true,
      icon: Trophy,
      spark: [2, 2, 3, 3, 3, 4, 4],
    },
    {
      label: "Win rate",
      value: `${((WON_COUNT / 125) * 100).toFixed(1)}%`,
      delta: "+1.2pp",
      up: true,
      icon: Trophy,
      spark: [15.2, 15.6, 15.9, 16.1, 16.4, 16.6, 16.8],
    },
    {
      label: "AUM added",
      value: `$${(Math.round(CLIENT_AUM_M * 10) / 10).toFixed(1)}M`,
      delta: "+22%",
      up: true,
      icon: DollarSign,
      spark: (() => {
        const end = Math.round(CLIENT_AUM_M * 10) / 10;
        return [0.5, 0.58, 0.6, 0.72, 0.78, 0.9, 1].map((f) => +(end * f).toFixed(1));
      })(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>
      <Card
        title="Referrals vs. wins — monthly"
        right={
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            Year
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground"
            >
              {WON_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        }
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>


            <CartesianGrid stroke="oklch(0.78 0.036 82 / 0.5)" vertical={false} />
            <XAxis dataKey="m" stroke="oklch(0.45 0.02 60)" fontSize={12} />
            <YAxis stroke="oklch(0.45 0.02 60)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="referrals"
              stroke="oklch(0.82 0.14 82)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="won"
              stroke="oklch(0.75 0.16 150)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function FunnelView() {
  const max = FUNNEL[0].count;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card title="Lead funnel — Referral → AUM">
        <div className="space-y-3">
          {FUNNEL.map((row, i) => {
            const width = (row.count / max) * 100;
            const isAum = row.stage === "AUM ($M)";
            return (
              <div key={row.stage} className="grid grid-cols-[120px_1fr_100px] items-center gap-3">
                <div className="text-sm text-muted-foreground">{row.stage}</div>
                <div className="relative h-9 overflow-hidden rounded-lg bg-surface-elevated">
                  <div
                    className="h-full gold-gradient transition-all"
                    style={{ width: `${isAum ? 40 : width}%`, opacity: 0.35 + i * 0.12 }}
                  />
                  <div className="absolute inset-0 flex items-center px-3 text-sm font-medium text-foreground">
                    {isAum ? `$${row.count}M` : row.count.toLocaleString()}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {row.pct !== null ? `${row.pct}%` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Stage-to-stage conversion">
        <div className="space-y-4">
          {[
            ["Referral → Qualified", `${(FUNNEL_RATES.qualifiedOfReferrals * 100).toFixed(1)}%`],
            ["Qualified → Meeting", `${(FUNNEL_RATES.meetingsOfQualified * 100).toFixed(1)}%`],
            ["Meeting → Proposal", `${(FUNNEL_RATES.proposalsOfMeetings * 100).toFixed(1)}%`],
            ["Proposal → Won", `${(FUNNEL_RATES.wonOfProposals * 100).toFixed(1)}%`],
            ["Overall win rate", `${(FUNNEL_RATES.endToEndCapture * 100).toFixed(1)}%`],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="text-sm text-muted-foreground">{k}</div>
              <div className="font-display text-xl font-semibold text-gold">{v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SourcesView() {
  const allSources = SOURCE_FUNNEL.map((s) => s.name);
  const [selected, setSelected] = useState<Set<SourceKey>>(() => new Set(allSources));

  const filteredSources = useMemo(
    () => SOURCE_FUNNEL.filter((s) => selected.has(s.name)),
    [selected],
  );

  const totals = filteredSources.reduce(
    (acc, s) => ({
      referrals: acc.referrals + s.referrals,
      won: acc.won + s.won,
      aumM: acc.aumM + s.aumM,
    }),
    { referrals: 0, won: 0, aumM: 0 },
  );

  const toggle = (name: SourceKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      if (next.size === 0) return new Set(allSources); // never allow empty
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allSources));

  const isCompareMode = selected.size === 2 && selected.has("Schwab") && selected.has("Fidelity");

  const compareRef = useRef<HTMLDivElement | null>(null);
  const toggleCompareSchwabFidelity = () => {
    if (isCompareMode) {
      setSelected(new Set(allSources));
    } else {
      setSelected(new Set(["Schwab", "Fidelity"] as SourceKey[]));
      // Defer to next frame so the head-to-head panel exists before scrolling.
      requestAnimationFrame(() => {
        compareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const allSelected = selected.size === SOURCE_FUNNEL.length;

  const today = new Date().toISOString().slice(0, 10);

  const exportTotals = () => {
    downloadCsv(`referral-totals-${today}.csv`, [
      ["Metric", "Value"],
      ["Total referrals", totals.referrals],
      ["Total wins", totals.won],
      ["Capture %", totals.referrals ? ((totals.won / totals.referrals) * 100).toFixed(1) : "0.0"],
      ["AUM added ($M)", totals.aumM.toFixed(1)],
      ["Sources included", filteredSources.map((s) => s.name).join(" | ")],
    ]);
  };

  const exportReferralsWins = () => {
    downloadCsv(`referrals-wins-by-source-${today}.csv`, [
      ["Source", "Referrals", "Won"],
      ...filteredSources.map((s) => [s.name, s.referrals, s.won]),
    ]);
  };

  const exportAum = () => {
    const totalAum = filteredSources.reduce((sum, s) => sum + s.aumM, 0);
    downloadCsv(`aum-contribution-${today}.csv`, [
      ["Source", "AUM ($M)", "Share %"],
      ...filteredSources.map((s) => [
        s.name,
        s.aumM.toFixed(1),
        totalAum ? ((s.aumM / totalAum) * 100).toFixed(1) : "0.0",
      ]),
    ]);
  };

  const exportPerformance = () => {
    const rows = filteredSources.map((s) => {
      const capture = s.referrals ? (s.won / s.referrals) * 100 : 0;
      const dollarPer = s.referrals ? (s.aumM * 1_000_000) / s.referrals : 0;
      return [
        s.name,
        s.referrals,
        s.qualified,
        s.meetings,
        s.proposals,
        s.won,
        capture.toFixed(1),
        s.aumM.toFixed(1),
        Math.round(dollarPer),
      ];
    });
    downloadCsv(`source-performance-${today}.csv`, [
      [
        "Source",
        "Referrals",
        "Qualified",
        "Meetings",
        "Proposals",
        "Won",
        "Capture %",
        "AUM ($M)",
        "$ per referral",
      ],
      ...rows,
    ]);
  };

  const exportAll = () => {
    const totalAum = filteredSources.reduce((sum, s) => sum + s.aumM, 0);
    const rows: (string | number)[][] = [];
    const blank = ["", "", "", "", "", "", "", "", ""];
    const pad = (row: (string | number)[]) => {
      const out = [...row];
      while (out.length < 9) out.push("");
      return out;
    };

    // Title block
    rows.push(pad(["Referral Sources - Full Export"]));
    rows.push(pad([`Generated: ${today}`]));
    rows.push(pad([`Sources included: ${filteredSources.map((s) => s.name).join(", ")}`]));
    rows.push(blank);
    rows.push(blank);

    // Section 1: Totals
    rows.push(pad(["SECTION 1: TOTALS"]));
    rows.push(pad(["Metric", "Value"]));
    rows.push(pad(["Total Referrals", totals.referrals]));
    rows.push(pad(["Total Wins", totals.won]));
    rows.push(
      pad([
        "Capture Rate (%)",
        totals.referrals ? ((totals.won / totals.referrals) * 100).toFixed(1) : "0.0",
      ]),
    );
    rows.push(pad(["AUM Added (Millions USD)", totals.aumM.toFixed(1)]));
    rows.push(blank);
    rows.push(blank);

    // Section 2: Referrals & Wins by Source
    rows.push(pad(["SECTION 2: REFERRALS AND WINS BY SOURCE"]));
    rows.push(pad(["Source", "Referrals", "Won"]));
    filteredSources.forEach((s) => rows.push(pad([s.name, s.referrals, s.won])));
    rows.push(blank);
    rows.push(blank);

    // Section 3: AUM Contribution
    rows.push(pad(["SECTION 3: AUM CONTRIBUTION"]));
    rows.push(pad(["Source", "AUM (Millions USD)", "Share of AUM (%)"]));
    filteredSources.forEach((s) =>
      rows.push(
        pad([s.name, s.aumM.toFixed(1), totalAum ? ((s.aumM / totalAum) * 100).toFixed(1) : "0.0"]),
      ),
    );
    rows.push(blank);
    rows.push(blank);

    // Section 4: Source Performance (Full Funnel)
    rows.push(pad(["SECTION 4: SOURCE PERFORMANCE - FULL FUNNEL"]));
    rows.push(
      pad([
        "Source",
        "Referrals",
        "Qualified",
        "Meetings",
        "Proposals",
        "Won",
        "Capture Rate (%)",
        "AUM (Millions USD)",
        "Dollars per Referral",
      ]),
    );
    filteredSources.forEach((s) => {
      const capture = s.referrals ? (s.won / s.referrals) * 100 : 0;
      const dollarPer = s.referrals ? (s.aumM * 1_000_000) / s.referrals : 0;
      rows.push(
        pad([
          s.name,
          s.referrals,
          s.qualified,
          s.meetings,
          s.proposals,
          s.won,
          capture.toFixed(1),
          s.aumM.toFixed(1),
          Math.round(dollarPer),
        ]),
      );
    });

    downloadCsv(`referral-sources-full-${today}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground">
          Filter sources
        </span>
        {SOURCE_FUNNEL.map((s) => {
          const active = selected.has(s.name);
          return (
            <button
              key={s.name}
              onClick={() => toggle(s.name)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-gold bg-gold/15 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleCompareSchwabFidelity}
            aria-pressed={isCompareMode}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isCompareMode
                ? "border-gold bg-gold/15 text-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {isCompareMode ? "Comparing: Schwab vs Fidelity ✓" : "Compare: Schwab vs Fidelity"}
          </button>
          <button
            onClick={selectAll}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
          <button
            onClick={exportAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold/15 px-3 py-1 text-xs font-semibold text-foreground hover:bg-gold/25"
          >
            <Download className="h-3.5 w-3.5" /> Export all
          </button>
        </div>
      </div>

      {isCompareMode ? <HeadToHeadPanel ref={compareRef} /> : <div ref={compareRef} />}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Totals</h3>
          <ExportButton onClick={exportTotals} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            label="Total referrals"
            value={String(totals.referrals)}
            delta={
              allSelected
                ? "YTD · all sources"
                : `YTD · ${selected.size} of ${SOURCE_FUNNEL.length}`
            }
            up
            icon={Users}
            hint={`Sum of selected source channels.`}
          />
          <KpiCard
            label="Total wins"
            value={String(totals.won)}
            delta={`${totals.referrals ? ((totals.won / totals.referrals) * 100).toFixed(1) : "0.0"}% capture`}
            up
            icon={Trophy}
            hint="End-to-end conversion across selected sources."
          />
          <KpiCard
            label="AUM added"
            value={`$${totals.aumM.toFixed(1)}M`}
            delta="YTD"
            up
            icon={DollarSign}
            hint="Sum of estimated AUM signed per selected source."
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Referrals & wins by source">
          <div className="mb-3 flex justify-end">
            <ExportButton onClick={exportReferralsWins} />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={filteredSources}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" stroke={AXIS} fontSize={12} />
              <YAxis stroke={AXIS} fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "oklch(0.3 0.025 60)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="referrals" fill="oklch(0.55 0.13 200)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="won" fill="oklch(0.82 0.14 82)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="AUM contribution ($M)">
          <div className="mb-3 flex justify-end">
            <ExportButton onClick={exportAum} />
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={filteredSources}
                dataKey="aumM"
                nameKey="name"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
              >
                {filteredSources.map((s) => (
                  <Cell key={s.name} fill={s.color} stroke="oklch(0.98 0.006 85)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: "oklch(0.3 0.025 60)" }}
                labelStyle={{ color: "oklch(0.3 0.025 60)" }}
                formatter={(value: number, name: string) => [`$${value.toFixed(1)}M`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card title="Source performance — full funnel">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredSources.length === SOURCE_FUNNEL.length
              ? "Showing all sources"
              : `Showing ${filteredSources.length} of ${SOURCE_FUNNEL.length} sources`}
          </p>
          <button
            onClick={exportPerformance}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs font-medium text-foreground hover:bg-gold/20"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <Th>Source</Th>
                <Th>Referrals</Th>
                <Th>Qualified</Th>
                <Th>Meetings</Th>
                <Th>Proposals</Th>
                <Th>Won</Th>
                <Th>Capture</Th>
                <Th>AUM</Th>
                <Th>$ / referral</Th>
              </tr>
            </thead>
            <tbody>
              {filteredSources.map((s) => {
                const capture = s.referrals ? (s.won / s.referrals) * 100 : 0;
                const dollarPer = s.referrals ? (s.aumM * 1_000_000) / s.referrals : 0;
                return (
                  <tr key={s.name} className="border-t border-border">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </Td>
                    <Td>{s.referrals}</Td>
                    <Td>{s.qualified}</Td>
                    <Td>{s.meetings}</Td>
                    <Td>{s.proposals}</Td>
                    <Td>{s.won}</Td>
                    <Td>
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                        {capture.toFixed(1)}%
                      </span>
                    </Td>
                    <Td className="font-medium text-foreground">${s.aumM.toFixed(1)}M</Td>
                    <Td className="text-muted-foreground">
                      {dollarPer >= 1_000_000
                        ? `$${(dollarPer / 1_000_000).toFixed(2)}M`
                        : `$${Math.round(dollarPer / 1000)}k`}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {allSelected && (
            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
              Totals reconcile to Fig. 01 (125 referrals → 21 wins · ${REAL_FUNNEL.aumAddedM}M AUM).
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function AdvisorsView() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const actualAumByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of WON_LEADS) {
      const profile = ADVISOR_PROFILES.find((p) => p.id === l.ownerId);
      if (!profile) continue;
      m.set(profile.name, (m.get(profile.name) ?? 0) + l.estAum);
    }
    return m;
  }, []);
  const advisorsWithActualAum = ADVISORS.map((a) => ({
    ...a,
    aum: Number((actualAumByName.get(a.name) ?? 0).toFixed(1)),
  }));
  const podium = advisorsWithActualAum.map((a, i) => ({
    id: ADVISOR_PROFILES[i]?.id ?? a.name,
    name: a.name,
    won: a.won,
    aum: a.aum,
  }));
  const filteredAdvisors = advisorsWithActualAum.filter((a) => matchesQuery(a.name, query));

  type AdvisorSortKey = "name" | "leads" | "meetings" | "proposals" | "won" | "rate" | "aum";
  const [sortKey, setSortKey] = useState<AdvisorSortKey>("aum");
  const [nameDir, setNameDir] = useState<"asc" | "desc">("asc");
  const [numDir, setNumDir] = useState<Record<Exclude<AdvisorSortKey, "name">, "asc" | "desc">>({
    leads: "desc", meetings: "desc", proposals: "desc", won: "desc", rate: "desc", aum: "desc",
  });
  const toggle = (k: AdvisorSortKey) => {
    if (k === "name") { if (sortKey !== "name") { setSortKey("name"); return; } setNameDir((d) => d === "asc" ? "desc" : "asc"); return; }
    if (sortKey !== k) { setSortKey(k); return; }
    setNumDir((prev) => ({ ...prev, [k]: prev[k] === "desc" ? "asc" : "desc" }));
  };
  const sortedAdvisors = [...filteredAdvisors].sort((a, b) => {
    if (sortKey === "name") return nameDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    const val = (x: typeof a) => sortKey === "rate" ? (x.won / x.leads) : (x as any)[sortKey];
    const diff = val(a) - val(b);
    return numDir[sortKey] === "desc" ? -diff : diff;
  });
  const dirLabel = (k: Exclude<AdvisorSortKey, "name">) => numDir[k] === "desc" ? "↓" : "↑";

  return (
    <div className="space-y-6">
      <ScrollReveal>
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Advisor podium — YTD wins
            </h2>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Top three
            </span>
          </div>
          <Podium entries={podium} />
        </div>
      </ScrollReveal>
      <Card
        title="Advisor performance"
        right={<SearchInput value={query} onChange={setQuery} placeholder="Search advisors…" className="w-56" />}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <SortTh label="Advisor" active={sortKey === "name"} dir={nameDir === "asc" ? "A–Z" : "Z–A"} onClick={() => toggle("name")} />
                <SortTh label="Leads" active={sortKey === "leads"} dir={dirLabel("leads")} onClick={() => toggle("leads")} />

                <SortTh label="Meetings" active={sortKey === "meetings"} dir={dirLabel("meetings")} onClick={() => toggle("meetings")} />
                <SortTh label="Proposals" active={sortKey === "proposals"} dir={dirLabel("proposals")} onClick={() => toggle("proposals")} />
                <SortTh label="Won" active={sortKey === "won"} dir={dirLabel("won")} onClick={() => toggle("won")} />
                <SortTh label="Win rate" active={sortKey === "rate"} dir={dirLabel("rate")} onClick={() => toggle("rate")} />
                <SortTh label="AUM ($M)" active={sortKey === "aum"} dir={dirLabel("aum")} onClick={() => toggle("aum")} />
              </tr>
            </thead>
            <tbody>
              {sortedAdvisors.map((a) => {
                const rate = ((a.won / a.leads) * 100).toFixed(1);
                return (
                  <tr key={a.name} className="border-t border-border">
                    <Td>
                      {(() => {
                        const profile = ADVISOR_PROFILES.find((p) => p.name === a.name);
                        const initials = a.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("");
                        const inner = (
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full gold-gradient text-xs font-semibold text-primary-foreground">
                              {initials}
                            </div>
                            <span className="font-medium text-foreground">{a.name}</span>
                          </div>
                        );
                        return profile ? (
                          <Link
                            to="/advisors/$advisorId"
                            params={{ advisorId: profile.id }}
                            className="hover:text-gold"
                          >
                            {inner}
                          </Link>
                        ) : (
                          inner
                        );
                      })()}
                    </Td>
                    <Td>{a.leads}</Td>
                    <Td>{a.meetings}</Td>
                    <Td>{a.proposals}</Td>
                    <Td>{a.won}</Td>
                    <Td>
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                        {rate}%
                      </span>
                    </Td>
                    <Td className="font-medium text-foreground">${a.aum.toFixed(1)}M</Td>
                  </tr>
                );
              })}
              {filteredAdvisors.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No advisors match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AssignmentView() {
  const worst = [...SLA_BY_STAGE].sort((a, b) => a.within - b.within)[0];
  const unassignedCount = LEADS.filter((l) => l.ownerId === "bdo-01" && l.stage !== "Client Won").length;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="AVG SLA handoff"
          value={`${Math.round(SLA_BY_STAGE.reduce((s, x) => s + x.within, 0) / SLA_BY_STAGE.length)}%`}
          delta="7-stage avg"
          up
          icon={Clock}
          hint="Average across every hand-off in the Growth Labs flow."
        />
        <KpiCard
          label="Weakest hand-off"
          value={`${worst.within}%`}
          delta={worst.stage}
          up={false}
          icon={AlertTriangle}
          hint={`Target: ${worst.target}.`}
        />
        <KpiCard
          label="Unassigned leads"
          value={String(unassignedCount)}
          delta="Live"
          up={false}
          icon={UserPlus}
          hint="Leads sitting in a queue without an owner."
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="SLA by handoff (%)">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={SLA_BY_STAGE} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" stroke={AXIS} fontSize={12} domain={[0, 100]} />
              <YAxis type="category" dataKey="stage" stroke={AXIS} fontSize={12} width={140} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: "oklch(0.3 0.025 60)" }}
                formatter={(v: number, name: string) => [`${v}%`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="within" stackId="a" fill="oklch(0.75 0.16 150)" name="Within SLA" />
              <Bar
                dataKey="breached"
                stackId="a"
                fill="oklch(0.65 0.22 25)"
                name="Breached"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Hand-off targets & actuals">
          <ul className="space-y-3 text-sm">
            {SLA_BY_STAGE.map((s) => (
              <li key={s.stage} className="rounded-lg border border-border bg-surface-elevated p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{s.stage}</span>
                  <span
                    className={`text-xs font-semibold ${s.within >= 90 ? "text-[oklch(0.55_0.15_150)]" : s.within >= 85 ? "text-gold" : "text-destructive"}`}
                  >
                    {s.within}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Target: {s.target}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function HealthView() {
  // Derive pipeline health straight from the shared LEADS dataset so every
  // number reconciles with the pipeline, advisor, and lead-detail views.
  const {
    total,
    fresh,
    active,
    aging,
    stalled,
    bottlenecks,
  } = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const open = LEADS.filter((l) => l.stage !== "Client Won");
    const ageDays = (l: typeof open[number]) => {
      const first = l.timeline[0]?.at;
      const t = first ? new Date(first).getTime() : now - l.daysInStage * dayMs;
      return Math.max(0, Math.round((now - t) / dayMs));
    };
    let fresh = 0, active = 0, aging = 0, stalled = 0;
    for (const l of open) {
      const a = ageDays(l);
      if (a < 7) fresh++;
      else if (a < 30) active++;
      else if (a < 60) aging++;
      else stalled++;
    }

    // Bottleneck 1: leads stuck at BDO Research > 5d
    const stuckBdo = open.filter(
      (l) => l.stage === "BDO Research" && l.daysInStage > 5,
    ).length;
    // Bottleneck 2: PlanScout backlog (leads currently in PlanScout Analysis)
    const planscoutBacklog = open.filter((l) => l.stage === "PlanScout Analysis").length;
    // Bottleneck 3: advisors carrying > 20 open leads
    const perAdvisor = new Map<string, number>();
    for (const l of open) perAdvisor.set(l.ownerId, (perAdvisor.get(l.ownerId) ?? 0) + 1);
    const overloaded = [...perAdvisor.entries()].filter(
      ([id, n]) => id !== "bdo-01" && n > 20,
    ).length;
    // Bottleneck 4: Advisor → Discovery SLA (% of Advisor Plan leads not breaching)
    const advisorPlan = open.filter((l) => l.stage === "Advisor Plan");
    const within = advisorPlan.filter((l) => !isBreachingSla(l)).length;
    const slaPct = advisorPlan.length
      ? Math.round((within / advisorPlan.length) * 100)
      : 100;

    const bottlenecks: { title: string; tone: string }[] = [];
    if (stuckBdo > 0)
      bottlenecks.push({
        title: `${stuckBdo} lead${stuckBdo === 1 ? "" : "s"} stuck at BDO Research > 5 days`,
        tone: "text-gold",
      });
    if (planscoutBacklog > 0)
      bottlenecks.push({
        title: `PlanScout intake backlog: ${planscoutBacklog} package${planscoutBacklog === 1 ? "" : "s"}`,
        tone: "text-gold",
      });
    if (overloaded > 0)
      bottlenecks.push({
        title: `${overloaded} advisor${overloaded === 1 ? "" : "s"} above 20-lead workload`,
        tone: "text-[oklch(0.72_0.14_25)]",
      });
    if (slaPct < 90)
      bottlenecks.push({
        title: `Advisor → Discovery SLA at ${slaPct}% (below target)`,
        tone: "text-destructive",
      });
    if (bottlenecks.length === 0)
      bottlenecks.push({ title: "No bottlenecks flagged — pipeline is healthy.", tone: "text-muted-foreground" });

    return { total: open.length, fresh, active, aging, stalled, bottlenecks };
  }, []);

  const buckets: { label: string; value: number; tone: "won" | "hub" | "ai" | "danger" }[] = [
    { label: "Fresh (<1W)", value: fresh, tone: "won" },
    { label: "Active (1W–1M)", value: active, tone: "hub" },
    { label: "Aging (1–2M)", value: aging, tone: "ai" },
    { label: "Stalled (2M+)", value: stalled, tone: "danger" },
  ];
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Open pipeline"
          value={String(total)}
          delta="Active leads"
          up
          icon={Layers}
          hint="Leads not yet Won or Lost."
        />
        <KpiCard
          label="Aging (1–2M)"
          value={String(aging)}
          delta={`${pct(aging).toFixed(0)}% of open`}
          up={false}
          icon={Clock}
          hint="Needs advisor nudge before stalling."
        />
        <KpiCard
          label="Stalled (2M+)"
          value={String(stalled)}
          delta={stalled > 0 ? "Escalate" : "None"}
          up={false}
          icon={AlertTriangle}
          hint="Auto-escalated to team leads."
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Pipeline aging">
          <div className="grid gap-3 sm:grid-cols-2">
            {buckets.map((h) => (
              <div
                key={h.label}
                className="rounded-xl border border-border bg-surface-elevated p-4"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {h.label}
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="font-display text-3xl font-semibold text-foreground">
                    {h.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pct(h.value).toFixed(0)}%
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className={
                      h.tone === "won"
                        ? "h-full bg-[oklch(0.75_0.16_150)]"
                        : h.tone === "hub"
                          ? "h-full bg-[oklch(0.65_0.15_200)]"
                          : h.tone === "ai"
                            ? "h-full bg-gold"
                            : "h-full bg-destructive"
                    }
                    style={{ width: `${pct(h.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Bottlenecks flagged">
          <ul className="space-y-3 text-sm">
            {bottlenecks.map((b) => (
              <li
                key={b.title}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface-elevated p-3"
              >
                <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${b.tone}`} />
                <span>{b.title}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}


// ─── Primitives ──────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  delta,
  up,
  icon: Icon,
  hint,
  spark,
  onClick,
  emphasized,
  muted,
}: {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  spark?: number[];
  onClick?: () => void;
  emphasized?: boolean;
  muted?: boolean;
}) {
  const numeric = parseFloat(value.replace(/[^0-9.-]/g, ""));
  const prefix = /^\$/.test(value) ? "$" : "";
  const suffixMatch = value.match(/[a-zA-Z%]+$/);
  const suffix = suffixMatch ? suffixMatch[0] : "";
  const hasDecimal = value.includes(".");
  const Comp: any = onClick ? "button" : "div";
  const base = "group rounded-2xl border p-4 text-left transition-all";
  const emphasis = emphasized
    ? "border-gold bg-gold/5 shadow-sm"
    : muted
    ? "border-border bg-surface"
    : "border-border bg-surface";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`${base} ${emphasis} ${onClick ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50" : ""}`}
      title={hint}
    >

      <div className="flex items-center justify-between">
        <div className={`text-xs uppercase tracking-wider ${emphasized ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</div>
        <Icon className={`h-4 w-4 ${emphasized ? "text-gold" : "text-gold"} transition-transform group-hover:scale-110`} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2 overflow-hidden">
        <div className={`min-w-0 truncate font-display text-2xl ${emphasized ? "font-bold" : "font-semibold"} text-foreground`}>

          {Number.isFinite(numeric) ? (
            <AnimatedCounter
              value={numeric}
              decimals={hasDecimal ? 1 : 0}
              prefix={prefix}
              suffix={suffix}
            />
          ) : (
            value
          )}
        </div>
        {spark && <div className="shrink-0"><Sparkline data={spark} width={56} /></div>}
      </div>
      <div
        className={`mt-1 inline-flex items-center gap-1 text-xs ${up ? "text-[oklch(0.78_0.16_150)]" : "text-destructive"}`}
      >
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {delta}
      </div>
      {hint && <div className="mt-2 text-[11px] leading-snug text-muted-foreground">{hint}</div>}
    </Comp>
  );
}


function Card({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 text-foreground/80 ${className}`}>{children}</td>;
}

function LeadNameButton({ leadId, name, from = "pipeline", returnTab, className = "" }: { leadId: string; name: string; from?: "pipeline" | "won"; returnTab?: string; className?: string }) {
  const { openLead } = useLeadTab();
  return (
    <button
      type="button"
      onClick={() => {
        openLead(leadId, from, returnTab ? { returnTab } : undefined);
      }}
      className={`text-left ${className}`}
    >
      {name}
    </button>
  );
}

const tooltipStyle = {
  backgroundColor: "oklch(0.98 0.006 85)",
  border: "1px solid oklch(0.78 0.036 82 / 0.6)",
  borderRadius: 4,
  fontSize: 12,
  color: "oklch(0.3 0.025 60)",
} as const;

// ─── Geographic & Branch (spec #7) ───────────────────────────────────────
const BRANCH_COLORS = ["oklch(0.75 0.14 82)", "oklch(0.62 0.14 60)", "oklch(0.55 0.09 45)"];

export function branchSlug(name: string): string {
  return encodeURIComponent(name);
}

// ─── Branch Details: SEIA physical office directory
function OfficesView() {
  const [query, setQuery] = useState("");
  type OSortKey = "name" | "city" | "state" | "team" | "leads" | "won" | "aum";
  const [sortKey, setSortKey] = useState<OSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [stateFilter, setStateFilter] = useState<string>("All");

  const states = useMemo(
    () => Array.from(new Set(OFFICES.map((o) => o.state))).sort(),
    [],
  );

  const metricsByOffice = useMemo(() => {
    const m = new Map<string, { leads: number; won: number; aum: number }>();
    for (const o of OFFICES) {
      m.set(o.name, { leads: 0, won: 0, aum: 0 });
    }
    for (const l of ENRICHED_LEADS) {
      if (!isBranchStage(l.stage)) continue;
      const office = officeForLead(l);
      const cur = m.get(office.name) ?? { leads: 0, won: 0, aum: 0 };
      if (l.stage === "Client Won") {
        cur.won += 1;
        cur.aum += l.estAum;
      } else {
        cur.leads += 1;
      }
      m.set(office.name, cur);
    }
    return m;
  }, []);

  const filtered = useMemo(() => {
    const out = OFFICES.map((o) => ({
      ...o,
      metrics: metricsByOffice.get(o.name) ?? { leads: 0, won: 0, aum: 0 },
    })).filter(
      (o) =>
        (stateFilter === "All" || o.state === stateFilter) &&
        matchesQuery(`${o.name} ${o.city} ${o.state} ${o.zip} ${o.street}`, query),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "city":
          return a.city.localeCompare(b.city) * dir;
        case "state":
          return a.state.localeCompare(b.state) * dir;
        case "team":
          return (a.teamSize - b.teamSize) * dir;
        case "leads":
          return (a.metrics.leads - b.metrics.leads) * dir;
        case "won":
          return (a.metrics.won - b.metrics.won) * dir;
        case "aum":
          return (a.metrics.aum - b.metrics.aum) * dir;
      }
    });
    return out;
  }, [query, sortKey, sortDir, stateFilter, metricsByOffice]);

  const toggle = (k: OSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "team" || k === "leads" || k === "won" || k === "aum" ? "desc" : "asc");
    }
  };
  const dirLabel = (k: OSortKey) =>
    sortKey !== k ? "" : sortDir === "asc" ? "Asc" : "Desc";

  const totalTeam = OFFICES.reduce((s, o) => s + o.teamSize, 0);
  const totalLeads = filtered.reduce((s, o) => s + o.metrics.leads, 0);
  const totalWon = filtered.reduce((s, o) => s + o.metrics.won, 0);
  const totalAum = filtered.reduce((s, o) => s + o.metrics.aum, 0);

  const exportRows = () => {
    downloadCsv(`branch-details-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Branch", "Address", "Suite", "City", "State", "ZIP", "Phone", "Fax", "Team size", "Pipeline leads", "Clients Won", "AUM ($M)"],
      ...filtered.map((o) => [
        o.hq ? `${o.name} (HQ)` : o.name,
        o.street,
        o.suite ?? "",
        o.city,
        o.state,
        o.zip,
        o.phone,
        o.fax ?? "",
        o.teamSize,
        o.metrics.leads,
        o.metrics.won,
        o.metrics.aum.toFixed(2),
      ]),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat
          label="Branches"
          value={
            filtered.length === OFFICES.length
              ? OFFICES.length.toString()
              : `${filtered.length} / ${OFFICES.length}`
          }
          hint="SEIA physical offices. Shows matching / total when a search or state filter is active."
        />
        <MiniStat label="States" value={states.length.toString()} hint="Distinct states with a SEIA office." />
        <MiniStat label="Team members" value={totalTeam.toString()} hint="Headcount across all offices." />
        <MiniStat
          label="Pipeline leads"
          value={totalLeads.toString()}
          hint="Open leads at the shown branches sitting in Advisor Plan or Discovery Meeting."
        />
        <MiniStat
          label="Clients won"
          value={totalWon.toString()}
          hint="Leads onboarded as SEIA clients at the shown branches."
        />
        <MiniStat
          label="Client AUM"
          value={`$${totalAum.toFixed(1)}M`}
          hint="Assets of won clients at the shown branches."
        />
      </div>
      <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Branch figures only count leads an advisor already owns —{" "}
        <span className="text-foreground">Advisor Plan, Discovery Meeting, and Client Won</span>. Upstream stages
        (Referral Intake, SEIA CRM Intake, BDO Research, CRM Handoff, PlanScout Analysis) are not tied to a physical
        office yet, so they live under <span className="text-foreground">Source details</span>.
      </p>
      <Card title="Branch footprint">
        <p className="mb-3 text-xs text-muted-foreground">
          Every SEIA office on the map. Hover a dot for the office snapshot, click it to open the full branch page.
        </p>
        <OfficeMap
          offices={filtered.map((o) => ({
            ...o,
            leads: o.metrics.leads,
            won: o.metrics.won,
            aum: o.metrics.aum,
          }))}
        />
      </Card>
      <Card
        title="Branch details"

        right={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search branches…"
              className="w-56"
            />
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground"
            >
              <option value="All">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportRows}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-elevated"
            >
              Export CSV
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <SortTh label="Branch" active={sortKey === "name"} dir={dirLabel("name")} onClick={() => toggle("name")} />
                <Th>Address</Th>
                <SortTh label="City" active={sortKey === "city"} dir={dirLabel("city")} onClick={() => toggle("city")} />
                <SortTh label="State" active={sortKey === "state"} dir={dirLabel("state")} onClick={() => toggle("state")} />
                <Th>Contact</Th>
                <SortTh label="Team" active={sortKey === "team"} dir={dirLabel("team")} onClick={() => toggle("team")} />
                <SortTh label="Pipeline leads" active={sortKey === "leads"} dir={dirLabel("leads")} onClick={() => toggle("leads")} />
                <SortTh label="Clients Won" active={sortKey === "won"} dir={dirLabel("won")} onClick={() => toggle("won")} />
                <SortTh label="AUM ($M)" active={sortKey === "aum"} dir={dirLabel("aum")} onClick={() => toggle("aum")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((o) => (
                <tr key={o.name} className="hover:bg-surface-elevated/50">
                  <Td className="font-medium text-foreground">
                    <Link
                      to="/offices/$officeId"
                      params={{ officeId: officeSlug(o.name) }}
                      className="text-foreground hover:text-gold hover:underline"
                    >
                      {o.name}
                    </Link>
                    {o.hq && (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        HQ
                      </span>
                    )}
                  </Td>
                  <Td className="text-muted-foreground">
                    <div>{o.street}</div>
                    {o.suite && <div>{o.suite}</div>}
                    <a
                      href={officeMapsUrl(o)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-foreground underline"
                    >
                      Get directions
                    </a>
                  </Td>
                  <Td>{o.city}</Td>
                  <Td className="text-muted-foreground">
                    {o.state} {o.zip}
                  </Td>
                  <Td className="text-muted-foreground">
                    <div>P. {o.phone}</div>
                    {o.fax && <div>F. {o.fax}</div>}
                  </Td>
                  <Td>Team of {o.teamSize}</Td>
                  <Td>
                    {o.metrics.leads > 0 ? (
                      <Link
                        to="/offices/$officeId"
                        params={{ officeId: officeSlug(o.name) }}
                        search={{ focus: "pipeline" } as never}
                        className="text-foreground hover:text-gold hover:underline"
                        title={`Open ${o.name} pipeline leads`}
                      >
                        {o.metrics.leads}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </Td>
                  <Td>
                    {o.metrics.won > 0 ? (
                      <Link
                        to="/offices/$officeId"
                        params={{ officeId: officeSlug(o.name) }}
                        search={{ focus: "won" } as never}
                        className="text-foreground hover:text-gold hover:underline"
                        title={`Open ${o.name} clients won`}
                      >
                        {o.metrics.won}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </Td>
                  <Td>${o.metrics.aum.toFixed(2)}M</Td>

                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No branches match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BranchesView() {
  const [query, setQuery] = useState("");
  type SortKey = "branch" | "region" | "referrals" | "won" | "aum" | "rate";
  const [sortKey, setSortKey] = useState<SortKey>("aum");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const m = new Map<
      string,
      { branch: string; region: string; referrals: number; won: number; aum: number }
    >();
    // Seed every canonical branch so empty branches still appear.
    for (const b of BRANCHES) {
      m.set(b.name, { branch: b.name, region: b.region, referrals: 0, won: 0, aum: 0 });
    }
    for (const l of ENRICHED_LEADS) {
      const r = m.get(l.branch) ?? {
        branch: l.branch,
        region: l.region,
        referrals: 0,
        won: 0,
        aum: 0,
      };
      r.referrals += 1;
      if (l.stage === "Client Won") {
        r.won += 1;
        r.aum += l.estAum;
      }
      m.set(l.branch, r);
    }
    return [...m.values()];
  }, []);

  const filtered = useMemo(() => {
    const out = rows.filter(
      (r) => matchesQuery(`${r.branch} ${r.region}`, query),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      switch (sortKey) {
        case "branch":
          return a.branch.localeCompare(b.branch) * dir;
        case "region":
          return a.region.localeCompare(b.region) * dir;
        case "referrals":
          return (a.referrals - b.referrals) * dir;
        case "won":
          return (a.won - b.won) * dir;
        case "aum":
          return (a.aum - b.aum) * dir;
        case "rate": {
          const ra = a.referrals === 0 ? 0 : a.won / a.referrals;
          const rb = b.referrals === 0 ? 0 : b.won / b.referrals;
          return (ra - rb) * dir;
        }
      }
    });
    return out;
  }, [rows, query, sortKey, sortDir]);

  const toggle = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "branch" || k === "region" ? "asc" : "desc");
    }
  };
  const dirLabel = (k: SortKey) =>
    sortKey !== k ? "" : sortDir === "asc" ? "Asc" : "Desc";

  const totalRef = rows.reduce((s, r) => s + r.referrals, 0);
  const totalAum = rows.reduce((s, r) => s + r.aum, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MiniStat label="Sources" value={rows.length.toString()} />
        <MiniStat label="Referrals" value={totalRef.toString()} />
        <MiniStat label="AUM ($M)" value={`$${totalAum.toFixed(1)}M`} />
      </div>
      <Card
        title="Source details"
        right={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search sources…"
            className="w-56"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <SortTh label="Source" active={sortKey === "branch"} dir={dirLabel("branch")} onClick={() => toggle("branch")} />
                <SortTh label="Region" active={sortKey === "region"} dir={dirLabel("region")} onClick={() => toggle("region")} />
                <SortTh label="Referrals" active={sortKey === "referrals"} dir={dirLabel("referrals")} onClick={() => toggle("referrals")} />
                <SortTh label="AUM ($M)" active={sortKey === "aum"} dir={dirLabel("aum")} onClick={() => toggle("aum")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => {
                return (
                  <tr key={b.branch} className="hover:bg-surface-elevated/50">
                    <Td>
                      <Link
                        to="/branches/$branchId"
                        params={{ branchId: branchSlug(b.branch) }}
                        className="text-foreground hover:text-gold hover:underline"
                      >
                        {b.branch}
                      </Link>
                    </Td>
                    <Td className="text-muted-foreground">{b.region}</Td>
                    <Td>{b.referrals}</Td>
                    <Td className="font-medium text-foreground">${b.aum.toFixed(1)}M</Td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No sources match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4" title={hint}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</div>}
    </div>
  );
}



function GeoView() {
  const byBranch = useMemo(() => {
    const m = new Map<string, { branch: string; referrals: number; won: number; aum: number }>();
    for (const b of BRANCHES) {
      m.set(b.name, { branch: b.name, referrals: 0, won: 0, aum: 0 });
    }
    for (const l of ENRICHED_LEADS) {
      const r = m.get(l.branch) ?? { branch: l.branch, referrals: 0, won: 0, aum: 0 };
      r.referrals += 1;
      if (l.stage === "Client Won") {
        r.won += 1;
        r.aum += l.estAum;
      }
      m.set(l.branch, r);
    }
    return [...m.values()].sort((a, b) => b.referrals - a.referrals);
  }, []);

  const byRegion = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of ENRICHED_LEADS) m.set(l.region, (m.get(l.region) ?? 0) + 1);
    return [...m.entries()].map(([region, count]) => ({ region, count }));
  }, []);

  const byProgram = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of ENRICHED_LEADS) m.set(l.program, (m.get(l.program) ?? 0) + l.estAum);
    return [...m.entries()].map(([program, aum]) => ({ program, aum: Number(aum.toFixed(1)) }));
  }, []);

  const regionTotal = byRegion.reduce((s, r) => s + r.count, 0);

  const [selectedBranch, setSelectedBranch] = useState<
    { branch: string; referrals: number; won: number; aum: number } | null
  >(null);
  const totalRefs = byBranch.reduce((s, b) => s + b.referrals, 0);
  const totalWon = byBranch.reduce((s, b) => s + b.won, 0);

  const exportGeo = () =>
    downloadCsv(`geo-sources-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Source", "Referrals", "Won", "AUM ($M)"],
      ...byBranch.map((b) => [b.branch, b.referrals, b.won, b.aum.toFixed(1)]),
    ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButton onClick={exportGeo} />
      </div>
      <Card title="US referral source footprint — pulse by AUM">
        <USBranchMap
          branches={byBranch.filter((b) => !/Website|Referral/.test(b.branch)).slice(0, 12)}
        />
      </Card>
      <div className="space-y-6">
        <Card title="Referrals & wins by source">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={byBranch}
              layout="vertical"
              margin={{ left: 20 }}
              onClick={(e: any) => {
                const label = e?.activeLabel;
                if (!label) return;
                const b = byBranch.find((x) => x.branch === label);
                if (b) setSelectedBranch(b);
              }}
            >
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" stroke={AXIS} fontSize={11} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="branch"
                stroke={AXIS}
                fontSize={10}
                width={180}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  return (
                    <text
                      x={x}
                      y={y}
                      dy={4}
                      textAnchor="end"
                      fontSize={10}
                      fill={AXIS}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        const b = byBranch.find((x) => x.branch === payload.value);
                        if (b) setSelectedBranch(b);
                      }}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "oklch(0.3 0.025 60)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="referrals"
                fill="oklch(0.62 0.14 60)"
                name="Referrals"
                radius={[0, 4, 4, 0]}
                style={{ cursor: "pointer" }}
              />
              <Bar
                dataKey="won"
                fill="oklch(0.55 0.13 145)"
                name="Won"
                radius={[0, 4, 4, 0]}
                style={{ cursor: "pointer" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        {selectedBranch && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
            onClick={() => setSelectedBranch(null)}
          >
            <div
              className="relative w-[min(460px,90%)] rounded-xl border border-border bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedBranch(null)}
                aria-label="Close details"
                className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Source detail</div>
              <Link
                to="/branches/$branchId"
                params={{ branchId: selectedBranch.branch }}
                search={{ from: "geo" } as never}
                className="mt-1 block font-display text-2xl text-foreground hover:text-gold hover:underline"
              >
                {selectedBranch.branch}
              </Link>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Referrals</div>
                  <div className="font-display text-lg text-foreground">{selectedBranch.referrals}</div>
                </div>
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Won</div>
                  <div className="font-display text-lg text-foreground">{selectedBranch.won}</div>
                </div>
                <div className="rounded-md border border-border bg-surface px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AUM</div>
                  <div className="font-display text-lg text-foreground">${selectedBranch.aum.toFixed(1)}M</div>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between border-b border-border/60 pb-1">
                  <span>Conversion</span>
                  <span className="font-medium text-foreground">
                    {selectedBranch.referrals ? ((selectedBranch.won / selectedBranch.referrals) * 100).toFixed(1) : "0"}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1">
                  <span>Avg AUM / win</span>
                  <span className="font-medium text-foreground">
                    {selectedBranch.won ? `$${(selectedBranch.aum / selectedBranch.won).toFixed(2)}M` : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border/60 pb-1">
                  <span>Share of referrals</span>
                  <span className="font-medium text-foreground">
                    {totalRefs ? ((selectedBranch.referrals / totalRefs) * 100).toFixed(1) : "0"}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Share of wins</span>
                  <span className="font-medium text-foreground">
                    {totalWon ? ((selectedBranch.won / totalWon) * 100).toFixed(1) : "0"}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="AUM by program ($M)">
            <div className="aum-by-program-chart">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={byProgram}
                    dataKey="aum"
                    nameKey="program"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {byProgram.map((_, i) => (
                      <Cell
                        key={i}
                        fill={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                        stroke="oklch(0.98 0.006 85)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "oklch(0.3 0.025 60)" }}
                    formatter={(v: number, n: string) => [`$${v}M`, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Region distribution">
            <div className="space-y-3">
              {byRegion.map((r) => (
                <div key={r.region}>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{r.region}</span>
                    <span className="text-muted-foreground">
                      {r.count} leads · {Math.round((r.count / regionTotal) * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-elevated">
                    <div
                      className="h-full gold-gradient"
                      style={{ width: `${(r.count / regionTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}

// ─── Advisor Activity (spec #8) ──────────────────────────────────────────
function ActivityView() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const q = query.trim().toLowerCase();
  const allRows = ADVISOR_ACTIVITY.map((a) => {
    const profile = ADVISOR_PROFILES.find((p) => p.id === a.advisorId);
    return { ...a, name: profile?.name ?? a.advisorId };
  });
  const statusOf = (r: typeof allRows[number]) =>
    r.avgResponseHrs < 5 && r.outstanding < 6 ? "On pace" : "Needs attention";
  const filteredRows = allRows.filter(
    (r) =>
      matchesQuery(r.name, query) &&
      (statusFilter.length === 0 || statusFilter.includes(statusOf(r))),
  );
  const totalTouch = allRows.reduce((s, r) => s + r.touchpoints7d, 0);
  const totalMeet = allRows.reduce((s, r) => s + r.meetings30d, 0);
  const totalOut = allRows.reduce((s, r) => s + r.outstanding, 0);
  const avgResp = (allRows.reduce((s, r) => s + r.avgResponseHrs, 0) / allRows.length).toFixed(1);

  type ActSortKey = "name" | "touchpoints7d" | "meetings30d" | "avgResponseHrs" | "outstanding" | "status";
  const [sortKey, setSortKey] = useState<ActSortKey>("touchpoints7d");
  const [nameDir, setNameDir] = useState<"asc" | "desc">("asc");
  const [statusDir, setStatusDir] = useState<"asc" | "desc">("asc");
  const [numDir, setNumDir] = useState<Record<Exclude<ActSortKey, "name" | "status">, "asc" | "desc">>({
    touchpoints7d: "desc", meetings30d: "desc", avgResponseHrs: "asc", outstanding: "asc",
  });
  const toggle = (k: ActSortKey) => {
    if (k === "name") { if (sortKey !== "name") { setSortKey("name"); return; } setNameDir((d) => d === "asc" ? "desc" : "asc"); return; }
    if (k === "status") { if (sortKey !== "status") { setSortKey("status"); return; } setStatusDir((d) => d === "asc" ? "desc" : "asc"); return; }
    if (sortKey !== k) { setSortKey(k); return; }
    setNumDir((prev) => ({ ...prev, [k]: prev[k] === "desc" ? "asc" : "desc" }));
  };
  const rows = [...filteredRows].sort((a, b) => {
    if (sortKey === "name") return nameDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if (sortKey === "status") {
      const cmp = statusOf(a).localeCompare(statusOf(b));
      return statusDir === "asc" ? cmp : -cmp;
    }
    const diff = (a as any)[sortKey] - (b as any)[sortKey];
    return numDir[sortKey] === "desc" ? -diff : diff;
  });
  const dirLabel = (k: Exclude<ActSortKey, "name" | "status">) => numDir[k] === "desc" ? "↓" : "↑";

  const exportActivity = () =>
    downloadCsv(`advisor-activity-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Advisor", "Touchpoints (1W)", "Meetings (1M)", "Avg response (h)", "Outstanding", "Status"],
      ...rows.map((r) => [r.name, r.touchpoints7d, r.meetings30d, r.avgResponseHrs, r.outstanding, statusOf(r)]),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportButton onClick={exportActivity} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Touchpoints (1W)"
          value={String(totalTouch)}
          delta="+12%"
          up
          icon={Activity}
        />
        <KpiCard label="Meetings (1M)" value={String(totalMeet)} delta="+8%" up icon={Calendar} />
        <KpiCard label="Avg response" value={`${avgResp}h`} delta="-0.6h" up icon={Clock} />
        <KpiCard
          label="Outstanding actions"
          value={String(totalOut)}
          delta="+3"
          up={false}
          icon={AlertTriangle}
        />
      </div>
      <Card
        title="Advisor engagement"
        right={
          <div className="flex items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search advisors…" className="w-56" />
            <MultiSelect
              values={statusFilter}
              onChange={setStatusFilter}
              options={["On pace", "Needs attention"]}
              allLabel="All statuses"
              singularLabel="statuses"
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <SortTh label="Advisor" active={sortKey === "name"} dir={nameDir === "asc" ? "A–Z" : "Z–A"} onClick={() => toggle("name")} />
                <SortTh label="Touchpoints (1W)" active={sortKey === "touchpoints7d"} dir={dirLabel("touchpoints7d")} onClick={() => toggle("touchpoints7d")} />
                <SortTh label="Meetings (1M)" active={sortKey === "meetings30d"} dir={dirLabel("meetings30d")} onClick={() => toggle("meetings30d")} />
                <SortTh label="Avg response" active={sortKey === "avgResponseHrs"} dir={dirLabel("avgResponseHrs")} onClick={() => toggle("avgResponseHrs")} />
                <SortTh label="Outstanding" active={sortKey === "outstanding"} dir={dirLabel("outstanding")} onClick={() => toggle("outstanding")} />
                <SortTh label="Status" active={sortKey === "status"} dir={statusDir === "asc" ? "A–Z" : "Z–A"} onClick={() => toggle("status")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = statusOf(r);
                const onPace = status === "On pace";
                return (
                  <tr key={r.advisorId} className="border-t border-border">
                    <Td>
                      <Link
                        to="/advisors/$advisorId"
                        params={{ advisorId: r.advisorId }}
                        search={{ from: "activity" as const }}
                        className="font-medium text-foreground hover:text-gold"
                      >
                        {r.name}
                      </Link>
                    </Td>
                    <Td>{r.touchpoints7d}</Td>
                    <Td>{r.meetings30d}</Td>
                    <Td>{r.avgResponseHrs.toFixed(1)}h</Td>
                    <Td>{r.outstanding}</Td>
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          onPace
                            ? "border-emerald-700/30 bg-emerald-700/10 text-emerald-800"
                            : "border-amber-700/30 bg-amber-700/10 text-amber-800"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${onPace ? "bg-emerald-700" : "bg-amber-700"}`}
                        />
                        {status}
                      </span>
                    </Td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No advisors match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


const HeadToHeadPanel = forwardRef<HTMLDivElement>((_props, ref) => {
  const schwab = SOURCE_FUNNEL.find((s) => s.name === "Schwab")!;
  const fidelity = SOURCE_FUNNEL.find((s) => s.name === "Fidelity")!;

  const stat = (s: typeof schwab) => {
    const capture = s.referrals ? (s.won / s.referrals) * 100 : 0;
    const dollarPer = s.referrals ? (s.aumM * 1_000_000) / s.referrals : 0;
    return { capture, dollarPer };
  };
  const a = stat(schwab);
  const b = stat(fidelity);

  const captureDelta = a.capture - b.capture;
  const aumDelta = schwab.aumM - fidelity.aumM;
  const winner =
    captureDelta === 0
      ? "Even on capture rate"
      : captureDelta > 0
        ? `Schwab leads by +${captureDelta.toFixed(1)} pts capture, ${aumDelta >= 0 ? "+" : ""}$${aumDelta.toFixed(1)}M AUM`
        : `Fidelity leads by +${(-captureDelta).toFixed(1)} pts capture, ${aumDelta <= 0 ? "+" : ""}$${(-aumDelta).toFixed(1)}M AUM`;

  const Column = ({ src, s }: { src: typeof schwab; s: ReturnType<typeof stat> }) => (
    <div className="flex flex-col gap-2 p-5">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: src.color }} />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {src.name}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2">
        <Stat label="Referrals" value={String(src.referrals)} />
        <Stat label="Won" value={`${src.won} · ${s.capture.toFixed(1)}%`} />
        <Stat label="AUM" value={`$${src.aumM.toFixed(1)}M`} />
        <Stat label="$ / referral" value={`$${Math.round(s.dollarPer / 1000)}K`} />
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-gold/60 bg-gradient-to-br from-gold/10 via-surface to-surface shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-gold/30 bg-gold/10 px-5 py-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-foreground">
          Head-to-head · Schwab vs Fidelity
        </span>
      </div>
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <Column src={schwab} s={a} />
        <Column src={fidelity} s={b} />
      </div>
      <div className="border-t border-border bg-background/50 px-5 py-2 text-xs font-medium text-foreground">
        {winner}
      </div>
    </div>
  );
});
HeadToHeadPanel.displayName = "HeadToHeadPanel";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

// ─── Spreadsheet helper (real .xlsx with auto column widths) ─────────────
function downloadCsv(filename: string, rows: (string | number)[][]) {
  // Filename may still end in .csv from earlier code — force .xlsx.
  const outName = filename.replace(/\.csv$/i, "") + ".xlsx";
  // Lazy import so the xlsx bundle only loads when a user exports.
  import("xlsx").then((XLSX) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Auto-fit column widths based on the longest cell in each column.
    const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const cols: { wch: number }[] = [];
    for (let c = 0; c < colCount; c++) {
      let max = 10;
      for (const r of rows) {
        const v = r[c];
        if (v == null) continue;
        const len = String(v).length;
        if (len > max) max = len;
      }
      cols.push({ wch: Math.min(max + 2, 60) });
    }
    ws["!cols"] = cols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, outName);
  });
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <Download className="h-3 w-3" /> Export CSV
    </button>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface-elevated py-1 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
      />
    </div>
  );
}



// ─── Pipeline Overview (new default tab) ─────────────────────────────────
function OverviewView() {
  const { openPipeline } = useLeadTab();

  const total = ENRICHED_LEADS.length;
  const won = ENRICHED_LEADS.filter((l) => l.stage === "Client Won").length;
  const open = total - won;
  const pipeAum = ENRICHED_LEADS.filter((l) => l.stage !== "Client Won").reduce(
    (s, l) => s + l.estAum,
    0,
  );
  const clientAum = ENRICHED_LEADS.filter((l) => l.stage === "Client Won").reduce(
    (s, l) => s + l.estAum,
    0,
  );
  const breaches = ENRICHED_LEADS.filter(
    (l) => l.daysInStage > 4 && l.stage !== "Client Won",
  ).length;

  const stageCounts = ENRICHED_LEADS.reduce<Record<string, number>>((acc, l) => {
    acc[l.stage] = (acc[l.stage] ?? 0) + 1;
    return acc;
  }, {});
  const stageOrder = [
    "Referral Intake",
    "SEIA CRM Intake",
    "BDO Research",
    "CRM Handoff",
    "PlanScout Analysis",
    "Advisor Plan",
    "Discovery Meeting",
    "Client Won",
  ];
  const maxCount = Math.max(...Object.values(stageCounts), 1);

  const hotLeads = [...ENRICHED_LEADS]
    .filter((l) => l.stage !== "Client Won")
    .sort((a, b) => b.estAum - a.estAum)
    .slice(0, 5);

  const exportOverview = () => {
    const today = new Date().toISOString().slice(0, 10);
    const summaryRows = [
      ["Metric", "Value"],
      ["Open leads", open],
      ["Won leads", won],
      ["Total tracked", total],
      ["Pipeline AUM ($M)", pipeAum.toFixed(1)],
      ["Client AUM ($M)", clientAum.toFixed(1)],
      ["Capture rate %", total ? ((won / total) * 100).toFixed(1) : "0.0"],
      ["SLA breaches", breaches],
    ];
    const stageRows = [["Stage", "Count"], ...stageOrder.map((s) => [s, stageCounts[s] ?? 0])];
    const leadRows = [
      ["Lead", "Source", "Stage", "Owner", "Days in stage", "Est. AUM ($M)"],
      ...hotLeads.map((l) => [
        l.name,
        l.source,
        l.stage,
        ownerName(l.ownerId),
        l.daysInStage,
        l.estAum.toFixed(1),
      ]),
    ];
    downloadCsv(`pipeline-overview-${today}.csv`, [
      ["Pipeline Overview"],
      [`Generated: ${today}`],
      [],
      ...summaryRows,
      [],
      ...stageRows,
      [],
      ["Top 5 open leads by est. AUM"],
      ...leadRows,
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Pipeline overview</h2>
        <ExportButton onClick={exportOverview} />
      </div>

      {/* Reconciliation strip — every card on this dashboard derives from the
          same LEADS dataset, so the identities below are always true. */}
      <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Totals reconcile:</span>{" "}
        <span className="font-mono">{total}</span> tracked ={" "}
        <span className="font-mono">{open}</span> open +{" "}
        <span className="font-mono">{won}</span> won{"  ·  "}
        <span className="font-mono">${pipeAum.toFixed(1)}M</span> pipeline AUM +{" "}
        <span className="font-mono">${clientAum.toFixed(1)}M</span> client AUM ={" "}
        <span className="font-mono">${(pipeAum + clientAum).toFixed(1)}M</span> tracked AUM.
      </div>


      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="Open leads"
          value={String(open)}
          delta={`${won} won`}
          up
          icon={Users}
          hint={`${total} tracked leads · ${open} still active, ${won} already signed. Click to open Pipeline Leads.`}
          onClick={() => openPipeline?.()}
          emphasized
        />

        <KpiCard
          label="Pipeline AUM"
          value={`$${pipeAum.toFixed(1)}M`}
          delta="+8%"
          up
          icon={DollarSign}
          hint={`Sum of estimated AUM across ${open} open leads (excludes ${won} won).`}
          muted
        />
        <KpiCard
          label="Client AUM"
          value={`$${clientAum.toFixed(1)}M`}
          delta={`${won} won`}
          up
          icon={Trophy}
          hint={`Total booked AUM from ${won} clients that reached Client Won.`}
          muted
        />
        <KpiCard
          label="Capture rate"
          value={`${((REAL_FUNNEL.wonClients / REAL_FUNNEL.referrals) * 100).toFixed(1)}%`}
          delta="+1.2pp"
          up
          icon={Trophy}
          hint={`${REAL_FUNNEL.wonClients} of ${REAL_FUNNEL.referrals} referrals YTD have reached Client Won.`}
          muted
        />
        <KpiCard
          label="SLA breaches"
          value={String(breaches)}
          delta={breaches > 2 ? "watch" : "ok"}
          up={breaches <= 2}
          icon={AlertTriangle}
          hint={`Open leads sitting > 4 days in their current stage. Click to view them in Pipeline Leads.`}
          onClick={() => openPipeline?.({ slaOnly: true })}
          emphasized
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Pipeline by stage */}
        <Card title="Pipeline by stage">
          <div className="space-y-2.5">
            {stageOrder.map((s) => {
              const c = stageCounts[s] ?? 0;
              return (
                <div key={s} className="grid grid-cols-[160px_1fr_40px] items-center gap-3">
                  <div className="text-sm text-muted-foreground">{s}</div>
                  <div className="relative h-6 overflow-hidden rounded bg-surface-elevated">
                    <div
                      className="h-full gold-gradient transition-all"
                      style={{
                        width: `${(c / maxCount) * 100}%`,
                        opacity: 0.4 + (c / maxCount) * 0.6,
                      }}
                    />
                  </div>
                  <div className="text-right text-sm font-medium text-foreground">{c}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick-action widgets */}
        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={UserPlus} label="Add lead" hint="Manual entry" />
            <QuickAction icon={PhoneCall} label="Log call" hint="Attach to lead" />
            <QuickAction icon={Calendar} label="Book discovery" hint="Assigned advisor" />
            <QuickAction icon={Zap} label="Hot-lead alerts" hint="Configure" />
          </div>
        </Card>
      </div>

      {/* Top hot leads */}
      <Card title="Top 5 open leads by est. AUM">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <Th>Lead/Client</Th>
                <Th>Source</Th>
                <Th>Stage</Th>
                <Th>Owner</Th>
                <Th>Days</Th>
                <Th>Est. AUM</Th>
              </tr>
            </thead>
            <tbody>
              {hotLeads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <Td>
                    <LeadNameButton leadId={l.id} name={l.name} returnTab="overview" className="font-medium text-foreground hover:text-gold" />

                  </Td>
                  <Td>{l.source}</Td>
                  <Td>{l.stage}</Td>
                  <Td>{ownerName(l.ownerId)}</Td>
                  <Td>{l.daysInStage}d</Td>
                  <Td className="font-medium text-foreground">${l.estAum.toFixed(1)}M</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}


function LeadBackButton({ advisorReturn, fromBranch, fromOffice, defaultLabel, onCloseLead }: { advisorReturn: string | null; fromBranch?: string | null; fromOffice?: string | null; defaultLabel: string; onCloseLead: () => void }) {
  const router = useRouter();
  const advisor = advisorReturn ? ADVISOR_PROFILES.find((a) => a.id === advisorReturn) : null;

  // Arrived from another page (source/branch details, advisor profile, etc.).
  const cameFromElsewhere = !!advisor || !!fromBranch || !!fromOffice;

  // Always resolve the exact originating route from the URL context, so the
  // control behaves identically on a fresh load, a refresh, or a pasted URL.
  const goBack = useCallback(() => {
    if (advisor) {
      router.navigate({
        to: "/advisors/$advisorId",
        params: { advisorId: advisor.id },
        search: ({ ...(fromBranch ? { fromBranch } : {}), ...(fromOffice ? { fromOffice } : {}) }) as never,
      });
      return;
    }
    if (fromOffice) {
      router.navigate({ to: "/offices/$officeId", params: { officeId: fromOffice } });
      return;
    }
    if (fromBranch) {
      router.navigate({ to: "/branches/$branchId", params: { branchId: fromBranch } });
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    onCloseLead();
  }, [advisor, fromBranch, fromOffice, onCloseLead, router]);


  useBackShortcut(cameFromElsewhere ? goBack : onCloseLead);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <button
        type="button"
        onClick={cameFromElsewhere ? goBack : onCloseLead}
        title="Alt + ←"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {cameFromElsewhere ? "Back" : defaultLabel}
        <span className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider sm:inline">
          Alt + ←
        </span>
      </button>
      {cameFromElsewhere && defaultLabel !== "Back" && (
        <button
          type="button"
          onClick={onCloseLead}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {defaultLabel}
        </button>
      )}
    </div>
  );
}


function SortTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: string; onClick: () => void }) {
  return (
    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground"
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
        <span className="text-[10px] opacity-70">{active ? dir : ""}</span>
      </button>
    </th>
  );
}

function MultiSelect({
  values,
  onChange,
  options,
  allLabel,
  singularLabel,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  allLabel: string;
  singularLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const allSelected = values.length === 0 || values.length === options.length;
  const label =
    allSelected
      ? allLabel
      : values.length === 1
        ? values[0]
        : `${values.length} ${singularLabel} selected`;

  const toggle = (opt: string) => {
    if (values.length === 0) {
      onChange([opt]);
      return;
    }
    const set = new Set(values);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    const next = Array.from(set);
    onChange(next.length === options.length ? [] : next);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground hover:border-foreground/30"
      >
        {label}
        <span className="opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 min-w-[10rem] rounded-lg border border-border bg-surface-elevated p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-foreground/5"
          >
            <span className="inline-block w-3">{allSelected ? "✓" : ""}</span>
            {allLabel}
          </button>
          {options.map((opt) => {
            const checked = !allSelected && values.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-foreground/5"
              >
                <span className="inline-block w-3">{checked ? "✓" : ""}</span>
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


type PipelineSortKey = "name" | "stage" | "aum";
function PipelineLeadsCard({ openLeadId, onCloseLead, advisorReturn, fromBranch, initialSlaOnly, onConsumeSlaOnly }: { openLeadId: string | null; onCloseLead: () => void; advisorReturn: string | null; fromBranch?: string | null; initialSlaOnly?: boolean; onConsumeSlaOnly?: () => void }) {
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<PipelineSortKey>("aum");
  const [nameDir, setNameDir] = useState<"asc" | "desc">("asc");
  const [stageDir, setStageDir] = useState<"asc" | "desc">("asc");
  const [aumDir, setAumDir] = useState<"desc" | "asc">("desc");
  const [slaOnly, setSlaOnly] = useState<boolean>(!!initialSlaOnly);
  const { advisorFilter } = useDashboardFilters();

  useEffect(() => {
    if (initialSlaOnly) {
      setSlaOnly(true);
      onConsumeSlaOnly?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlaOnly]);

  if (openLeadId) {
    return (
      <div>
        <LeadBackButton advisorReturn={advisorReturn} fromBranch={fromBranch} defaultLabel="Back to pipeline leads" onCloseLead={onCloseLead} />
        <LeadDetailView leadId={openLeadId} />
      </div>
    );
  }

  const openLeads = ENRICHED_LEADS.filter((l) => l.stage !== "Client Won");
  const stages = Array.from(new Set(openLeads.map((l) => l.stage)));
  const sources = Array.from(new Set(openLeads.map((l) => l.source)));

  const q = query.trim().toLowerCase();
  const rows = openLeads
    .filter((l) => stageFilter.length === 0 || stageFilter.includes(l.stage))
    .filter((l) => sourceFilter.length === 0 || sourceFilter.includes(l.source))

    .filter((l) => advisorFilter === "All" || ownerName(l.ownerId) === advisorFilter)
    .filter((l) => !slaOnly || l.daysInStage > 4)
    .filter((l) =>
      matchesQuery(`${l.name} ${l.source} ${l.stage} ${ownerName(l.ownerId)}`, query),
    )
    .sort((a, b) => {
      if (sortKey === "name") return nameDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortKey === "stage") {
        const ai = STAGES.indexOf(a.stage);
        const bi = STAGES.indexOf(b.stage);
        return stageDir === "asc" ? ai - bi : bi - ai;
      }
      return aumDir === "desc" ? b.estAum - a.estAum : a.estAum - b.estAum;
    });

  const totalAum = rows.reduce((s, l) => s + l.estAum, 0);

  const toggleName = () => { if (sortKey !== "name") { setSortKey("name"); return; } setNameDir((d) => d === "asc" ? "desc" : "asc"); };
  const toggleStage = () => { if (sortKey !== "stage") { setSortKey("stage"); return; } setStageDir((d) => d === "asc" ? "desc" : "asc"); };
  const toggleAum = () => { if (sortKey !== "aum") { setSortKey("aum"); return; } setAumDir((d) => d === "desc" ? "asc" : "desc"); };


  const exportRows = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`pipeline-leads-${today}.csv`, [
      ["Lead", "Source", "Stage", "Owner", "Days in stage", "Est. AUM ($M)"],
      ...rows.map((l) => [
        l.name,
        l.source,
        l.stage,
        ownerName(l.ownerId),
        l.daysInStage,
        l.estAum.toFixed(1),
      ]),
    ]);
  };

  return (
    <Card
      title={`Pipeline leads (${rows.length} · $${totalAum.toFixed(1)}M${advisorFilter !== "All" ? ` · ${advisorFilter}` : ""}${slaOnly ? " · SLA breaches" : ""})`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search leads…" className="w-44" />
          <MultiSelect
            values={stageFilter}
            onChange={setStageFilter}
            options={stages}
            allLabel="All stages"
            singularLabel="stages"
          />
          <MultiSelect
            values={sourceFilter}
            onChange={setSourceFilter}
            options={sources}
            allLabel="All sources"
            singularLabel="sources"
          />

          <button
            type="button"
            onClick={() => setSlaOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors ${slaOnly ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-surface-elevated text-foreground hover:border-destructive/60"}`}
            aria-pressed={slaOnly}
            title="Show only leads sitting > 4 days in their current stage"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            SLA breaches{slaOnly ? " · on" : ""}
          </button>
          <ExportButton onClick={exportRows} />
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <SortTh label="Lead/Client" active={sortKey === "name"} dir={nameDir === "asc" ? "A–Z" : "Z–A"} onClick={toggleName} />
              <Th>Source</Th>
              <SortTh label="Stage" active={sortKey === "stage"} dir={stageDir === "asc" ? "↓" : "↑"} onClick={toggleStage} />
              <Th>Owner</Th>
              <Th>Days</Th>
              <SortTh label="Est. AUM" active={sortKey === "aum"} dir={aumDir === "desc" ? "↓" : "↑"} onClick={toggleAum} />

            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <Td>
                  <LeadNameButton leadId={l.id} name={l.name} className="font-medium text-foreground hover:text-gold" />
                </Td>
                <Td>{l.source}</Td>
                <Td>{l.stage}</Td>
                <Td>{ownerName(l.ownerId)}</Td>
                <Td
                  className={
                    l.daysInStage > 4 ? "font-medium text-destructive" : undefined
                  }
                >
                  {l.daysInStage}d
                </Td>
                <Td className="font-medium text-foreground">${l.estAum.toFixed(1)}M</Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  No leads match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


type WonSortKey = "name" | "date" | "aum";
function ClientsWonCard({ openLeadId, onCloseLead, advisorReturn, fromBranch }: { openLeadId: string | null; onCloseLead: () => void; advisorReturn: string | null; fromBranch?: string | null }) {
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [advisorMulti, setAdvisorMulti] = useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<WonSortKey>("aum");
  const [nameDir, setNameDir] = useState<"asc" | "desc">("asc");
  const [dateDir, setDateDir] = useState<"recent" | "oldest">("recent");
  const [aumDir, setAumDir] = useState<"desc" | "asc">("desc");
  const { advisorFilter } = useDashboardFilters();

  if (openLeadId) {
    return (
      <div>
        <LeadBackButton advisorReturn={advisorReturn} fromBranch={fromBranch} defaultLabel="Back to clients won" onCloseLead={onCloseLead} />
        <LeadDetailView leadId={openLeadId} />
      </div>
    );
  }


  const wonLeads = ENRICHED_LEADS.filter((l) => l.stage === "Client Won");
  const sources = Array.from(new Set(wonLeads.map((l) => l.source)));
  const advisors = Array.from(new Set(wonLeads.map((l) => ownerName(l.ownerId)))).sort();

  const wonDate = (l: EnrichedLead) =>
    new Date(l.timeline[l.timeline.length - 1]?.at ?? 0);
  const formatWonOn = (l: EnrichedLead) =>
    wonDate(l).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  const q = query.trim().toLowerCase();
  const rows = wonLeads
    .filter((l) => sourceFilter.length === 0 || sourceFilter.includes(l.source))

    .filter((l) => advisorFilter === "All" || ownerName(l.ownerId) === advisorFilter)
    .filter((l) => advisorMulti.length === 0 || advisorMulti.includes(ownerName(l.ownerId)))
    .filter((l) =>
      matchesQuery(`${l.name} ${l.source} ${ownerName(l.ownerId)}`, query),
    )
    .sort((a, b) => {
      if (sortKey === "name") return nameDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortKey === "date") {
        const ta = wonDate(a).getTime(); const tb = wonDate(b).getTime();
        return dateDir === "recent" ? tb - ta : ta - tb;
      }
      return aumDir === "desc" ? b.estAum - a.estAum : a.estAum - b.estAum;
    });

  const totalAum = rows.reduce((s, l) => s + l.estAum, 0);
  const avgAum = rows.length ? totalAum / rows.length : 0;

  const toggleName = () => { if (sortKey !== "name") { setSortKey("name"); return; } setNameDir((d) => d === "asc" ? "desc" : "asc"); };
  const toggleDate = () => { if (sortKey !== "date") { setSortKey("date"); return; } setDateDir((d) => d === "recent" ? "oldest" : "recent"); };
  const toggleAum = () => { if (sortKey !== "aum") { setSortKey("aum"); return; } setAumDir((d) => d === "desc" ? "asc" : "desc"); };

  const exportRows = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`clients-won-${today}.csv`, [
      ["Client", "Source", "Advisor", "Won on", "AUM ($M)"],
      ...rows.map((l) => [l.name, l.source, ownerName(l.ownerId), formatWonOn(l), l.estAum.toFixed(1)]),
    ]);
  };

  return (
    <Card
      title={`Clients won (${rows.length} · $${totalAum.toFixed(1)}M AUM · avg $${avgAum.toFixed(1)}M${advisorFilter !== "All" ? ` · ${advisorFilter}` : ""})`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search clients…" className="w-44" />
          <MultiSelect
            values={sourceFilter}
            onChange={setSourceFilter}
            options={sources}
            allLabel="All sources"
            singularLabel="sources"
          />
          <MultiSelect
            values={advisorMulti}
            onChange={setAdvisorMulti}
            options={advisors}
            allLabel="All advisors"
            singularLabel="advisors"
          />


          <ExportButton onClick={exportRows} />
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <SortTh label="Client" active={sortKey === "name"} dir={nameDir === "asc" ? "A–Z" : "Z–A"} onClick={toggleName} />
              <Th>Source</Th>
              <Th>Advisor</Th>
              <SortTh label="Won on" active={sortKey === "date"} dir={dateDir === "recent" ? "↓" : "↑"} onClick={toggleDate} />
              <SortTh label="AUM" active={sortKey === "aum"} dir={aumDir === "desc" ? "↓" : "↑"} onClick={toggleAum} />
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <Td>
                  <LeadNameButton leadId={l.id} name={l.name} from="won" className="font-medium text-foreground hover:text-gold" />
                </Td>
                <Td>{l.source}</Td>
                <Td>{ownerName(l.ownerId)}</Td>
                <Td className="tabular-nums">{formatWonOn(l)}</Td>
                <Td className="font-medium text-foreground">${l.estAum.toFixed(1)}M</Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No won clients match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


function QuickAction({
  icon: Icon,
  label,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <button className="group flex items-start gap-3 rounded-xl border border-border bg-surface-elevated p-3 text-left transition-colors hover:border-gold/60 hover:bg-surface">
      <div className="rounded-lg bg-gold/15 p-2 text-gold">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </button>
  );
}

// ─── Live Metrics ────────────────────────────────────────────────────────
function LiveView() {

  const stageTimes = [
    { stage: "Referral Intake", avg: 0.6 },
    { stage: "SEIA CRM Intake", avg: 0.9 },
    { stage: "BDO Research", avg: 2.4 },
    { stage: "CRM Handoff", avg: 0.7 },
    { stage: "PlanScout Analysis", avg: 3.9 },
    { stage: "Advisor Plan", avg: 2.1 },
    { stage: "Discovery Meeting", avg: 4.2 },
  ];

  const baseline = FUNNEL_RATES.endToEndCapture * 100; // 16.8%
  const avgCycleDays = stageTimes.reduce((s, x) => s + x.avg, 0);

  // Trailing 7-day intake rate derived from actual LEADS intake timestamps.
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const leadsLast7 = LEADS.filter((l) => {
    const first = l.timeline[0]?.at;
    if (!first) return false;
    const t = new Date(first).getTime();
    return now - t <= sevenDaysMs && t <= now;
  }).length;
  const perDay = leadsLast7 / 7;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Leads / day"
          value={perDay.toFixed(1)}
          delta={`${leadsLast7} in 1W`}
          up
          icon={Radio}
          hint={`Trailing 1-week intake average across all four referral streams.`}
        />

        <KpiCard
          label="Conversion (rolling)"
          value={`${baseline.toFixed(1)}%`}
          delta="+1.2pp"
          up
          icon={Trophy}
          hint={`Rolling capture rate, baseline ${baseline.toFixed(1)}% (21 wins / 125 referrals YTD).`}
        />
        <KpiCard
          label="Avg cycle"
          value={`${avgCycleDays.toFixed(1)}d`}
          delta="-0.4d"
          up
          icon={Clock}
          hint={`Sum of average days across the 7 pre-close stages shown below.`}
        />
        <KpiCard
          label="Streams online"
          value="4 / 4"
          delta="all ok"
          up
          icon={Zap}
          hint={`Schwab · Fidelity · Website · Seminar referral feeds.`}
        />
      </div>

      <ThroughputHistoryCard />


      <Card title="Average time in each stage (days)">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stageTimes} margin={{ left: 10, right: 10 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="stage"
              stroke={AXIS}
              fontSize={10}
              angle={-18}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis stroke={AXIS} fontSize={11} />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={{ color: "oklch(0.3 0.025 60)" }}
              formatter={(v: number) => [`${v} days`, "Avg"]}
            />
            <Bar dataKey="avg" fill="oklch(0.75 0.14 82)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── Triage Queue (BDO daily driver) ─────────────────────────────────────
const BAND_META: Record<TriageBand, { label: string; hint: string; tone: string }> = {
  needs_enrichment: {
    label: "Needs enrichment",
    hint: "Catchlight not run yet — start there.",
    tone: "border-destructive/50 bg-destructive/10 text-destructive",
  },
  awaiting_planscout: {
    label: "Awaiting PlanScout / Discovery Prep",
    hint: "Enrichment done. Waiting on PlanScout draft or Claude content (3–5 business days).",
    tone: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  ready_to_assign: {
    label: "Ready to assign",
    hint: "All research complete. Route to an advisor.",
    tone: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  in_advisor_flow: {
    label: "With advisor",
    hint: "Handed off — advisor owns the next action.",
    tone: "border-border bg-surface-elevated text-muted-foreground",
  },
  won: {
    label: "Won",
    hint: "Closed. Feed to branch feedback loop.",
    tone: "border-gold/50 bg-gold/10 text-gold",
  },
};

const BAND_ORDER: TriageBand[] = [
  "needs_enrichment",
  "awaiting_planscout",
  "ready_to_assign",
  "in_advisor_flow",
];

function TriageView() {
  const [needFilter, setNeedFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const openLeads = ENRICHED_LEADS.filter((l) => l.stage !== "Client Won");

  const filtered = openLeads
    .filter((l) => {
      const t = LEAD_TRIAGE[l.id];
      return needFilter.length === 0 || (t?.statedNeed ? needFilter.includes(t.statedNeed) : false);
    })
    .filter((l) => sourceFilter.length === 0 || sourceFilter.includes(l.source));

  const grouped: Record<TriageBand, typeof filtered> = {
    needs_enrichment: [],
    awaiting_planscout: [],
    ready_to_assign: [],
    in_advisor_flow: [],
    won: [],
  };
  for (const l of filtered) grouped[triageBand(l)].push(l);
  for (const k of BAND_ORDER) grouped[k].sort((a, b) => b.estAum - a.estAum);

  const counts = BAND_ORDER.map((b) => ({ b, n: grouped[b].length }));
  const needs = ["Retirement", "Tax", "Estate", "Cash-flow", "Business exit"];
  const sources = Array.from(new Set(openLeads.map((l) => l.source)));


  const exportTriage = () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows: (string | number)[][] = [
      ["Band", "Lead", "Source", "Branch", "Stated need", "Opportunity", "Catchlight", "PlanScout", "Discovery Prep", "Days in stage", "Est. AUM ($M)"],
    ];
    for (const b of BAND_ORDER) {
      for (const l of grouped[b]) {
        const t = LEAD_TRIAGE[l.id];
        rows.push([
          BAND_META[b].label,
          l.name,
          l.source,
          l.branch,
          t?.statedNeed ?? "—",
          t?.opportunityBand ?? "—",
          t?.catchlight ?? "not_started",
          t?.planScout ?? "not_started",
          t?.discoveryPrep ?? "not_started",
          l.daysInStage,
          l.estAum.toFixed(1),
        ]);
      }
    }
    downloadCsv(`triage-queue-${today}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header + counts */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Triage Queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every open lead grouped by what it needs from you next. Sorted by estimated AUM.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MultiSelect
            values={needFilter}
            onChange={setNeedFilter}
            options={needs}
            allLabel="All needs"
            singularLabel="needs"
          />
          <MultiSelect
            values={sourceFilter}
            onChange={setSourceFilter}
            options={sources}
            allLabel="All sources"
            singularLabel="sources"
          />

          <ExportButton onClick={exportTriage} />
        </div>
      </div>

      {/* Band summary strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map(({ b, n }) => {
          const m = BAND_META[b];
          return (
            <div key={b} className={`rounded-2xl border ${m.tone} p-4`}>
              <div className="text-xs uppercase tracking-wider opacity-80">{m.label}</div>
              <div className="mt-1 font-display text-3xl font-semibold">{n}</div>
              <div className="mt-1 text-xs opacity-80">{m.hint}</div>
            </div>
          );
        })}
      </div>

      {/* Grouped tables */}
      {BAND_ORDER.map((band) => {
        const rows = grouped[band];
        if (rows.length === 0) return null;
        const m = BAND_META[band];
        return (
          <Card key={band} title={`${m.label} (${rows.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <Th>Lead/Client</Th>
                    <Th>Source / branch</Th>
                    <Th>Need</Th>
                    <Th>Opportunity</Th>
                    <Th>Research</Th>
                    <Th>Days</Th>
                    <Th>Est. AUM</Th>
                    <Th>Next action</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const t = LEAD_TRIAGE[l.id];
                    const breach = l.daysInStage > 4;
                    return (
                      <tr key={l.id} className="border-t border-border align-top">
                        <Td>
                          <LeadNameButton leadId={l.id} name={l.name} className="font-medium text-foreground hover:text-gold" />
                          <div className="text-xs text-muted-foreground">{l.id} · {l.city}</div>
                        </Td>
                        <Td>
                          <div>{l.source}</div>
                          <div className="text-xs text-muted-foreground">{l.branch}</div>
                        </Td>
                        <Td>{t?.statedNeed ?? "—"}</Td>
                        <Td>{t?.opportunityBand ?? "—"}</Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            <ResearchPill label="Catchlight" state={t?.catchlight ?? "not_started"} />
                            <ResearchPill label="PlanScout" state={t?.planScout ?? "not_started"} />
                            <ResearchPill label="Discovery Prep" state={t?.discoveryPrep ?? "not_started"} />
                          </div>
                          {t?.reworkReason && (
                            <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                              ↩ Rework: {t.reworkReason}
                            </div>
                          )}
                        </Td>
                        <Td className={breach ? "font-medium text-destructive" : undefined}>
                          {l.daysInStage}d
                        </Td>
                        <Td className="font-medium text-foreground">${l.estAum.toFixed(1)}M</Td>
                        <Td>
                          <div className="text-sm">{nextTriageAction(band, t)}</div>
                          <div className="text-xs text-muted-foreground">Owner: {ownerName(l.ownerId)}</div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function nextTriageAction(band: TriageBand, t?: { catchlight: ResearchState; planScout: ResearchState; discoveryPrep: ResearchState }): string {
  if (!t) return "Enrich in Catchlight";
  if (band === "needs_enrichment") return "Run Catchlight enrichment";
  if (band === "awaiting_planscout") {
    if (t.planScout !== "done") return "Follow up with PlanScout";
    if (t.discoveryPrep !== "done") return "Kick off Discovery Prep";
  }
  if (band === "ready_to_assign") return "Assign to advisor";
  if (band === "in_advisor_flow") return "Advisor-owned — monitor SLA";
  return "—";
}

function ResearchPill({ label, state }: { label: string; state: ResearchState }) {
  const cls =
    state === "done"
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : state === "pending"
        ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-border bg-surface-elevated text-muted-foreground";
  const glyph = state === "done" ? "✓" : state === "pending" ? "…" : "–";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      <span className="font-semibold">{glyph}</span>
      {label}
    </span>
  );
}

// ─── Historical lead throughput — honors reporting period + advisor filter
function ThroughputHistoryCard() {
  const { advisorFilter } = useDashboardFilters();
  const [windowDays, setWindowDays] = useState<15 | 30 | 45>(30);

  const { data, days } = useMemo(() => {
    const filteredLeads = LEADS.filter(
      (l) => advisorFilter === "All" || ownerName(l.ownerId) === advisorFilter,
    );

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - (windowDays - 1));

    const dayCount = windowDays;

    const counts = new Map<string, number>();
    for (const l of filteredLeads) {
      const first = l.timeline[0]?.at;
      if (!first) continue;
      if (!inRange(first, { start, end })) continue;
      const key = first.slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const out: { date: string; label: string; leads: number }[] = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      out.push({
        date: key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        leads: counts.get(key) ?? 0,
      });
    }
    return { data: out, days: dayCount };
  }, [advisorFilter, windowDays]);

  const total = data.reduce((s, d) => s + d.leads, 0);
  const avg = total / Math.max(data.length, 1);
  const tickEvery = days <= 15 ? 1 : days <= 30 ? 3 : 5;

  return (
    <Card
      title={`Lead throughput — last ${windowDays} days${advisorFilter !== "All" ? ` · ${advisorFilter}` : ""}`}
      right={
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {total} leads · avg {avg.toFixed(1)}/day
          </div>
          <div className="inline-flex rounded-lg border border-border bg-surface-elevated p-0.5">
            {([15, 30, 45] as const).map((d) => (
              <button
                key={d}
                onClick={() => setWindowDays(d)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  windowDays === d
                    ? "bg-gold text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ left: 10, right: 10 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={AXIS}
            fontSize={11}
            interval={tickEvery - 1}
            tickMargin={8}
          />
          <YAxis stroke={AXIS} fontSize={11} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            itemStyle={{ color: "oklch(0.3 0.025 60)" }}
            formatter={(v: number) => [`${v} leads`, "Throughput"]}
            labelFormatter={(l) => `${l}`}
          />
          <Line
            type="monotone"
            dataKey="leads"
            stroke="oklch(0.75 0.14 82)"
            strokeWidth={2.5}
            dot={days <= 15 ? { r: 3 } : false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
