import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Building2, MapPin, Users, DollarSign, Search, Download } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useBackShortcut } from "@/lib/use-back-shortcut";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { ENRICHED_LEADS, ownerName, STAGES, BRANCHES, BRANCH_REGION, type EnrichedLead } from "../data/leads";
import { matchesQuery } from "@/lib/search-match";
import { TodayLabel } from "../components/today-label";

export const Route = createFileRoute("/branches/$branchId")({
  validateSearch: (s: Record<string, unknown>): { from?: string } => ({
    from: typeof s.from === "string" ? (s.from as string) : undefined,
  }),
  head: ({ params }) => {
    const name = safeDecode(params.branchId);
    return {
      meta: [
        { title: `${name} — Source details · SEIA` },
        { name: "description", content: `${name} source performance, leads, and AUM.` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  loader: ({ params }) => {
    const name = safeDecode(params.branchId);
    const known = BRANCHES.some((b) => b.name === name);
    const leads: EnrichedLead[] = ENRICHED_LEADS.filter((l) => l.branch === name);
    if (!known && leads.length === 0) throw notFound();
    return { name, leads };
  },
  component: BranchPage,
  notFoundComponent: BranchNotFound,
});

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function BranchNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Source not found</h1>
      <Link to="/dashboard" className="mt-6 inline-block text-gold hover:underline">
        ← Dashboard
      </Link>
    </main>
  );
}

const AXIS = "oklch(0.45 0.02 60)";
const GRID = "oklch(0.78 0.036 82 / 0.5)";
const tooltipStyle = {
  backgroundColor: "oklch(0.98 0.006 85)",
  border: "1px solid oklch(0.78 0.036 82 / 0.6)",
  borderRadius: 4,
  fontSize: 12,
  color: "oklch(0.3 0.025 60)",
} as const;

// Stage copy mirrors the eleven-stage lifecycle flowchart on the workflow page.
const STAGE_HELP: Record<string, string> = {
  "Referral Intake": "Referral arrives from Schwab or Fidelity and lands in the intake form.",
  "SEIA CRM Intake": "Salesforce logs the referral and routes it to the business development office.",
  "BDO Research": "BDO enriches the record — household, assets, stated need, suitability.",
  "CRM Handoff": "Salesforce hands the researched lead onward for planning analysis.",
  "PlanScout Analysis": "PlanScout produces the retirement, tax, and cash-flow brief.",
  "Advisor Plan": "Assigned advisor builds the conversion plan and agenda.",
  "Discovery Meeting": "Advisor runs the full discovery process with the prospect.",
  "Client Won": "Prospect signs and is onboarded as a SEIA client.",
};

function StageTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !label) return null;
  return (
    <div className="max-w-[16rem] rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-foreground">{label}</div>
      <div className="mt-0.5 text-foreground/80">{payload?.[0]?.value ?? 0} leads</div>
      {STAGE_HELP[label] && (
        <p className="mt-1.5 leading-snug text-muted-foreground">{STAGE_HELP[label]}</p>
      )}
    </div>
  );
}

function BranchPage() {
  const { name, leads } = Route.useLoaderData() as { name: string; leads: EnrichedLead[] };
  const { from } = Route.useSearch();
  const backTo = from === "geo" ? "geo" : "branches";
  const backLabel = from === "geo" ? "Geographic overview" : "Source details";
  const router = useRouter();

  // Always resolve to the originating dashboard tab, so refreshes and direct
  // URLs behave the same as an in-app click.
  const goBack = useCallback(() => {
    router.navigate({ to: "/dashboard", search: { tab: backTo } as never });
  }, [router, backTo]);
  useBackShortcut(goBack);



  const won = leads.filter((l) => l.stage === "Client Won");
  const open = leads.filter((l) => l.stage !== "Client Won");
  const referrals = leads.length;
  const clientAum = won.reduce((s, l) => s + l.estAum, 0);
  const pipelineAum = open.reduce((s, l) => s + l.estAum, 0);
  const region = leads[0]?.region ?? BRANCH_REGION[name] ?? "—";
  const source = leads[0]?.source ?? BRANCHES.find((b) => b.name === name)?.source ?? "—";
  const program = leads[0]?.program ?? "—";

  const byStage = useMemo(() => {
    return STAGES.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length }));
  }, [leads]);

  const sortedOpen = useMemo(
    () => [...open].sort((a, b) => b.estAum - a.estAum),
    [open],
  );
  const sortedWon = useMemo(
    () => [...won].sort((a, b) => b.estAum - a.estAum),
    [won],
  );




  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Breadcrumbs
          items={[
            { label: "Dashboard", link: { to: "/dashboard" } },
            { label: backLabel, link: { to: "/dashboard", search: { tab: backTo } } },
            { label: name },
          ]}
        />
        <button
          type="button"
          onClick={goBack}
          title="Alt + ←"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
          <span className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider sm:inline">
            Alt + ←
          </span>
        </button>


        <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Source
            </div>
            <h1 className="mt-1 font-display text-4xl font-semibold text-foreground">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {region}
              </span>
              <span>·</span>
              <span>Source: {source}</span>
              <span>·</span>
              <span>Program: {program}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <TodayLabel />
            <button
              onClick={() =>
                exportBranchCsv({
                  name,
                  region,
                  source,
                  program,
                  referrals,
                  clientAum,
                  pipelineAum,
                  openCount: open.length,
                  byStage,
                  pipeline: sortedOpen,
                  clients: sortedWon,
                })
              }
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:border-gold hover:text-gold"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {name} at a glance
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Every referral this source has sent into the flow, from intake through advisor
            discovery. The four figures below are referral volume, assets already onboarded,
            assets still in play, and how many leads are still moving.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat
              icon={Users}
              label="Referrals"
              value={String(referrals)}
              hint="Total leads this source has referred, at any stage."
            />
            <Stat
              icon={DollarSign}
              label="Client AUM"
              value={`$${clientAum.toFixed(1)}M`}
              hint="Estimated AUM of leads from this source that reached Client Won."
            />
            <Stat
              label="Pipeline AUM"
              value={`$${pipelineAum.toFixed(1)}M`}
              hint="Estimated AUM of this source's leads that have not yet been won."
            />
            <Stat
              label="Open leads"
              value={String(open.length)}
              hint="Leads from this source still in a pre-Client Won stage."
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
            <Link
              to="/leads"
              search={{ branch: name, ...(from ? { from } : {}) } as never}
              className="text-gold hover:underline"
            >

              Review all leads from this source →
            </Link>
          </div>
        </section>

        <section className="mt-6">
          <Card title="Leads by stage">
            <p className="mb-3 text-sm text-muted-foreground">
              Stage names match the eleven-stage lifecycle flowchart. Hover a bar for the
              definition of that handoff.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStage} margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="stage" stroke={AXIS} fontSize={10} interval={0} angle={-25} textAnchor="end" height={80} />
                <YAxis stroke={AXIS} fontSize={11} allowDecimals={false} />
                <Tooltip content={<StageTooltip />} />
                <Bar dataKey="count" fill="oklch(0.75 0.14 82)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-4 text-xs sm:grid-cols-2">
              {byStage
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div key={s.stage} className="flex gap-2">
                    <dt className="shrink-0 font-medium text-foreground">
                      {s.stage} ({s.count})
                    </dt>
                    <dd className="text-muted-foreground">{STAGE_HELP[s.stage]}</dd>
                  </div>
                ))}
            </dl>
          </Card>
        </section>

        <section className="mt-6 grid gap-6">
          <LeadTable title="Pipeline leads" rows={sortedOpen} branchName={name} from="pipeline" />
          <LeadTable title="Clients from this source" rows={sortedWon} branchName={name} from="won" />
        </section>
      </div>
    </main>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
      />
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function LeadTable({ title, rows, branchName, from }: { title: string; rows: EnrichedLead[]; branchName: string; from: "pipeline" | "won" }) {
  const ownerAllLabel = from === "won" ? "All advisors" : "All users";
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("All stages");
  const [owner, setOwner] = useState(ownerAllLabel);
  const stages = useMemo(() => ["All stages", ...Array.from(new Set(rows.map((l) => l.stage)))], [rows]);
  const owners = useMemo(() => [ownerAllLabel, ...Array.from(new Set(rows.map((l) => ownerName(l.ownerId))))], [rows, ownerAllLabel]);
  const filtered = useMemo(() => {
    return rows.filter((l) =>
      (stage === "All stages" || l.stage === stage) &&
      (owner === ownerAllLabel || ownerName(l.ownerId) === owner) &&
      matchesQuery(`${l.name} ${l.city} ${ownerName(l.ownerId)}`, q)
    );
  }, [rows, q, stage, owner, ownerAllLabel]);

  return (
    <Card title={`${title} (${filtered.length})`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar value={q} onChange={setQ} placeholder="Search name, city, advisor…" />
        {from === "pipeline" && <Select value={stage} onChange={setStage} options={stages} />}
        <Select value={owner} onChange={setOwner} options={owners} />
        <Link
          to="/leads"
          search={{ branch: branchName, ...(from === "won" ? { stage: "Client Won" } : {}) } as never}
          className="ml-auto text-sm text-gold hover:underline"
        >
          Open in leads list →
        </Link>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">None.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Client</Th>
                <Th>Stage</Th>
                <Th>{from === "pipeline" ? "USER" : "ADVISOR"}</Th>
                <Th>City</Th>
                <Th>Est. AUM ($M)</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-surface-elevated/50">
                  <Td>
                    <Link
                      to="/dashboard"
                      search={{ lead: l.id, from, fromBranch: encodeURIComponent(branchName) }}
                      className="text-foreground hover:text-gold hover:underline"
                    >
                      {l.name}
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">{l.stage}</Td>
                  <Td>{ownerName(l.ownerId)}</Td>
                  <Td className="text-muted-foreground">{l.city}</Td>
                  <Td>${l.estAum.toFixed(1)}M</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      title={hint}
      className="rounded-2xl border border-border bg-surface-elevated p-4"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</div>
      {hint && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 text-foreground/80 ${className}`}>{children}</td>;
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

type ExportPayload = {
  name: string;
  region: string;
  source: string;
  program: string;
  referrals: number;
  clientAum: number;
  pipelineAum: number;
  openCount: number;
  byStage: { stage: string; count: number }[];
  pipeline: EnrichedLead[];
  clients: EnrichedLead[];
};

function exportBranchCsv(p: ExportPayload) {
  const sections: (string | number)[][] = [];
  sections.push(["Source Details"]);
  sections.push(["Name", p.name]);
  sections.push(["Region", p.region]);
  sections.push(["Source", p.source]);
  sections.push(["Program", p.program]);
  sections.push([]);
  sections.push(["Summary"]);
  sections.push(["Referrals", p.referrals]);
  sections.push(["Client AUM ($M)", p.clientAum.toFixed(1)]);
  sections.push(["Pipeline AUM ($M)", p.pipelineAum.toFixed(1)]);
  sections.push(["Open leads", p.openCount]);
  sections.push([]);
  sections.push(["Leads by stage"]);
  sections.push(["Stage", "Count"]);
  p.byStage.forEach((s) => sections.push([s.stage, s.count]));
  sections.push([]);
  sections.push(["Pipeline leads"]);
  sections.push(["Client", "Stage", "USER", "City", "Est. AUM ($M)"]);
  p.pipeline.forEach((l) =>
    sections.push([l.name, l.stage, ownerName(l.ownerId), l.city, l.estAum.toFixed(1)]),
  );
  sections.push([]);
  sections.push(["Clients from this source"]);
  sections.push(["Client", "Stage", "ADVISOR", "City", "Est. AUM ($M)"]);
  p.clients.forEach((l) =>
    sections.push([l.name, l.stage, ownerName(l.ownerId), l.city, l.estAum.toFixed(1)]),
  );

  const csv = toCsv(sections);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `source-${p.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
