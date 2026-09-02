import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Plug, ExternalLink, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — SEIA Growth Labs" },
      {
        name: "description",
        content:
          "The tools SEIA Growth Labs connects to across the lead nurturing lifecycle — from custodial referrals to CRM, enrichment, planning, and AI content.",
      },
      { property: "og:title", content: "Integrations — SEIA Growth Labs" },
      {
        property: "og:description",
        content:
          "Salesforce, Schwab, Fidelity, Catchlight, PlanScout, Claude and more — the connected stack that powers Growth Labs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntegrationsPage,
});

type Status = "connected" | "available" | "coming-soon";

type Integration = {
  name: string;
  category: string;
  blurb: string;
  status: Status;
  glyph: string;
};

const INTEGRATIONS: Integration[] = [
  {
    name: "Salesforce",
    category: "CRM & System of Record",
    blurb:
      "Bi-directional sync of leads, opportunities, and stage transitions. Every referral, note, and hand-off lives in Salesforce as the single source of truth.",
    status: "connected",
    glyph: "SF",
  },
  {
    name: "Schwab Advisor Center",
    category: "Custodial Referrals",
    blurb:
      "Inbound referral feed from Schwab's referral network with account context, estimated investable assets, and advisor routing rules.",
    status: "connected",
    glyph: "SC",
  },
  {
    name: "Fidelity Wealth Advisor Solutions",
    category: "Custodial Referrals",
    blurb:
      "Fidelity WAS referral intake with prospect profile, referring branch, and priority tier flowing straight into the BDO queue.",
    status: "connected",
    glyph: "FI",
  },
  {
    name: "Catchlight",
    category: "Lead Enrichment",
    blurb:
      "Automated wealth and lead enrichment — investable-asset estimates, life events, and conversion scoring appended to every lead.",
    status: "connected",
    glyph: "CL",
  },
  {
    name: "PlanScout",
    category: "Financial Planning",
    blurb:
      "Outsourced plan development and the SIPS retirement planning engine. Draft plans returned in 3–5 business days for advisor review.",
    status: "connected",
    glyph: "PS",
  },
  {
    name: "Claude (Anthropic)",
    category: "AI Content & Insights",
    blurb:
      "Meeting-prep briefs, tailored proposal narratives, and follow-up drafts generated from enriched lead + plan context.",
    status: "connected",
    glyph: "CL",
  },
  {
    name: "Google Workspace",
    category: "Communication",
    blurb:
      "Gmail threads, Calendar meetings, and Drive artifacts logged against the corresponding Salesforce record.",
    status: "available",
    glyph: "GW",
  },
  {
    name: "Microsoft 365",
    category: "Communication",
    blurb:
      "Outlook, Teams, and OneDrive sync for advisor teams working inside the Microsoft stack.",
    status: "available",
    glyph: "M365",
  },
  {
    name: "Zoom",
    category: "Meetings",
    blurb: "Discovery-call recordings, transcripts, and attendance attached to the lead timeline.",
    status: "available",
    glyph: "ZM",
  },
  {
    name: "DocuSign",
    category: "Onboarding",
    blurb:
      "Client agreement, ADV acknowledgement, and custodial paperwork routed for signature once a proposal is accepted.",
    status: "available",
    glyph: "DS",
  },
  {
    name: "Snowflake",
    category: "Analytics Warehouse",
    blurb:
      "Nightly export of lead, activity, and AUM data for firmwide reporting and executive dashboards.",
    status: "coming-soon",
    glyph: "SN",
  },
  {
    name: "Slack",
    category: "Internal Alerts",
    blurb:
      "SLA breaches, high-value referrals, and won-deal celebrations pushed to the advisor channel.",
    status: "coming-soon",
    glyph: "SL",
  },
];

const STATUS_COPY: Record<Status, { label: string; className: string }> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  available: {
    label: "Available",
    className: "bg-sand text-bark border-bark/20",
  },
  "coming-soon": {
    label: "Coming soon",
    className: "bg-paper text-bark/70 border-sand",
  },
};

function IntegrationsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-bark/70">
          Fig. 03 · The connected stack
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Integrations
        </h1>
        <p className="mt-4 text-base text-bark/80">
          Growth Labs stitches together the tools SEIA already uses — custodial referral feeds,
          Salesforce as the CRM backbone, Catchlight for enrichment, PlanScout for financial plans,
          and Claude for advisor-ready content. Every stage of the ten-stage lifecycle writes back
          to the same record.
        </p>
      </header>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((it) => (
          <article
            key={it.name}
            className="group relative flex flex-col rounded-xl border border-sand bg-paper/60 p-5 transition-shadow hover:shadow-elegant"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sand bg-background font-serif text-sm text-ink">
                  {it.glyph}
                </div>
                <div>
                  <h3 className="font-serif text-lg text-ink">{it.name}</h3>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-bark/60">
                    {it.category}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_COPY[it.status].className}`}
              >
                {it.status === "connected" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Plug className="h-3 w-3" />
                )}
                {STATUS_COPY[it.status].label}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-bark/80">{it.blurb}</p>
            <div className="mt-4 flex items-center justify-between border-t border-sand/70 pt-3 text-[11px] uppercase tracking-wider text-bark/60">
              <span>Docs</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
          </article>
        ))}
      </section>

      <section className="mt-16 rounded-2xl border border-sand bg-paper/60 p-8 text-center">
        <h2 className="font-serif text-2xl text-ink">Want a walkthrough of the stack?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-bark/80">
          Get instant access to the live dashboard and see how every integration fires across a real
          lead's journey.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-bark px-6 py-2.5 text-xs uppercase tracking-[0.24em] text-paper transition-colors hover:bg-ink"
          >
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
