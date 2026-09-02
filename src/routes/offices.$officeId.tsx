import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Building2, MapPin, Trophy, Users, DollarSign, Search, Download, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { ADVISORS, ENRICHED_LEADS, ownerName, type EnrichedLead } from "../data/leads";
import { ADVISOR_OFFICE, BRANCH_STAGES, findOffice, officeForLead, officeMapsUrl, type Office } from "../data/offices";
import { matchesQuery } from "@/lib/search-match";
import { TodayLabel } from "../components/today-label";

export const Route = createFileRoute("/offices/$officeId")({
  head: ({ params }) => {
    const name = safeDecode(params.officeId);
    return {
      meta: [
        { title: `${name} — Branch details · SEIA` },
        { name: "description", content: `${name} office team, leads, and AUM.` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  validateSearch: (s: Record<string, unknown>): { focus?: "pipeline" | "won"; from?: string } => ({
    focus: s.focus === "pipeline" || s.focus === "won" ? s.focus : undefined,
    from: typeof s.from === "string" ? s.from : undefined,
  }),
  loader: ({ params }) => {

    const office = findOffice(params.officeId);
    if (!office) throw notFound();
    const leads: EnrichedLead[] = ENRICHED_LEADS.filter(
      (l) => officeForLead(l).name === office.name && (BRANCH_STAGES as readonly string[]).includes(l.stage),
    );

    return { office, leads };
  },
  component: OfficePage,
  notFoundComponent: OfficeNotFound,
});

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function OfficeNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Branch not found</h1>
      <Link to="/dashboard" className="mt-6 inline-block text-gold hover:underline">
        ← Dashboard
      </Link>
    </main>
  );
}

const PIE_COLORS = [
  "oklch(0.82 0.14 82)",
  "oklch(0.65 0.15 200)",
  "oklch(0.7 0.13 170)",
  "oklch(0.68 0.13 300)",
  "oklch(0.72 0.16 150)",
  "oklch(0.62 0.14 60)",
];

const AXIS = "oklch(0.45 0.02 60)";
const GRID = "oklch(0.78 0.036 82 / 0.5)";
const tooltipStyle = {
  backgroundColor: "oklch(0.98 0.006 85)",
  border: "1px solid oklch(0.78 0.036 82 / 0.6)",
  borderRadius: 4,
  fontSize: 12,
  color: "oklch(0.3 0.025 60)",
} as const;

function OfficePage() {
  const { office, leads } = Route.useLoaderData() as { office: Office; leads: EnrichedLead[] };
  const { focus } = Route.useSearch();
  const name = office.name;

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`office-${focus}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focus]);


  const won = leads.filter((l) => l.stage === "Client Won");
  const open = leads.filter((l) => l.stage !== "Client Won");
  const referrals = leads.length;
  const wonCount = won.length;
  const winRate = referrals === 0 ? 0 : (wonCount / referrals) * 100;
  const clientAum = won.reduce((s, l) => s + l.estAum, 0);
  const pipelineAum = open.reduce((s, l) => s + l.estAum, 0);

  const byStage = useMemo(
    () => BRANCH_STAGES.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length })),
    [leads],
  );

  const byOwner = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads) {
      const n = ownerName(l.ownerId);
      m.set(n, (m.get(n) ?? 0) + 1);
    }
    return [...m.entries()].map(([n, count]) => ({ name: n, count }));
  }, [leads]);

  const sortedOpen = useMemo(() => [...open].sort((a, b) => b.estAum - a.estAum), [open]);
  const sortedWon = useMemo(() => [...won].sort((a, b) => b.estAum - a.estAum), [won]);

  const officeAdvisors = useMemo(() => {
    // Only advisors whose single home office is this branch — no duplicates.
    return ADVISORS.filter((a) => ADVISOR_OFFICE[a.id] === office.name).map((a) => {
      const advLeads = leads.filter((l) => l.ownerId === a.id);
      const advOpen = advLeads.filter((l) => l.stage !== "Client Won");
      const advWon = advLeads.filter((l) => l.stage === "Client Won");
      return {
        ...a,
        branchLeads: advOpen.length,
        branchWon: advWon.length,
        branchAum: advWon.reduce((s, l) => s + l.estAum, 0),
      };
    });
  }, [leads, office.name]);


  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/dashboard"
          search={{ tab: "offices" } as never}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          Branch details
        </Link>

        <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Branch{office.hq ? " · Headquarters" : ""}
            </div>
            <h1 className="mt-1 font-display text-4xl font-semibold text-foreground">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {office.street}
                {office.suite ? `, ${office.suite}` : ""} · {office.city}, {office.state} {office.zip}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {office.phone}
              </span>
              {office.fax && (
                <>
                  <span>·</span>
                  <span>Fax {office.fax}</span>
                </>
              )}
              <span>·</span>
              <a
                href={officeMapsUrl(office)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline"
              >
                Get directions
              </a>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <TodayLabel />
            <button
              onClick={() =>
                exportOfficeCsv({
                  office,
                  referrals,
                  wonCount,
                  winRate,
                  clientAum,
                  pipelineAum,
                  openCount: open.length,
                  byStage,
                  byOwner,
                  advisors: officeAdvisors,
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

        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat icon={Users} label="Team size" value={String(office.teamSize)} />
          <Stat label="Referrals" value={String(referrals)} />
          <Stat icon={Trophy} label="Clients won" value={String(wonCount)} />
          <Stat label="Win rate" value={`${winRate.toFixed(1)}%`} />
          <Stat icon={DollarSign} label="Client AUM" value={`$${clientAum.toFixed(1)}M`} />
          <Stat label="Pipeline AUM" value={`$${pipelineAum.toFixed(1)}M`} />
        </section>

        <p className="mt-3 rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          This branch counts only advisor-owned stages —{" "}
          <span className="text-foreground">Advisor Plan, Discovery Meeting, Client Won</span>. Leads still at intake,
          BDO research, or PlanScout aren't assigned to an office yet and appear under Source details instead.
        </p>



        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Leads by stage">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStage} margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="stage" stroke={AXIS} fontSize={10} interval={0} angle={-25} textAnchor="end" height={80} />
                <YAxis stroke={AXIS} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="oklch(0.75 0.14 82)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Leads by advisor / BDO">
            {byOwner.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads attributed to this branch yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byOwner} dataKey="count" nameKey="name" outerRadius={90} label>
                    {byOwner.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </section>

        <section className="mt-6">
          <AdvisorsTable advisors={officeAdvisors} branchName={name} />
        </section>

        <section className="mt-6 grid gap-6">
          <LeadTable
            title="Pipeline leads"
            rows={sortedOpen}
            branchName={name}
            from="pipeline"
            highlighted={focus === "pipeline"}
          />
          <LeadTable
            title="Clients at this branch"
            rows={sortedWon}
            branchName={name}
            from="won"
            highlighted={focus === "won"}
          />

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

function AdvisorsTable({ advisors, branchName }: { advisors: Array<typeof ADVISORS[number] & { branchLeads: number; branchWon: number; branchAum: number }>; branchName: string }) {
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("All titles");
  const titles = useMemo(() => ["All titles", ...Array.from(new Set(advisors.map((a) => a.title)))], [advisors]);
  const rows = useMemo(() => {
    return advisors.filter((a) =>
      (title === "All titles" || a.title === title) &&
      matchesQuery(`${a.name} ${a.title}`, q)
    );
  }, [advisors, q, title]);

  return (
    <Card title={`Advisors working at this branch (${rows.length})`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar value={q} onChange={setQ} placeholder="Search advisors…" />
        <Select value={title} onChange={setTitle} options={titles} />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No advisors match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Advisor</Th>
                <Th>Title</Th>
                <Th>Pipeline leads here</Th>
                <Th>Clients won here</Th>
                <Th>AUM here ($M)</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-surface-elevated/50">
                  <Td>
                    <Link
                      to="/advisors/$advisorId"
                      params={{ advisorId: a.id }}
                      search={{ fromOffice: encodeURIComponent(branchName) }}
                      className="text-foreground hover:text-gold hover:underline"
                    >
                      {a.name}
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">{a.title}</Td>
                  <Td>{a.branchLeads}</Td>
                  <Td>{a.branchWon}</Td>
                  <Td>${a.branchAum.toFixed(1)}M</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function LeadTable({ title, rows, branchName, from, highlighted }: { title: string; rows: EnrichedLead[]; branchName: string; from: "pipeline" | "won"; highlighted?: boolean }) {
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
    <div
      id={`office-${from}`}
      className={
        highlighted
          ? "scroll-mt-24 rounded-2xl ring-2 ring-gold/60 ring-offset-2 ring-offset-background"
          : "scroll-mt-24"
      }
    >
    <Card title={`${title} (${filtered.length})`}>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar value={q} onChange={setQ} placeholder="Search name, city, advisor…" />
        {from === "pipeline" && <Select value={stage} onChange={setStage} options={stages} />}
        <Select value={owner} onChange={setOwner} options={owners} />
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
                      search={{ lead: l.id, from, fromOffice: encodeURIComponent(branchName) }}
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
    </div>
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
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</div>
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
  office: Office;
  referrals: number;
  wonCount: number;
  winRate: number;
  clientAum: number;
  pipelineAum: number;
  openCount: number;
  byStage: { stage: string; count: number }[];
  byOwner: { name: string; count: number }[];
  advisors: Array<{ name: string; title: string; branchLeads: number; branchWon: number; branchAum: number }>;
  pipeline: EnrichedLead[];
  clients: EnrichedLead[];
};

function exportOfficeCsv(p: ExportPayload) {
  const o = p.office;
  const sections: (string | number)[][] = [];
  sections.push(["Branch Details"]);
  sections.push(["Name", o.hq ? `${o.name} (HQ)` : o.name]);
  sections.push(["Address", `${o.street}${o.suite ? `, ${o.suite}` : ""}`]);
  sections.push(["City", o.city]);
  sections.push(["State", o.state]);
  sections.push(["ZIP", o.zip]);
  sections.push(["Phone", o.phone]);
  sections.push(["Fax", o.fax ?? ""]);
  sections.push(["Team size", o.teamSize]);
  sections.push([]);
  sections.push(["Summary"]);
  sections.push(["Referrals", p.referrals]);
  sections.push(["Clients won", p.wonCount]);
  sections.push(["Win rate (%)", p.winRate.toFixed(1)]);
  sections.push(["Client AUM ($M)", p.clientAum.toFixed(1)]);
  sections.push(["Pipeline AUM ($M)", p.pipelineAum.toFixed(1)]);
  sections.push(["Open leads", p.openCount]);
  sections.push([]);
  sections.push(["Leads by stage"]);
  sections.push(["Stage", "Count"]);
  p.byStage.forEach((s) => sections.push([s.stage, s.count]));
  sections.push([]);
  sections.push(["Leads by advisor / BDO"]);
  sections.push(["Owner", "Count"]);
  p.byOwner.forEach((x) => sections.push([x.name, x.count]));
  sections.push([]);
  sections.push(["Advisors working at this branch"]);
  sections.push(["Advisor", "Title", "Pipeline leads here", "Clients won here", "AUM here ($M)"]);
  p.advisors.forEach((a) =>
    sections.push([a.name, a.title, a.branchLeads, a.branchWon, a.branchAum.toFixed(1)]),
  );
  sections.push([]);
  sections.push(["Pipeline leads"]);
  sections.push(["Client", "Stage", "USER", "City", "Est. AUM ($M)"]);
  p.pipeline.forEach((l) =>
    sections.push([l.name, l.stage, ownerName(l.ownerId), l.city, l.estAum.toFixed(1)]),
  );
  sections.push([]);
  sections.push(["Clients at this branch"]);
  sections.push(["Client", "Stage", "ADVISOR", "City", "Est. AUM ($M)"]);
  p.clients.forEach((l) =>
    sections.push([l.name, l.stage, ownerName(l.ownerId), l.city, l.estAum.toFixed(1)]),
  );

  const csv = toCsv(sections);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `branch-${o.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
