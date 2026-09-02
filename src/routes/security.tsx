import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & Trust — SEIA Growth Labs" },
      {
        name: "description",
        content:
          "How SEIA Growth Labs keeps prospect data private across custodial, CRM, and planning systems — encryption, least-privilege access, audit trails, and incident response.",
      },
      { property: "og:title", content: "Security & Trust — SEIA Growth Labs" },
      {
        property: "og:description",
        content:
          "Encryption in transit and at rest, least-privilege access, custodial source of truth, audit trails, vendor due diligence, and incident response.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

const CONTROLS = [
  {
    head: "Encryption in transit & at rest",
    body: "All data exchanged between custodians, Salesforce, and PlanScout travels over TLS 1.2+ and is encrypted at rest with provider-managed AES-256.",
  },
  {
    head: "Least-privilege access",
    body: "BDO, PlanScout, and advisor teams see only the fields their stage requires. Role-based access is reviewed each quarter.",
  },
  {
    head: "Custodial source of truth",
    body: "Account and holdings data stays with Schwab and Fidelity. SEIA operates on read-only snapshots plus advisor-entered planning notes.",
  },
  {
    head: "Audit trail on every stage",
    body: "Each workflow stage writes an immutable event — actor, timestamp, action — used for SLA and compliance review.",
  },
  {
    head: "Vendor due diligence",
    body: "PlanScout and other sub-processors are reviewed annually for SOC 2 posture, breach history, and data-handling scope.",
  },
  {
    head: "Incident response",
    body: "A written playbook covers detection, containment, client notification windows, and post-mortem review across all systems in the flow.",
  },
];

function SecurityPage() {
  return (
    <section className="border-t border-sand/50 bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bark/70">
              Chapter · VII
            </div>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-ink md:text-5xl">
              Security &<br />
              <span className="italic">trust</span>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-soft">
              Client data moves through custodial, CRM, and planning systems that are individually
              audited and jointly monitored. This is a maintained overview of the controls that
              keep prospect information private end-to-end.
            </p>
            <p className="mt-4 text-[11px] italic text-bark/60">
              Reviewed by SEIA Growth Labs. Not an independent certification.
            </p>
          </div>
          <div className="md:col-span-8">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-sand/60 bg-sand/60 md:grid-cols-2">
              {CONTROLS.map((c) => (
                <div key={c.head} className="bg-background p-6">
                  <div className="font-serif text-lg text-ink">{c.head}</div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
