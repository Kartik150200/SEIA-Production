// Real YTD funnel — single source of truth.
// Provided by the Growth Labs flowchart (Screenshot: 125→75→50→45→21, $16.5M AUM).
// Both the homepage FunnelBand and the LeadSimulator read from here so the
// two views can't drift apart.

export const FUNNEL = {
  referrals: 125,
  qualified: 75,
  meetings: 50,
  proposals: 45,
  wonClients: 21,
  aumAddedM: 16.5, // $M
} as const;

// Derived pass-through rates (measured).
export const FUNNEL_RATES = {
  qualifiedOfReferrals: FUNNEL.qualified / FUNNEL.referrals,       // 60%
  meetingsOfQualified: FUNNEL.meetings / FUNNEL.qualified,         // 66.7%
  proposalsOfMeetings: FUNNEL.proposals / FUNNEL.meetings,         // 90%
  wonOfProposals: FUNNEL.wonClients / FUNNEL.proposals,            // 46.7%
  endToEndCapture: FUNNEL.wonClients / FUNNEL.referrals,           // 16.8%
} as const;

// Per-source breakdown of the YTD funnel (totals reconcile to FUNNEL).
export type SourceKey = "Schwab" | "Fidelity" | "Website" | "Seminars" | "Client Referral";

export const SOURCE_FUNNEL: {
  name: SourceKey;
  referrals: number;
  qualified: number;
  meetings: number;
  proposals: number;
  won: number;
  aumM: number;
  color: string;
}[] = [
  { name: "Schwab",          referrals: 58, qualified: 36, meetings: 25, proposals: 23, won: 11, aumM: 8.6, color: "oklch(0.75 0.14 82)" },
  { name: "Fidelity",        referrals: 41, qualified: 25, meetings: 16, proposals: 14, won: 6,  aumM: 4.9, color: "oklch(0.65 0.15 200)" },
  { name: "Client Referral", referrals: 12, qualified: 8,  meetings: 5,  proposals: 5,  won: 3,  aumM: 2.1, color: "oklch(0.72 0.16 150)" },
  { name: "Seminars",        referrals: 9,  qualified: 4,  meetings: 3,  proposals: 2,  won: 1,  aumM: 0.6, color: "oklch(0.68 0.13 300)" },
  { name: "Website",         referrals: 5,  qualified: 2,  meetings: 1,  proposals: 1,  won: 0,  aumM: 0.3, color: "oklch(0.7 0.13 170)" },
];

// Pipeline aging buckets (open leads, i.e. not yet Won or Lost).
export const PIPELINE_AGING = [
  { label: "Fresh (<1W)",    value: 46, tone: "won" as const },
  { label: "Active (1W–1M)", value: 38, tone: "hub" as const },
  { label: "Aging (1–2M)",   value: 15, tone: "ai" as const },
  { label: "Stalled (2M+)",  value: 5,  tone: "danger" as const },
];

// SLA compliance by hand-off (percentage of leads meeting the target turnaround).
export const SLA_BY_STAGE = [
  { stage: "Custodian → CRM",     target: "Same day",   within: 96, breached: 4 },
  { stage: "CRM → BDO",           target: "< 1 day",    within: 91, breached: 9 },
  { stage: "BDO Research",        target: "2–3 days",   within: 84, breached: 16 },
  { stage: "Catchlight enrich",   target: "< 1 day",    within: 97, breached: 3 },
  { stage: "PlanScout draft",     target: "3–5 days",   within: 88, breached: 12 },
  { stage: "Claude content",      target: "< 1 day",    within: 95, breached: 5 },
  { stage: "Advisor → Discovery", target: "2–3 days",   within: 79, breached: 21 },
];
