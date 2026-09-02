import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Calendar, AlertTriangle, FileText, Building2, Globe2, Users, ClipboardList, RotateCcw, History, CheckCircle2, StickyNote, Trash2 } from "lucide-react";
import { getLead, getAdvisor, ownerName, isBreachingSla, LEAD_META, LEAD_TRIAGE, type ResearchState } from "@/data/leads";
import { TodayLabel } from "@/components/today-label";

const SOURCE_BLURB: Record<string, string> = {
  Schwab: "Charles Schwab referral network — introduced through a Schwab branch relationship manager.",
  Fidelity: "Fidelity Wealth referral — introduced through a Fidelity branch representative.",
  Website: "Inbound web lead — submitted the contact form on the SEIA marketing site.",
  Seminar: "Attended a SEIA-hosted educational seminar or webinar.",
  Referral: "Client or partner referral — introduced by an existing SEIA relationship.",
};

export function LeadDetailView({ leadId }: { leadId: string }) {
  const lead = getLead(leadId);
  if (!lead) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <h2 className="font-display text-2xl">Lead not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">No lead with ID {leadId}.</p>
      </div>
    );
  }

  const advisor = getAdvisor(lead.ownerId);
  const breach = isBreachingSla(lead);
  const meta = LEAD_META[lead.id];
  const triage = LEAD_TRIAGE[lead.id];
  const sourceBlurb = SOURCE_BLURB[lead.source] ?? "";

  return (
    <div>
      <header className="border-b border-border pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
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
          <TodayLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <MetricPill label="Current stage" value={lead.stage} highlight />
          <MetricPill label="Est. AUM" value={`$${lead.estAum.toFixed(1)}M`} />
          <MetricPill label="Days in stage" value={lead.daysInStage.toString()} tone={breach ? "warn" : undefined} />
          <MetricPill label="PlanScout" value={lead.planScoutStatus} />
          <MetricPill
            label="Advisor"
            value={advisor ? advisor.name : "Not assigned yet"}
            tone={advisor ? undefined : "muted"}
          />
        </div>
      </header>

      {/* Referral-form snapshot + Assignment history — horizontal, full width */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Referral-form snapshot
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <SnapshotRow label="Source" value={lead.source} />
            <SnapshotRow label="Source branch" value={meta?.branch ?? "—"} />
            <SnapshotRow label="Submitting rep" value={triage?.submittingRep ?? "—"} />
            <SnapshotRow label="Stated need" value={triage?.statedNeed ?? "—"} />
            <SnapshotRow label="Opportunity band" value={triage?.opportunityBand ?? "—"} />
            <SnapshotRow label="Est. AUM" value={`$${lead.estAum.toFixed(1)}M`} />
            <SnapshotRow label="Region" value={meta?.region ?? "—"} />
            <SnapshotRow label="Program" value={meta?.program ?? "—"} />
          </dl>

          <div className="mt-6 grid grid-cols-1 gap-6 border-t border-border/60 pt-5 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Users className="h-3 w-3" /> Handled by
              </div>
              <div className="mt-1.5 font-display text-base">BDO — Kenji Ito</div>
              <div className="text-xs text-muted-foreground">Business Development Office</div>
              <div className="mt-2 space-y-1 text-xs text-foreground">
                <a href="mailto:k.ito@seia.com" className="flex items-center gap-1.5 hover:text-gold">
                  <Mail className="h-3 w-3" /> k.ito@seia.com
                </a>
                <a href="tel:+13105551247" className="flex items-center gap-1.5 hover:text-gold">
                  <Phone className="h-3 w-3" /> (310) 555-1247
                </a>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Assigned advisor</div>
              {advisor ? (
                <>
                  <Link
                    to="/advisors/$advisorId"
                    params={{ advisorId: advisor.id }}
                    className="mt-1.5 block font-display text-base hover:text-gold"
                  >
                    {advisor.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{advisor.title}</div>
                  <div className="mt-2 space-y-1 text-xs text-foreground">
                    <a href={`mailto:${advisor.email}`} className="flex items-center gap-1.5 hover:text-gold">
                      <Mail className="h-3 w-3" /> {advisor.email}
                    </a>
                    <a href={`tel:${advisor.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-1.5 hover:text-gold">
                      <Phone className="h-3 w-3" /> {advisor.phone}
                    </a>
                  </div>
                </>
              ) : (
                <div className="mt-1.5 text-sm italic text-muted-foreground">Advisor not assigned yet</div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <History className="h-3.5 w-3.5" /> Assignment history
          </div>
          <ol className="space-y-2 text-sm">
            {lead.timeline.map((ev: typeof lead.timeline[number], i: number) => (
              <li key={i} className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                <div>
                  <div className="font-medium">{ev.owner}</div>
                  <div className="text-xs text-muted-foreground">during {ev.stage}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(ev.at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Sidebar cards — laid out horizontally below */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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

        {lead.taxStrategy ? (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">PlanScout snapshot</div>
            <div className="mt-2 flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-gold" />
              <div className="text-sm">{lead.taxStrategy}</div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>


      {/* Research checklist + Rework log */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> Research checklist
          </div>
          <ul className="space-y-2">
            <ChecklistRow label="Catchlight enrichment" state={triage?.catchlight ?? "not_started"} />
            <ChecklistRow label="PlanScout analysis" state={triage?.planScout ?? "not_started"} />
            <ChecklistRow label="Discovery Prep (Claude)" state={triage?.discoveryPrep ?? "not_started"} />
          </ul>
          <div className="mt-4 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
            {triage && triage.catchlight === "done" && triage.planScout === "done" && triage.discoveryPrep === "done"
              ? "All three complete — ready for advisor handoff."
              : "Handoff gate: all three must be complete before advisor assignment."}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Rework log
          </div>
          {triage?.reworkReason ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">Returned to PlanScout</div>
              <p className="mt-1 text-sm text-foreground">{triage.reworkReason}</p>
              <p className="mt-2 text-xs text-muted-foreground">Awaiting revised draft from PlanScout.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No rework — lead has moved forward without being sent back.</p>
          )}
        </section>
      </div>

      <NotesBlock leadId={lead.id} />
    </div>
  );
}


function MetricPill({ label, value, tone, highlight }: { label: string; value: string; tone?: "warn" | "muted"; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-2 ${highlight ? "border-gold bg-gold/10" : "border-border bg-surface"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-lg ${tone === "warn" ? "text-destructive" : tone === "muted" ? "text-muted-foreground italic" : ""}`}>{value}</div>
    </div>
  );
}

function ChecklistRow({ label, state }: { label: string; state: ResearchState }) {
  const tone = state === "done"
    ? "text-emerald-700 dark:text-emerald-300"
    : state === "pending"
    ? "text-amber-700 dark:text-amber-300"
    : "text-muted-foreground";
  const icon = state === "done" ? "●" : state === "pending" ? "◐" : "○";
  const stateLabel = state === "done" ? "Complete" : state === "pending" ? "In progress" : "Not started";
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className={`h-4 w-4 ${state === "done" ? "text-emerald-600" : "text-muted-foreground/60"}`} />
        <span>{label}</span>
      </div>
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
        <span aria-hidden>{icon}</span>{stateLabel}
      </span>
    </li>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

type Note = { id: string; text: string; author: string; at: string };

function NotesBlock({ leadId }: { leadId: string }) {
  const storageKey = `lead-notes:${leadId}`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setNotes(JSON.parse(raw) as Note[]);
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch {}
  }, [notes, storageKey, hydrated]);

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    const note: Note = {
      id: crypto.randomUUID(),
      text,
      author: "BDO — Kenji Ito",
      at: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setDraft("");
  };

  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <StickyNote className="h-3.5 w-3.5" /> Notes
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              addNote();
            }
          }}
          placeholder="Add a note about this lead… (⌘/Ctrl + Enter to save)"
          rows={3}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={addNote}
          disabled={!draft.trim()}
          className="self-start rounded-full bg-gold px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
        >
          Add note
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">No notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-border/60 bg-background p-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-xs font-medium text-foreground">{n.author}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(n.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(n.id)}
                    aria-label="Delete note"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">{n.text}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
