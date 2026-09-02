import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, AlertTriangle, FileText, Building2, Globe2, Users } from "lucide-react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { getLead, getAdvisor, ownerName, isBreachingSla, STAGES, LEAD_META } from "../data/leads";

const SOURCE_BLURB: Record<string, string> = {
  Schwab: "Charles Schwab referral network — introduced through a Schwab branch relationship manager.",
  Fidelity: "Fidelity Wealth referral — introduced through a Fidelity branch representative.",
  Website: "Inbound web lead — submitted the contact form on the SEIA marketing site.",
  Seminar: "Attended a SEIA-hosted educational seminar or webinar.",
  Referral: "Client or partner referral — introduced by an existing SEIA relationship.",
};

export const Route = createFileRoute("/leads/$leadId")({
  head: ({ params }) => {
    const l = getLead(params.leadId);
    const title = l ? `${l.name} — Lead ${l.id}` : "Lead not found";
    return {
      meta: [
        { title: `${title} · SEIA` },
        { name: "description", content: l ? `${l.name} — currently in ${l.stage}. Est. AUM $${l.estAum.toFixed(1)}M.` : "Lead not found" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  validateSearch: (s: Record<string, unknown>): { fromBranch?: string } => ({
    fromBranch: typeof s.fromBranch === "string" ? (s.fromBranch as string) : undefined,
  }),
  loader: ({ params }) => {
    const lead = getLead(params.leadId);
    if (!lead) throw notFound();
    return { lead };
  },
  component: LeadDetail,
  notFoundComponent: LeadNotFound,
  errorComponent: LeadError,
});

function safeDecodeBranch(v: string) {
  try { return decodeURIComponent(v); } catch { return v; }
}

function LeadNotFound() {
  const { leadId } = Route.useParams();
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Lead not found</h1>
      <p className="mt-2 text-muted-foreground">No lead with ID {leadId}.</p>
      <Link to="/leads" className="mt-6 inline-block text-gold hover:underline">← Back to leads</Link>
    </main>
  );
}

function LeadError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl">Couldn't load this lead</h1>
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

function LeadDetail() {
  const { lead } = Route.useLoaderData() as { lead: NonNullable<ReturnType<typeof getLead>> };
  const { fromBranch } = Route.useSearch();
  const advisor = getAdvisor(lead.ownerId);
  const breach = isBreachingSla(lead);
  const stageIdx = STAGES.indexOf(lead.stage);
  const meta = LEAD_META[lead.id];
  const sourceBlurb = SOURCE_BLURB[lead.source] ?? "";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Breadcrumbs
        items={
          fromBranch
            ? [
                { label: "Sources", link: { to: "/dashboard", search: { tab: "branches" } } },
                {
                  label: safeDecodeBranch(fromBranch),
                  link: { to: "/branches/$branchId", params: { branchId: fromBranch } },
                },
                { label: lead.name },
              ]
            : [
                { label: "Dashboard", link: { to: "/dashboard" } },
                { label: lead.name },
              ]
        }
      />

      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
            <span>{lead.id}</span>
            <span>·</span>
            <span>{lead.source} referral</span>
            {meta && <><span>·</span><span>{meta.region} region</span></>}
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold">{lead.name}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{lead.city}</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{lead.email}</span>
            <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" />{lead.phone}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <MetricPill label="Current stage" value={lead.stage} highlight />
          <MetricPill label="Est. AUM" value={`$${lead.estAum.toFixed(1)}M`} />
          <MetricPill label="Days in stage" value={lead.daysInStage.toString()} tone={breach ? "warn" : undefined} />
          <MetricPill label="PlanScout" value={lead.planScoutStatus} />
        </div>
      </header>

      {/* Mini pipeline */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">Pipeline position</div>
        <ol className="flex flex-wrap items-center gap-2">
          {STAGES.map((s, i) => {
            const done = i < stageIdx;
            const active = i === stageIdx;
            return (
              <li key={s} className="flex items-center gap-2">
                <div
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs whitespace-nowrap",
                    active ? "border-gold bg-gold text-primary-foreground font-medium" : "",
                    done ? "border-gold/40 text-foreground" : "",
                    !active && !done ? "border-border text-muted-foreground" : "",
                  ].join(" ")}
                >
                  {i + 1}. {s}
                </div>
                {i < STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: timeline */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl">Stage timeline</h2>
          <ol className="mt-5 space-y-4">
            {lead.timeline.map((ev: typeof lead.timeline[number], i: number) => (
              <li key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-gold" />
                  {i < lead.timeline.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="pb-2">
                  <div className="text-sm font-medium">{ev.stage}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(ev.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · {ev.owner}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {lead.notes.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium">Notes</h3>
              <ul className="mt-3 space-y-2">
                {lead.notes.map((n: string, i: number) => (
                  <li key={i} className="rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Right: sidebar */}
        <aside className="space-y-6">
          <div className="rounded-2xl border-2 border-gold/40 bg-surface p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
              <Globe2 className="h-3.5 w-3.5" /> Where they came from
            </div>
            <div className="mt-2 font-display text-lg">{lead.source}</div>
            {meta && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />{meta.branch}
              </div>
            )}
            {meta && (
              <div className="mt-1 text-xs text-muted-foreground">
                {meta.region} region · {meta.program} program
              </div>
            )}
            {sourceBlurb && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{sourceBlurb}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Handled by
            </div>
            {advisor ? (
              <Link
                to="/advisors/$advisorId"
                params={{ advisorId: advisor.id }}
                className="mt-2 block font-display text-lg hover:text-gold"
              >
                {advisor.name}
              </Link>
            ) : (
              <div className="mt-2 font-display text-lg">{ownerName(lead.ownerId)}</div>
            )}
            {advisor ? (
              <div className="text-xs text-muted-foreground">{advisor.title}</div>
            ) : (
              <div className="text-xs text-muted-foreground">Business Development Office</div>
            )}
          </div>


          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Next action</div>
            <div className="mt-2 flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-gold" />
              <div>
                <div className="text-sm">{lead.nextAction}</div>
                <div className="text-xs text-muted-foreground">
                  Due {new Date(lead.nextActionDate).toLocaleDateString()}
                </div>
              </div>
            </div>
            {breach && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> SLA breach — escalate
              </div>
            )}
          </div>

          {lead.taxStrategy && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">PlanScout snapshot</div>
              <div className="mt-2 flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 text-gold" />
                <div className="text-sm">{lead.taxStrategy}</div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Actions</div>
            <div className="mt-3 flex flex-col gap-2">
              <button className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Advance stage
              </button>
              <button className="rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted">
                Reassign
              </button>
              <button className="rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted">
                Add note
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function MetricPill({ label, value, tone, highlight }: { label: string; value: string; tone?: "warn"; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-2 ${highlight ? "border-gold bg-gold/10" : "border-border bg-surface"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-lg ${tone === "warn" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
