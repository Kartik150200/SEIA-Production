import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useMemo, useEffect } from "react";
import {
  Landmark,
  Building2,
  Search,
  RefreshCw,
  BrainCircuit,
  Users,
  Handshake,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Play,
  Pause,
  Clock,
  FileText,
  LineChart as LineChartIcon,
  Sparkles,
  Bot,
  Zap,
} from "lucide-react";

import { LEADS, ADVISORS, type Stage as LeadStage } from "@/data/leads";
import { AnimatedCounter, ScrollReveal } from "@/components/flourish";
import { LifecycleFigure, type Stage as LifecycleStage } from "@/components/lifecycle-figure";
import { SeiaLogoMark } from "@/components/site-theme";

// Small uppercase label above each node in Fig. 01.
const STAGE_KICKERS: Record<string, string> = {
  referral: "Referral",
  "crm-in": "SEIA",
  bdo: "BDO",
  "crm-out": "CRM",
  catchlight: "Catchlight",
  planscout: "PlanScout",
  claude: "Discovery",
  advisor: "Advisor",
  discovery: "Discovery",
  proposal: "Proposal",
  won: "Client",
};

export const Route = createFileRoute("/")({
  component: WorkflowPage,
  head: () => ({
    meta: [
      { title: "SEIA Growth Labs — The Architecture of Wealth Growth" },
      {
        name: "description",
        content:
          "A human-centric view of how SEIA turns Schwab and Fidelity referrals into signed clients — through Salesforce, BDO research, PlanScout planning, and the advisor team.",
      },
      { property: "og:title", content: "SEIA Growth Labs — The Architecture of Wealth Growth" },
      {
        property: "og:description",
        content:
          "The editorial view of SEIA's lead-to-client journey: four teams, eleven stages, one seamless process.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

// ─── Stage model ────────────────────────────────────────────────────────
type Lane = "Custodian" | "SEIA CRM" | "BDO" | "Catchlight" | "PlanScout" | "Claude" | "Advisors";
const LANES: Lane[] = [
  "Custodian",
  "SEIA CRM",
  "BDO",
  "Catchlight",
  "PlanScout",
  "Claude",
  "Advisors",
];

type Stage = {
  id: string;
  step: string;
  title: string;
  lane: Lane;
  actor: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  inputs: string[];
  outputs: string[];
  tools: string[];
  sla: string;
  leadStage: LeadStage;
};

const STAGES: Stage[] = [
  {
    id: "referral",
    step: "I",
    title: "Referral Intake",
    lane: "Custodian",
    actor: "Schwab · Fidelity",
    icon: Landmark,
    leadStage: "Referral Intake",
    summary: "Qualified prospects flow in from trusted custodian referral programs.",
    inputs: ["Custodian referral file", "Lead AUM estimate", "Contact info"],
    outputs: ["Tagged Lead record", "Source attribution"],
    tools: ["Schwab AAP", "Fidelity WA"],
    sla: "Same day",
  },
  {
    id: "crm-in",
    step: "II",
    title: "SEIA CRM Intake",
    lane: "SEIA CRM",
    actor: "Salesforce",
    icon: Building2,
    leadStage: "SEIA CRM Intake",
    summary: "Salesforce is the spine. Every hand-off is logged and routed.",
    inputs: ["Raw referral", "Existing lead match"],
    outputs: ["De-duped Lead", "BDO queue assignment"],
    tools: ["Salesforce", "Duplicate rules"],
    sla: "< 1 business day",
  },
  {
    id: "bdo",
    step: "III",
    title: "BDO Research",
    lane: "BDO",
    actor: "Business Development Office",
    icon: Search,
    leadStage: "BDO Research",
    summary: "BDO enriches the lead with proprietary research and lead context.",
    inputs: ["Lead record", "Public data", "Wealth signals"],
    outputs: ["Discovery brief", "Lead map", "Liquidity events"],
    tools: ["ZoomInfo", "WealthEngine", "Internal deck"],
    sla: "2–3 business days",
  },
  {
    id: "crm-out",
    step: "IV",
    title: "CRM Handoff",
    lane: "SEIA CRM",
    actor: "Salesforce",
    icon: RefreshCw,
    leadStage: "CRM Handoff",
    summary: "Enriched record returns to Salesforce and is routed for enrichment.",
    inputs: ["BDO brief", "Enriched Lead"],
    outputs: ["Catchlight task", "Advisor pre-assignment"],
    tools: ["Salesforce Flow"],
    sla: "Same day",
  },
  {
    id: "catchlight",
    step: "V",
    title: "Catchlight Enrich",
    lane: "Catchlight",
    actor: "Catchlight AI",
    icon: Zap,
    leadStage: "CRM Handoff",
    summary: "AI enrichment scores the prospect and predicts likelihood-to-close.",
    inputs: ["Enriched Lead", "Public wealth signals"],
    outputs: ["Catchlight score", "Persona tags", "Predicted AUM"],
    tools: ["Catchlight"],
    sla: "< 1 business day",
  },
  {
    id: "planscout",
    step: "VI",
    title: "PlanScout Analysis",
    lane: "PlanScout",
    actor: "AI Financial Planning",
    icon: BrainCircuit,
    leadStage: "PlanScout Analysis",
    summary: "Outsourced planning + SIPS software drafts a client-ready plan.",
    inputs: ["Structured interview", "Tax profile", "Assets & liabilities"],
    outputs: ["Retirement plan", "Tax strategy", "Cash-flow forecast", "Visual snapshot"],
    tools: ["PlanScout", "SIPS"],
    sla: "3–5 business days · saves ~13 advisor hours",
  },
  {
    id: "claude",
    step: "VII",
    title: "Discovery Prep",
    lane: "Claude",
    actor: "Claude AI assistant",
    icon: Bot,
    leadStage: "Advisor Plan",
    summary: "Claude summarizes the plan and drafts talking points for the advisor.",
    inputs: ["PlanScout deliverables", "Lead brief"],
    outputs: ["Executive summary", "Discovery talking points", "Objection map"],
    tools: ["Claude"],
    sla: "< 1 business day",
  },
  {
    id: "advisor",
    step: "VIII",
    title: "Advisor Plan",
    lane: "Advisors",
    actor: "SEIA Advisor",
    icon: Users,
    leadStage: "Advisor Plan",
    summary: "A named advisor tailors the deliverable and shapes the pitch.",
    inputs: ["PlanScout deliverables", "Discovery prep brief", "Prospect goals"],
    outputs: ["Discovery agenda", "Tailored recommendations", "Pitch deck"],
    tools: ["Salesforce", "Custom talking points"],
    sla: "2–3 business days",
  },
  {
    id: "discovery",
    step: "IX",
    title: "Discovery Meeting",
    lane: "Advisors",
    actor: "Advisor ↔ Prospect",
    icon: Handshake,
    leadStage: "Discovery Meeting",
    summary: "Walked through the plan end-to-end. Fees, scope, next steps confirmed.",
    inputs: ["Tailored plan", "Discovery agenda"],
    outputs: ["Meeting notes", "Confirmed scope & fees", "Open questions"],
    tools: ["Zoom / in-person", "Salesforce notes"],
    sla: "1 meeting · follow-up within 1 week",
  },
  {
    id: "proposal",
    step: "X",
    title: "Proposal",
    lane: "Advisors",
    actor: "SEIA Advisor",
    icon: FileText,
    leadStage: "Discovery Meeting",
    summary:
      "Advisor turns the discovery into a written proposal — scope, fees, IMA — sent to the prospect for signature.",
    inputs: ["Discovery meeting notes", "Confirmed scope & fees", "Tailored plan"],
    outputs: ["Written proposal", "Fee schedule", "IMA sent for signature"],
    tools: ["Salesforce", "DocuSign", "Proposal template"],
    sla: "2–3 business days · signature within 1 week",
  },
  {
    id: "won",
    step: "XI",
    title: "Client Won",
    lane: "Advisors",
    actor: "Onboarding",
    icon: CheckCircle2,
    leadStage: "Client Won",
    summary: "Prospect signs — moves to onboarding & ongoing advisory.",
    inputs: ["Signed IMA", "Custodian paperwork"],
    outputs: ["Funded accounts", "Advisory cadence started"],
    tools: ["Custodian portal", "Salesforce", "Planning cadence"],
    sla: "5–10 business days to funded",
  },
];

// ─── Real YTD funnel (from the Growth Labs source-of-truth flowchart) ──
import { FUNNEL } from "@/data/funnel";
export { FUNNEL };

// ─── Metrics ────────────────────────────────────────────────────────────
function computeMetrics() {
  const total = FUNNEL.referrals;
  const won = FUNNEL.wonClients;
  const open = total - won;
  const pipelineAum = FUNNEL.aumAddedM;
  const totalAum = LEADS.reduce((s, l) => s + l.estAum, 0);
  const avgDays = ADVISORS.reduce((s, a) => s + a.avgDaysToClose, 0) / ADVISORS.length;
  const captureRate = total > 0 ? won / total : 0;
  const counts: Record<LeadStage, number> = {
    "Referral Intake": 0,
    "SEIA CRM Intake": 0,
    "BDO Research": 0,
    "CRM Handoff": 0,
    "PlanScout Analysis": 0,
    "Advisor Plan": 0,
    "Discovery Meeting": 0,
    "Client Won": 0,
  };
  LEADS.forEach((l) => {
    counts[l.stage] += 1;
  });
  return { total, won, open, pipelineAum, totalAum, avgDays, captureRate, counts };
}


// ─── Page ───────────────────────────────────────────────────────────────
function WorkflowPage() {
  const [activeId, setActiveId] = useState<string>("planscout");
  const [playing, setPlaying] = useState(false);
  const [markerIdx, setMarkerIdx] = useState(0);
  const workflowRef = useRef<HTMLElement>(null);
  const metrics = useMemo(() => computeMetrics(), []);
  const active = STAGES.find((s) => s.id === activeId) ?? STAGES[0];

  // STAGES adapted for the LifecycleFigure — same content plus the small
  // uppercase kicker rendered above each node in Fig. 01.
  const lifecycleStages: LifecycleStage[] = useMemo(
    () =>
      STAGES.map((s) => ({
        id: s.id,
        step: s.step,
        kicker: STAGE_KICKERS[s.id] ?? s.title.split(" ")[0],
        title: s.title,
        lane: s.lane,
        actor: s.actor,
        summary: s.summary,
        inputs: s.inputs,
        outputs: s.outputs,
        tools: s.tools,
        sla: s.sla,
      })),
    [],
  );


  // Sample lead animation
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setMarkerIdx((i) => {
        const next = i + 1;
        if (next >= STAGES.length) {
          setPlaying(false);
          return STAGES.length - 1;
        }
        setActiveId(STAGES[next].id);
        return next;
      });
    }, 1400);
    return () => clearInterval(t);
  }, [playing]);

  const startWalkthrough = () => {
    setMarkerIdx(0);
    setActiveId(STAGES[0].id);
    setPlaying(true);
    workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToWorkflow = () =>
    workflowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sampleLead = LEADS.find((l) => l.id === "L-1042") ?? LEADS[0];

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center lg:pt-28">
        <span className="mb-6 block text-[11px] font-semibold uppercase tracking-[0.28em] text-bark/60">
          Volume I &nbsp;·&nbsp; SEIA Growth Labs
        </span>
        <h1 className="font-serif text-5xl leading-[1.05] text-ink md:text-7xl">
          The Architecture
          <br />
          <span className="italic text-bark">of</span> Wealth Growth.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg font-light leading-relaxed text-ink-soft">
          A human-centric view of how a Schwab or Fidelity referral becomes a signed SEIA client —
          through four teams, one editorial process, and a plan delivered before the first meeting.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[11px] uppercase tracking-[0.24em]">
          <button
            onClick={scrollToWorkflow}
            className="group inline-flex items-center gap-2 border-b border-bark pb-1 text-bark transition-colors hover:text-ink"
          >
            Explore the eleven stages
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={startWalkthrough}
            className="inline-flex items-center gap-2 text-bark/70 transition-colors hover:text-ink"
          >
            <Play className="h-3 w-3" />
            Follow a sample lead
          </button>
        </div>
      </header>


      {/* ── What is Growth Labs ─────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-[95rem] grid-cols-1 gap-10 px-4 py-24 md:grid-cols-12 md:items-start lg:gap-16 lg:px-8">
        <div className="md:col-span-4 lg:col-span-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-bark/60">
            The Editorial
          </span>
          <h2 className="mt-3 font-serif text-3xl italic text-ink md:text-4xl">
            What is Growth Labs?
          </h2>
          <p className="mt-6 leading-relaxed">
            Growth Labs is SEIA's operating almanac for turning referrals into relationships. It's
            the single, transparent view of how a lead moves from custodian to signed client —
            logged in Salesforce, enriched by BDO, planned by PlanScout, and shaped by a named
            advisor.
          </p>
          <p className="mt-5 leading-relaxed">
            Prospects, partners, and internal stakeholders can see exactly what happens at every
            stage — no black boxes, no dropped batons.
          </p>
        </div>
        <div className="md:col-span-8 lg:col-span-9">
          <div className="relative flex h-full flex-col justify-between rounded-sm border border-sand/60 bg-cream p-10 paper-grain">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bark/60">
                Fig. 01 — Preview
              </div>
              <p className="mt-6 font-serif text-3xl italic leading-snug text-ink md:text-4xl">
                Eleven stages. Seven teams. One diagonal descent from a Schwab
                referral to a signed client — plotted below with every hand-off
                logged.
              </p>
            </div>
            <a
              href="#workflow"
              className="mt-10 inline-flex items-center gap-2 self-start border-b border-bark pb-1 text-[11px] uppercase tracking-[0.24em] text-bark transition-colors hover:text-ink"
            >
              Read the full figure
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>


      {/* ── Four-team journey ───────────────────────────────── */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex items-end justify-between border-b border-sand/50 pb-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-bark/60">
                The Cast
              </span>
              <h2 className="mt-3 font-serif text-3xl italic text-ink md:text-4xl">
                Four teams. One seamless journey.
              </h2>
            </div>
            <span className="hidden text-[11px] uppercase tracking-[0.24em] text-bark/60 md:block">
              Roles &amp; Responsibilities
            </span>
          </div>
          <div className="grid gap-px bg-sand/40 md:grid-cols-4">
            <TeamCard
              num="01"
              title="Schwab & Fidelity"
              sub="Referral Sources"
              body="Custodial foundation. Qualified prospects enter the pipeline through trusted institutional referral programs."
            />
            <TeamCard
              num="02"
              title="Salesforce + BDO"
              sub="Intake & Research"
              body="Salesforce de-dupes and routes. The Business Development Office enriches every lead with proprietary research."
            />
            <TeamCard
              num="03"
              title="PlanScout"
              sub="AI Planning Engine"
              body="Outsourced planning plus the SIPS software — models tax, Social Security, and multi-year cash-flow scenarios."
            />
            <TeamCard
              num="04"
              title="SEIA Advisors"
              sub="Conversion & Advice"
              body="Named advisors tailor the plan, run discovery, and convert the lead into a lifelong client relationship."
            />
          </div>
        </div>
      </section>

      {/* ── Workflow Centerpiece ────────────────────────────── */}
      <section id="workflow" ref={workflowRef} className="scroll-mt-24 py-24">
        <div className="mx-auto max-w-[95rem] px-4 lg:px-8">
          <div className="mb-4 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-bark/60">
              The Centerpiece
            </span>
            <h2 className="mt-3 font-serif text-4xl italic text-ink md:text-5xl">
              The Eleven-Stage Lifecycle
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              A compact swimlane chart of the referral-to-client journey. Click any stage for the
              inputs, outputs, and hand-offs — or watch a sample lead move through it.
            </p>
          </div>

          {/* Walkthrough controls */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.22em]">
            <button
              onClick={() => {
                const p = Math.max(0, markerIdx - 1);
                setMarkerIdx(p);
                setActiveId(STAGES[p].id);
              }}
              disabled={markerIdx === 0}
              className="border border-bark/40 px-3 py-2 text-bark transition-colors hover:bg-bark hover:text-paper disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => (playing ? setPlaying(false) : startWalkthrough())}
              className="inline-flex items-center gap-2 border border-bark bg-bark px-4 py-2 text-paper transition-colors hover:bg-ink"
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {playing ? "Pause tour" : "Start guided tour"}
            </button>
            <button
              onClick={() => {
                const n = Math.min(STAGES.length - 1, markerIdx + 1);
                setMarkerIdx(n);
                setActiveId(STAGES[n].id);
              }}
              disabled={markerIdx === STAGES.length - 1}
              className="border border-bark/40 px-3 py-2 text-bark transition-colors hover:bg-bark hover:text-paper disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next →
            </button>
            <div className="ml-2 text-bark/60">
              Step <span className="font-serif italic text-ink">{markerIdx + 1}</span> of{" "}
              {STAGES.length}
              &nbsp;·&nbsp;
              <span className="text-ink">{sampleLead.name}</span>
            </div>
          </div>

          {/* Tour progress bar */}
          <div className="mx-auto mt-4 h-0.5 w-full max-w-3xl overflow-hidden bg-sand/40">
            <div
              className="h-full bg-bark transition-all duration-700"
              style={{ width: `${((markerIdx + 1) / STAGES.length) * 100}%` }}
            />
          </div>

          {/* Status legend — mirrors the badges used across the Dashboard */}
          <div
            role="group"
            aria-label="Stage status legend"
            className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-[11px]"
          >
            <span className="mr-1 text-[10px] uppercase tracking-[0.22em] text-bark/60">
              Status key
            </span>
            <span
              tabIndex={0}
              title="Within SLA — the stage is on pace and no action is needed."
              aria-label="Within SLA — the stage is on pace and no action is needed."
              className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
              Within SLA
            </span>
            <span
              tabIndex={0}
              title="Needs attention — approaching the SLA deadline; owner should follow up."
              aria-label="Needs attention — approaching the SLA deadline; owner should follow up."
              className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              Needs attention
            </span>
            <span
              tabIndex={0}
              title="Breached — the stage has exceeded its SLA; escalate immediately."
              aria-label="Breached — the stage has exceeded its SLA; escalate immediately."
              className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden />
              Breached
            </span>
          </div>

          {/* Unified Fig.01 schematic + lifecycle detail panel */}
          <div className="mt-6">
            <LifecycleFigure
              stages={lifecycleStages}
              activeId={activeId}
              onSelect={setActiveId}
              markerIdx={markerIdx}
              playing={playing}
              sampleLeadName={sampleLead.name}
            />
          </div>


        </div>
      </section>


      {/* ── PlanScout deep-dive ─────────────────────────────── */}
      <section className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <div className="inline-flex items-center gap-2 border border-bark/30 bg-background px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-bark">
                <Sparkles className="h-3 w-3" />A closer read
              </div>
              <h2 className="mt-6 font-serif text-4xl italic text-ink md:text-5xl">
                Plans built in days,
                <br />
                not weeks.
              </h2>
              <p className="mt-6 text-ink-soft">
                PlanScout is an outsourced financial-planning service and software provider for
                licensed advisors. It drafts comprehensive, client-ready retirement, tax, and
                cash-flow plans — so advisors can focus on the relationship, not the spreadsheet.
              </p>
              <div className="mt-8 space-y-4">
                <Avenue
                  title="Outsourced plan development"
                  body="Advisors submit client details through a structured interview. PlanScout's team drafts a tailored plan, reviewed with the advisor before delivery."
                />
                <Avenue
                  title="SIPS planning system"
                  body="Financial professionals model tax scenarios, Social Security optimization, and multi-year cash-flow forecasts inside the SIPS software."
                />
              </div>
            </div>
            <div className="md:col-span-7">
              <ul className="divide-y divide-sand/50 border-y border-sand/50">
                <BenefitRow
                  icon={Clock}
                  head="Time savings"
                  body="Average plan creation drops from ~15 hours to ~2 hours of advisor effort."
                  big="~13 hrs"
                  small="saved / plan"
                />
                <BenefitRow
                  icon={LineChartIcon}
                  head="Tax optimization"
                  body="After-tax income strategies: IRA conversions, Social Security timing, annuity placement."
                  big="After-tax"
                  small="focus"
                />
                <BenefitRow
                  icon={FileText}
                  head="Visual deliverables"
                  body="Engaging snapshots and talking points that advisors can hand directly to clients."
                  big="Client-ready"
                  small="snapshots"
                />
                <BenefitRow
                  icon={CheckCircle2}
                  head="Fast turnaround"
                  body="Client-ready retirement, tax, and cash-flow plans delivered in 3–5 business days."
                  big="3–5d"
                  small="delivery"
                />
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* ── FAQ ──────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-24 border-t border-sand/50 bg-background py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
            <div className="md:col-span-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bark/70">
                Chapter · VIII
              </div>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-ink md:text-5xl">
                Frequently
                <br />
                <span className="italic">asked</span>
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-soft">
                The questions advisors, operations leads, and prospective clients ask most often
                about the Growth Labs workflow.
              </p>
            </div>
            <div className="md:col-span-8">
              <dl className="divide-y divide-sand/60 border-y border-sand/60">
                {[
                  {
                    q: "How long does the full workflow take?",
                    a: "From referral intake to a signed client the median is 21 business days. PlanScout accounts for 3–5 of those days; discovery scheduling is usually the longest single step.",
                  },
                  {
                    q: "Where do leads come from?",
                    a: "Primarily custodial referrals from Schwab and Fidelity, supplemented by seminars, direct website inquiries, and client referrals. Every source enters the same 10-stage pipeline.",
                  },
                  {
                    q: "What does PlanScout actually produce?",
                    a: "A client-ready plan covering retirement cash-flow, tax strategy, and Social Security timing — delivered as a visual snapshot with talking points the advisor presents in discovery.",
                  },
                  {
                    q: "How is prospect data protected?",
                    a: "Data moves over encrypted channels between vetted sub-processors, stays scoped to the team handling the current stage, and is logged with an auditable event trail. See the Security & Trust page for details.",
                  },
                  {
                    q: "What happens if a stage misses its SLA?",
                    a: "The Dashboard flags SLA breaches in real time, escalates to the stage owner, and surfaces the lead in the Pipeline Overview so it does not go cold.",
                  },
                  {
                    q: "Is this a live production system?",
                    a: "This site is a demonstration UI built to visualize the SEIA Growth Labs workflow. Numbers reflect representative pipeline data, not live client records.",
                  },
                ].map((f) => (
                  <FaqRow key={f.q} question={f.q} answer={f.a} />
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* ── Get started ───────────────────────────────── */}
      <section id="demo" className="scroll-mt-24 border-t border-sand/50 bg-paper py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bark/70">
                Chapter · IX
              </div>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-ink md:text-5xl">
                See it on <span className="italic">your book</span>
              </h2>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
                Sign in to wire the eleven-stage pipeline to your Schwab and Fidelity referrals,
                track the PlanScout hand-off in context, and open the dashboard views your team will
                use on Monday morning.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-ink-soft">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-gold" /> Live funnel tailored to your
                  referrals
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-gold" /> No prep — import one CSV of
                  recent referrals
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-gold" /> Guidance on Schwab /
                  Fidelity / Salesforce wiring
                </li>
              </ul>
            </div>
            <div className="md:col-span-5">
              <div className="rounded-2xl border border-sand/70 bg-background p-8 shadow-elegant">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">
                  Private preview
                </div>
                <h3 className="mt-3 font-serif text-2xl text-ink">Growth Labs</h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Reserved for advisors, operations leads, and RIA principals.
                </p>
                <Link
                  to="/auth"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-paper transition-colors hover:bg-bark"
                >
                  Sign in
                </Link>
                <div className="mt-3 text-[11px] text-ink-soft">
                  Reserved access — advisors, ops, and RIA principals.
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-sand/50 bg-background py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <h3 className="flex items-center gap-3 font-serif text-2xl italic text-ink">
                <SeiaLogoMark />
                <span>Growth Labs</span>
              </h3>
              <p className="mt-4 max-w-sm text-sm text-ink-soft">
                An editorial view of the SEIA lead-to-client process — cultivating financial
                legacies with institutional rigor and a human touch.
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="grid grid-cols-2 gap-12 md:grid-cols-3">
                <FooterCol
                  head="Navigate"
                  items={[
                    ["Workflow", "/"],
                    ["Dashboard", "/dashboard"],
                    ["Integrations", "/integrations"],
                    ["Security", "/security"],
                  ]}
                />
                <FooterCol
                  head="Integrations"
                  items={[
                    ["Salesforce", "#"],
                    ["PlanScout", "#"],
                    ["Schwab & Fidelity", "#"],
                  ]}
                />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">
                    Quarterly Almanac
                  </div>
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    className="mt-5 flex items-center border-b border-sand"
                  >
                    <input
                      type="email"
                      placeholder="you@firm.com"
                      className="w-full bg-transparent py-2 text-sm text-ink placeholder:text-bark/40 focus:outline-none"
                    />
                    <button
                      className="text-bark transition-colors hover:text-ink"
                      aria-label="Subscribe"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-sand/40 pt-6 text-[10px] uppercase tracking-[0.24em] text-bark/60 md:flex-row md:items-center">
            <span>© {new Date().getFullYear()} SEIA Growth Labs · Demo UI</span>
            <span className="font-serif text-xs italic normal-case tracking-normal text-bark/60">
              Set in Libre Baskerville &amp; IBM Plex Sans.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── Small components ────────────────────────────────────────────────────


function FaqRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-6 text-left"
        aria-expanded={open}
      >
        <span className="font-serif text-lg leading-snug text-ink">{question}</span>
        <span
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sand text-bark transition-transform ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      {open && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{answer}</p>}
    </div>
  );
}


function TeamCard({
  num,
  title,
  sub,
  body,
}: {
  num: string;
  title: string;
  sub: string;
  body: string;
}) {
  return (
    <div className="bg-cream p-8">
      <div className="font-serif text-3xl italic text-bark/50">{num}</div>
      <div className="mt-8 text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/60">
        {sub}
      </div>
      <h3 className="mt-2 font-serif text-xl text-ink">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}


function Avenue({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-bark pl-4">
      <h4 className="font-serif text-lg italic text-ink">{title}</h4>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </div>
  );
}

function BenefitRow({
  icon: Icon,
  head,
  body,
  big,
  small,
}: {
  icon: React.ComponentType<{ className?: string }>;
  head: string;
  body: string;
  big: string;
  small: string;
}) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-6 py-6">
      <div className="mt-1 rounded-full border border-bark/30 p-2">
        <Icon className="h-4 w-4 text-bark" />
      </div>
      <div>
        <h4 className="font-serif text-lg text-ink">{head}</h4>
        <p className="mt-1 text-sm text-ink-soft">{body}</p>
      </div>
      <div className="text-right">
        <div className="font-serif text-2xl italic text-ink">{big}</div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-bark/60">{small}</div>
      </div>
    </li>
  );
}

function FooterCol({ head, items }: { head: string; items: [string, string][] }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">
        {head}
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        {items.map(([label, href]) => {
          const isInternal = href.startsWith("/");
          return (
            <li key={label}>
              {isInternal ? (
                <Link to={href} className="text-ink-soft transition-colors hover:text-ink">
                  {label}
                </Link>
              ) : (
                <a href={href} className="text-ink-soft transition-colors hover:text-ink">
                  {label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

