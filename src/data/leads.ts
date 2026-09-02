// Shared mock data for leads, advisors, and pipeline stages.
// Consumed by dashboard, leads list, lead detail, and advisor profile.

export type Source = "Schwab" | "Fidelity" | "Website" | "Seminar" | "Referral";

export const STAGES = [
  "Referral Intake",
  "SEIA CRM Intake",
  "BDO Research",
  "CRM Handoff",
  "PlanScout Analysis",
  "Advisor Plan",
  "Discovery Meeting",
  "Client Won",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_SLA_DAYS: Record<Stage, number> = {
  "Referral Intake": 1,
  "SEIA CRM Intake": 1,
  "BDO Research": 3,
  "CRM Handoff": 1,
  "PlanScout Analysis": 5,
  "Advisor Plan": 3,
  "Discovery Meeting": 7,
  "Client Won": 0,
};

export type StageEvent = {
  stage: Stage;
  at: string; // ISO
  owner: string;
  note?: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  source: Source;
  stage: Stage;
  ownerId: string; // advisor id (or "bdo-01" during BDO stages)
  estAum: number; // in $M
  daysInStage: number;
  nextAction: string;
  nextActionDate: string; // ISO date
  planScoutStatus: "Not started" | "In progress" | "Delivered";
  taxStrategy?: string;
  notes: string[];
  timeline: StageEvent[];
};

export type Advisor = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  bookAum: number; // $M — matches Advisor performance table
  leads: number;
  meetings: number;
  proposals: number;
  won: number;
  winRate: number; // 0-1
  avgDaysToClose: number;
  monthlyWins: { month: string; wins: number }[];
  sourceMix: { source: Source; pct: number }[];
};

export const ADVISORS: Advisor[] = [

  {
    id: "adv-alvarez",
    name: "Maya Alvarez",
    title: "Senior Wealth Advisor",
    email: "m.alvarez@seia.example",
    phone: "(310) 555-2081",
    bookAum: 3.4,
    leads: 22, meetings: 10, proposals: 8, won: 4,
    winRate: 4 / 22,
    avgDaysToClose: 41,
    monthlyWins: [
      { month: "Feb", wins: 0 },
      { month: "Mar", wins: 1 },
      { month: "Apr", wins: 0 },
      { month: "May", wins: 1 },
      { month: "Jun", wins: 1 },
      { month: "Jul", wins: 1 },
    ],
    sourceMix: [
      { source: "Schwab", pct: 48 },
      { source: "Fidelity", pct: 32 },
      { source: "Website", pct: 12 },
      { source: "Referral", pct: 8 },
    ],
  },
  {
    id: "adv-nakamura",
    name: "Sora Nakamura",
    title: "Wealth Advisor",
    email: "s.nakamura@seia.example",
    phone: "(310) 555-2102",
    bookAum: 3.0,
    leads: 20, meetings: 9, proposals: 8, won: 4,
    winRate: 4 / 20,
    avgDaysToClose: 46,
    monthlyWins: [
      { month: "Feb", wins: 0 },
      { month: "Mar", wins: 1 },
      { month: "Apr", wins: 0 },
      { month: "May", wins: 1 },
      { month: "Jun", wins: 1 },
      { month: "Jul", wins: 1 },
    ],
    sourceMix: [
      { source: "Fidelity", pct: 44 },
      { source: "Schwab", pct: 30 },
      { source: "Seminar", pct: 16 },
      { source: "Website", pct: 10 },
    ],
  },
  {
    id: "adv-whitaker",
    name: "Jared Whitaker",
    title: "Wealth Advisor",
    email: "j.whitaker@seia.example",
    phone: "(310) 555-2143",
    bookAum: 2.9,
    leads: 19, meetings: 8, proposals: 7, won: 4,
    winRate: 4 / 19,
    avgDaysToClose: 44,
    monthlyWins: [
      { month: "Feb", wins: 1 },
      { month: "Mar", wins: 0 },
      { month: "Apr", wins: 1 },
      { month: "May", wins: 0 },
      { month: "Jun", wins: 1 },
      { month: "Jul", wins: 1 },
    ],
    sourceMix: [
      { source: "Schwab", pct: 40 },
      { source: "Fidelity", pct: 35 },
      { source: "Referral", pct: 15 },
      { source: "Website", pct: 10 },
    ],
  },
  {
    id: "adv-patel",
    name: "Ravi Patel",
    title: "Associate Advisor",
    email: "r.patel@seia.example",
    phone: "(310) 555-2168",
    bookAum: 2.2,
    leads: 17, meetings: 7, proposals: 7, won: 3,
    winRate: 3 / 17,
    avgDaysToClose: 52,
    monthlyWins: [
      { month: "Feb", wins: 0 },
      { month: "Mar", wins: 1 },
      { month: "Apr", wins: 0 },
      { month: "May", wins: 1 },
      { month: "Jun", wins: 0 },
      { month: "Jul", wins: 1 },
    ],
    sourceMix: [
      { source: "Fidelity", pct: 50 },
      { source: "Schwab", pct: 28 },
      { source: "Website", pct: 14 },
      { source: "Seminar", pct: 8 },
    ],
  },
  {
    id: "adv-chen",
    name: "Lena Chen",
    title: "Wealth Advisor",
    email: "l.chen@seia.example",
    phone: "(310) 555-2194",
    bookAum: 3.1,
    leads: 27, meetings: 11, proposals: 10, won: 4,
    winRate: 4 / 27,
    avgDaysToClose: 47,
    monthlyWins: [
      { month: "Feb", wins: 1 },
      { month: "Mar", wins: 0 },
      { month: "Apr", wins: 1 },
      { month: "May", wins: 1 },
      { month: "Jun", wins: 0 },
      { month: "Jul", wins: 1 },
    ],
    sourceMix: [
      { source: "Schwab", pct: 42 },
      { source: "Fidelity", pct: 33 },
      { source: "Seminar", pct: 15 },
      { source: "Referral", pct: 10 },
    ],
  },
  {
    id: "adv-obrien",
    name: "Tomás O'Brien",
    title: "Associate Advisor",
    email: "t.obrien@seia.example",
    phone: "(310) 555-2217",
    bookAum: 1.9,
    leads: 20, meetings: 5, proposals: 5, won: 2,
    winRate: 2 / 20,
    avgDaysToClose: 58,
    monthlyWins: [
      { month: "Feb", wins: 0 },
      { month: "Mar", wins: 1 },
      { month: "Apr", wins: 0 },
      { month: "May", wins: 0 },
      { month: "Jun", wins: 1 },
      { month: "Jul", wins: 0 },
    ],
    sourceMix: [
      { source: "Fidelity", pct: 46 },
      { source: "Schwab", pct: 26 },
      { source: "Website", pct: 18 },
      { source: "Referral", pct: 10 },
    ],
  },
];


// Anchor all synthetic dates to "now" so "days in stage" always matches the
// most-recent timeline event when read against today's date.
const iso = (daysAgo: number) => {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
};
const isoAhead = (days: number) => iso(-days);

// Typical days spent in each stage — used to space out assignment history.
const STAGE_TYPICAL_DAYS: Record<Stage, number> = {
  "Referral Intake": 2,
  "SEIA CRM Intake": 2,
  "BDO Research": 4,
  "CRM Handoff": 2,
  "PlanScout Analysis": 6,
  "Advisor Plan": 4,
  "Discovery Meeting": 6,
  "Client Won": 3,
};

function timelineUpTo(stage: Stage, ownerName: string, endDaysAgo = 2, seed = 0): StageEvent[] {
  const idx = STAGES.indexOf(stage);
  const owners = ["Intake bot", "SEIA CRM", "BDO — Kenji Ito", "SEIA CRM", "PlanScout", ownerName, ownerName, ownerName];
  const events: StageEvent[] = [];
  let daysAgo = endDaysAgo;
  for (let i = idx; i >= 0; i--) {
    events.unshift({ stage: STAGES[i], at: iso(daysAgo), owner: owners[i] });
    const base = STAGE_TYPICAL_DAYS[STAGES[i]];
    const jitter = ((seed + i * 13) % 5) - 2; // -2..2 day variance per stage
    daysAgo += Math.max(1, base + jitter);
  }
  return events;
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h;
}

export const LEADS: Lead[] = [
  {
    id: "L-1042",
    name: "Harold Winters",
    email: "harold.w@example.com",
    phone: "+1 (415) 555-0142",
    city: "San Francisco, CA",
    source: "Schwab",
    stage: "PlanScout Analysis",
    ownerId: "adv-alvarez",
    estAum: 1.8,
    daysInStage: 4,
    nextAction: "Review PlanScout draft",
    nextActionDate: isoAhead(1),
    planScoutStatus: "In progress",
    taxStrategy: "Roth conversion ladder + SS delay to 70",
    notes: [
      "Retiring in 18 months. Wants to consolidate 401(k) rollovers.",
      "Spouse has separate IRA at Fidelity — potential lead consolidation.",
    ],
    timeline: timelineUpTo("PlanScout Analysis", "Maya Alvarez"),
  },
  {
    id: "L-1051",
    name: "Priya Ramesh",
    email: "priya.r@example.com",
    phone: "+1 (650) 555-0198",
    city: "Palo Alto, CA",
    source: "Fidelity",
    stage: "BDO Research",
    ownerId: "bdo-01",
    estAum: 2.4,
    daysInStage: 2,
    nextAction: "BDO enrichment call",
    nextActionDate: isoAhead(1),
    planScoutStatus: "Not started",
    notes: ["Tech exec, pre-IPO equity. Needs concentrated stock planning."],
    timeline: timelineUpTo("BDO Research", "Sora Nakamura"),
  },
  {
    id: "L-1063",
    name: "Marcus Okafor",
    email: "m.okafor@example.com",
    phone: "+1 (312) 555-0167",
    city: "Chicago, IL",
    source: "Schwab",
    stage: "Discovery Meeting",
    ownerId: "adv-whitaker",
    estAum: 1.0,
    daysInStage: 6,
    nextAction: "Send follow-up proposal",
    nextActionDate: isoAhead(2),
    planScoutStatus: "Delivered",
    taxStrategy: "Municipal bond ladder, HSA maximization",
    notes: ["First meeting went well. Wants a written IPS."],
    timeline: timelineUpTo("Discovery Meeting", "Jared Whitaker"),
  },
  {
    id: "L-1071",
    name: "Elena Vasquez",
    email: "elena.v@example.com",
    phone: "+1 (305) 555-0119",
    city: "Miami, FL",
    source: "Website",
    stage: "SEIA CRM Intake",
    ownerId: "bdo-01",
    estAum: 0.5,
    daysInStage: 1,
    nextAction: "Route to BDO",
    nextActionDate: isoAhead(0),
    planScoutStatus: "Not started",
    notes: [],
    timeline: timelineUpTo("SEIA CRM Intake", "Ravi Patel"),
  },
  {
    id: "L-1088",
    name: "David Bergstrom",
    email: "d.berg@example.com",
    phone: "+1 (206) 555-0184",
    city: "Seattle, WA",
    source: "Fidelity",
    stage: "Advisor Plan",
    ownerId: "adv-nakamura",
    estAum: 2.0,
    daysInStage: 3,
    nextAction: "Finalize plan deck",
    nextActionDate: isoAhead(1),
    planScoutStatus: "Delivered",
    taxStrategy: "QCD strategy, IRA-to-Roth in low-income year",
    notes: ["Recently widowed. Needs simplified 3-account setup."],
    timeline: timelineUpTo("Advisor Plan", "Sora Nakamura"),
  },
  {
    id: "L-1094",
    name: "Anita Cho",
    email: "anita.c@example.com",
    phone: "+1 (408) 555-0173",
    city: "San Jose, CA",
    source: "Schwab",
    stage: "Client Won",
    ownerId: "adv-alvarez",
    estAum: 5.9,
    daysInStage: 0,
    nextAction: "Onboard & fund accounts",
    nextActionDate: isoAhead(3),
    planScoutStatus: "Delivered",
    taxStrategy: "Backdoor Roth + DAF for charitable stack",
    notes: ["Signed IMA on 7/18. Wire expected next week."],
    timeline: timelineUpTo("Client Won", "Maya Alvarez"),
  },
  {
    id: "L-1101",
    name: "Robert Nguyen",
    email: "r.nguyen@example.com",
    phone: "+1 (714) 555-0155",
    city: "Irvine, CA",
    source: "Seminar",
    stage: "CRM Handoff",
    ownerId: "adv-chen",
    estAum: 0.8,
    daysInStage: 1,
    nextAction: "Send to PlanScout",
    nextActionDate: isoAhead(0),
    planScoutStatus: "Not started",
    notes: ["Attended June estate planning seminar."],
    timeline: timelineUpTo("CRM Handoff", "Lena Chen"),
  },
  {
    id: "L-1112",
    name: "Susan Aldrich",
    email: "susan.a@example.com",
    phone: "+1 (503) 555-0128",
    city: "Portland, OR",
    source: "Fidelity",
    stage: "BDO Research",
    ownerId: "bdo-01",
    estAum: 3.5,
    daysInStage: 5,
    nextAction: "Escalate — SLA breach",
    nextActionDate: isoAhead(-1),
    planScoutStatus: "Not started",
    notes: ["Foundation trustee. Complex trust structure."],
    timeline: timelineUpTo("BDO Research", "Maya Alvarez"),
  },
  {
    id: "L-1120",
    name: "James Foley",
    email: "j.foley@example.com",
    phone: "+1 (617) 555-0146",
    city: "Boston, MA",
    source: "Referral",
    stage: "Advisor Plan",
    ownerId: "adv-patel",
    estAum: 0.7,
    daysInStage: 4,
    nextAction: "Coordinate with CPA",
    nextActionDate: isoAhead(2),
    planScoutStatus: "Delivered",
    taxStrategy: "NUA analysis on employer stock",
    notes: ["Referred by existing client A. Cho."],
    timeline: timelineUpTo("Advisor Plan", "Ravi Patel"),
  },
  {
    id: "L-1133",
    name: "Karen McAllister",
    email: "k.mca@example.com",
    phone: "+1 (720) 555-0139",
    city: "Denver, CO",
    source: "Schwab",
    stage: "PlanScout Analysis",
    ownerId: "adv-obrien",
    estAum: 0.6,
    daysInStage: 6,
    nextAction: "Ping PlanScout on draft",
    nextActionDate: isoAhead(0),
    planScoutStatus: "In progress",
    notes: [],
    timeline: timelineUpTo("PlanScout Analysis", "Tomás O'Brien"),
  },
  {
    id: "L-1141",
    name: "Thomas Kane",
    email: "t.kane@example.com",
    phone: "+1 (212) 555-0192",
    city: "New York, NY",
    source: "Fidelity",
    stage: "Discovery Meeting",
    ownerId: "adv-alvarez",
    estAum: 3.0,
    daysInStage: 2,
    nextAction: "Second meeting w/ spouse",
    nextActionDate: isoAhead(4),
    planScoutStatus: "Delivered",
    taxStrategy: "Direct indexing + tax-loss harvesting",
    notes: ["Wants ESG tilt."],
    timeline: timelineUpTo("Discovery Meeting", "Maya Alvarez"),
  },
  {
    id: "L-1150",
    name: "Grace Halloran",
    email: "grace.h@example.com",
    phone: "+1 (415) 555-0171",
    city: "Oakland, CA",
    source: "Website",
    stage: "Referral Intake",
    ownerId: "bdo-01",
    estAum: 0.2,
    daysInStage: 0,
    nextAction: "Verify contact info",
    nextActionDate: isoAhead(0),
    planScoutStatus: "Not started",
    notes: [],
    timeline: timelineUpTo("Referral Intake", "Lena Chen"),
  },
];


// Selectors
export const getLead = (id: string) => LEADS.find((l) => l.id === id);
export const getAdvisor = (id: string) => ADVISORS.find((a) => a.id === id);
export const leadsByAdvisor = (id: string) => LEADS.filter((l) => l.ownerId === id);
export const ownerName = (id: string) =>
  id === "bdo-01" ? "BDO — Kenji Ito" : getAdvisor(id)?.name ?? "Unassigned";
export const isBreachingSla = (l: Lead) => l.stage !== "Client Won" && l.daysInStage > STAGE_SLA_DAYS[l.stage];

// Human-friendly duration: "12d", "5mo", "2y 3mo".
export function formatOnboardedFor(days: number): string {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  const y = Math.floor(days / 365);
  const rem = Math.round((days % 365) / 30);
  return rem ? `${y}y ${rem}mo` : `${y}y`;
}

// ─── Geographic / program enrichment (for dashboards 7 & 9) ──────────────
export type Region = "West" | "Central" | "East";
export type Program = "HNW" | "Retirement" | "Business Owner";

type Meta = { branch: string; region: Region; program: Program };
export const LEAD_META: Record<string, Meta> = {
  "L-1042": { branch: "Schwab — SF Downtown", region: "West", program: "Retirement" },
  "L-1051": { branch: "Fidelity — Palo Alto", region: "West", program: "HNW" },
  "L-1063": { branch: "Schwab — Chicago Loop", region: "Central", program: "Business Owner" },
  "L-1071": { branch: "Website — Direct", region: "East", program: "Retirement" },
  "L-1088": { branch: "Fidelity — Seattle", region: "West", program: "HNW" },
  "L-1094": { branch: "Schwab — San Jose", region: "West", program: "HNW" },
  "L-1101": { branch: "Seminar — Irvine", region: "West", program: "Retirement" },
  "L-1112": { branch: "Fidelity — Portland", region: "West", program: "HNW" },
  "L-1120": { branch: "Referral — Boston", region: "East", program: "Business Owner" },
  "L-1133": { branch: "Schwab — Denver", region: "Central", program: "Retirement" },
  "L-1141": { branch: "Fidelity — NYC Midtown", region: "East", program: "HNW" },
  "L-1150": { branch: "Website — Direct", region: "West", program: "Retirement" },
};

// ─── Advisor home branches ──────────────────────────────────────────────
// Each advisor is pinned to a single branch so they never appear as a
// duplicate across the "Advisors working at this branch" tables.
const ADVISOR_HOME: Record<string, { branch: string; city: string; region: Region; source: Source }> = {
  "adv-alvarez": { branch: "Schwab — San Jose", city: "San Jose, CA", region: "West", source: "Schwab" },
  "adv-nakamura": { branch: "Fidelity — Seattle", city: "Seattle, WA", region: "West", source: "Fidelity" },
  "adv-whitaker": { branch: "Schwab — SF Downtown", city: "San Francisco, CA", region: "West", source: "Schwab" },
  "adv-patel": { branch: "Referral — Boston", city: "Boston, MA", region: "East", source: "Referral" },
  "adv-chen": { branch: "Fidelity — Palo Alto", city: "Palo Alto, CA", region: "West", source: "Fidelity" },
  "adv-obrien": { branch: "Schwab — Denver", city: "Denver, CO", region: "Central", source: "Schwab" },
};

export const advisorHomeBranch = (advisorId: string): string | undefined =>
  ADVISOR_HOME[advisorId]?.branch;

// Canonical branch registry — 11 branches always shown in Branch Details,
// even when a branch has zero referrals/leads/advisors.
export const BRANCHES: { name: string; region: Region; source: Source }[] = [
  { name: "Schwab — San Jose", region: "West", source: "Schwab" },
  { name: "Schwab — SF Downtown", region: "West", source: "Schwab" },
  { name: "Schwab — Chicago Loop", region: "Central", source: "Schwab" },
  { name: "Schwab — Denver", region: "Central", source: "Schwab" },
  { name: "Fidelity — Palo Alto", region: "West", source: "Fidelity" },
  { name: "Fidelity — Seattle", region: "West", source: "Fidelity" },
  { name: "Fidelity — Portland", region: "West", source: "Fidelity" },
  { name: "Fidelity — NYC Midtown", region: "East", source: "Fidelity" },
  { name: "Referral — Boston", region: "East", source: "Referral" },
  { name: "Seminar — Irvine", region: "West", source: "Seminar" },
  { name: "Website — Direct", region: "East", source: "Website" },
];
export const BRANCH_REGION: Record<string, Region> = Object.fromEntries(
  BRANCHES.map((b) => [b.name, b.region]),
);

// Realign any lead's branch so it matches its advisor's home branch —
// one advisor, one branch. Leads still owned by BDO (unassigned) keep
// their originating branch.
function realignLeadBranches() {
  for (const l of LEADS) {
    const home = ADVISOR_HOME[l.ownerId];
    if (!home) continue;
    const meta = LEAD_META[l.id];
    if (!meta) {
      LEAD_META[l.id] = { branch: home.branch, region: home.region, program: "HNW" };
      continue;
    }
    if (meta.branch !== home.branch) {
      LEAD_META[l.id] = { ...meta, branch: home.branch, region: home.region };
    }
  }
}
realignLeadBranches();

// ─── Synthetic "Client Won" roster ───────────────────────────────────────
// advisor.won is authoritative; materialize matching Client Won rows so
// the Active leads table actually shows the wins referenced elsewhere.
const WON_FIRST = ["Julia", "Ravi", "Sana", "Miguel", "Kira", "Alex", "Tomás", "Daniel", "Lena", "Priscilla", "Elena", "Nadia"];
const WON_LAST = ["Bennett", "Ortiz", "Kaur", "Nguyen", "Kim", "Reyes", "Walsh", "Cohen", "Sato", "Morgan", "Diaz", "Ivanov", "Hughes", "Park"];
(function seedWonLeads() {
  const existingWon: Record<string, number> = {};
  for (const l of LEADS) {
    if (l.stage === "Client Won") existingWon[l.ownerId] = (existingWon[l.ownerId] ?? 0) + 1;
  }
  let seq = 2000;
  for (const a of ADVISORS) {
    const missing = Math.max(0, a.won - (existingWon[a.id] ?? 0));
    const slice = missing > 0 ? +(a.bookAum / Math.max(a.won, 1)).toFixed(1) : 0;
    const home = ADVISOR_HOME[a.id];
    for (let i = 0; i < missing; i++) {
      const id = `L-${seq++}`;
      const first = WON_FIRST[(seq + i) % WON_FIRST.length];
      const last = WON_LAST[(seq * 3 + i) % WON_LAST.length];
      const daysAgo = 15 + ((seq * 17 + i * 43) % 880);
      const name = `${first} ${last}`;
      LEADS.push({
        id,
        name,
        email: `${first.replace(".", "").toLowerCase()}.${last.toLowerCase()}@example.com`,
        phone: "+1 (555) 000-0000",
        city: home.city,
        source: home.source,
        stage: "Client Won",
        ownerId: a.id,
        estAum: slice,
        daysInStage: daysAgo,
        nextAction: "Onboarding complete",
        nextActionDate: isoAhead(-(daysAgo - 3)),
        planScoutStatus: "Delivered",
        notes: [`Signed ${daysAgo} days ago.`],
        timeline: timelineUpTo("Client Won", a.name, daysAgo, seq + i),
      });
      LEAD_META[id] = { branch: home.branch, region: home.region, program: "HNW" };
    }
  }
  // Also realign the hand-authored won lead (L-1094) if needed.
  for (const l of LEADS) {
    if (l.stage !== "Client Won") continue;
    const home = ADVISOR_HOME[l.ownerId];
    const meta = LEAD_META[l.id];
    if (home && meta && meta.branch !== home.branch) {
      LEAD_META[l.id] = { ...meta, branch: home.branch, region: home.region };
    }
  }
})();


// Re-generate timelines for the hand-authored leads so each has varied
// per-stage dates keyed off its own daysInStage and a per-id seed.
for (const l of LEADS) {
  if (l.id.startsWith("L-2")) continue; // won-seeder already set varied timeline
  const adv = ADVISORS.find((a) => a.id === l.ownerId);
  const owner = adv?.name ?? "BDO — Kenji Ito";
  l.timeline = timelineUpTo(l.stage, owner, Math.max(1, l.daysInStage), hashSeed(l.id));
}

export type EnrichedLead = Lead & Meta;
export const enrichLead = (l: Lead): EnrichedLead => ({ ...l, ...LEAD_META[l.id] });
export const ENRICHED_LEADS: EnrichedLead[] = [];
function rebuildEnriched() {
  ENRICHED_LEADS.length = 0;
  for (const l of LEADS) ENRICHED_LEADS.push(enrichLead(l));
}
rebuildEnriched();


// ─── Advisor activity (for dashboard 8) ──────────────────────────────────
export type AdvisorActivity = {
  advisorId: string;
  touchpoints7d: number;
  meetings30d: number;
  avgResponseHrs: number;
  outstanding: number;
};
export const ADVISOR_ACTIVITY: AdvisorActivity[] = [
  { advisorId: "adv-alvarez", touchpoints7d: 42, meetings30d: 18, avgResponseHrs: 3.1, outstanding: 4 },
  { advisorId: "adv-nakamura", touchpoints7d: 31, meetings30d: 14, avgResponseHrs: 4.5, outstanding: 6 },
  { advisorId: "adv-whitaker", touchpoints7d: 28, meetings30d: 12, avgResponseHrs: 5.2, outstanding: 3 },
  { advisorId: "adv-patel", touchpoints7d: 22, meetings30d: 9, avgResponseHrs: 6.8, outstanding: 7 },
  { advisorId: "adv-chen", touchpoints7d: 26, meetings30d: 11, avgResponseHrs: 4.1, outstanding: 5 },
  { advisorId: "adv-obrien", touchpoints7d: 15, meetings30d: 6, avgResponseHrs: 8.4, outstanding: 9 },
];

// ─── Triage / research enrichment (BDO Triage Queue) ─────────────────────
export type ResearchState = "done" | "pending" | "not_started";
export type StatedNeed = "Retirement" | "Tax" | "Estate" | "Cash-flow" | "Business exit";

export type TriageMeta = {
  statedNeed: StatedNeed;
  opportunityBand: "<$1M" | "$1–3M" | "$3–5M" | "$5M+";
  submittingRep: string;
  catchlight: ResearchState;
  planScout: ResearchState;   // mirrors planScoutStatus but as tri-state
  discoveryPrep: ResearchState; // "Claude" content generation
  reworkReason?: string;
};

export const LEAD_TRIAGE: Record<string, TriageMeta> = {
  "L-1042": { statedNeed: "Retirement", opportunityBand: "$1–3M", submittingRep: "J. Reyes (Schwab SF)", catchlight: "done", planScout: "pending", discoveryPrep: "not_started" },
  "L-1051": { statedNeed: "Tax", opportunityBand: "$1–3M", submittingRep: "A. Chen (Fidelity PA)", catchlight: "not_started", planScout: "not_started", discoveryPrep: "not_started" },
  "L-1063": { statedNeed: "Business exit", opportunityBand: "<$1M", submittingRep: "M. Doyle (Schwab Loop)", catchlight: "done", planScout: "done", discoveryPrep: "done" },
  "L-1071": { statedNeed: "Retirement", opportunityBand: "<$1M", submittingRep: "Website form", catchlight: "not_started", planScout: "not_started", discoveryPrep: "not_started" },
  "L-1088": { statedNeed: "Estate", opportunityBand: "$1–3M", submittingRep: "K. Park (Fidelity SEA)", catchlight: "done", planScout: "done", discoveryPrep: "done" },
  "L-1094": { statedNeed: "Tax", opportunityBand: "$5M+", submittingRep: "R. Ito (Schwab SJ)", catchlight: "done", planScout: "done", discoveryPrep: "done" },
  "L-1101": { statedNeed: "Retirement", opportunityBand: "<$1M", submittingRep: "Seminar signup", catchlight: "done", planScout: "not_started", discoveryPrep: "not_started" },
  "L-1112": { statedNeed: "Estate", opportunityBand: "$3–5M", submittingRep: "L. Grant (Fidelity PDX)", catchlight: "done", planScout: "not_started", discoveryPrep: "not_started", reworkReason: "Trust structure needs re-review" },
  "L-1120": { statedNeed: "Tax", opportunityBand: "<$1M", submittingRep: "Client referral — A. Cho", catchlight: "done", planScout: "done", discoveryPrep: "done" },
  "L-1133": { statedNeed: "Retirement", opportunityBand: "<$1M", submittingRep: "T. Nguyen (Schwab DEN)", catchlight: "done", planScout: "pending", discoveryPrep: "not_started" },
  "L-1141": { statedNeed: "Cash-flow", opportunityBand: "$1–3M", submittingRep: "S. Klein (Fidelity NYC)", catchlight: "done", planScout: "done", discoveryPrep: "done" },
  "L-1150": { statedNeed: "Retirement", opportunityBand: "<$1M", submittingRep: "Website form", catchlight: "not_started", planScout: "not_started", discoveryPrep: "not_started" },
};

export type TriageBand = "needs_enrichment" | "awaiting_planscout" | "ready_to_assign" | "in_advisor_flow" | "won";

export function triageBand(lead: Lead): TriageBand {
  if (lead.stage === "Client Won") return "won";
  const t = LEAD_TRIAGE[lead.id];
  if (!t) return "needs_enrichment";
  if (t.catchlight !== "done") return "needs_enrichment";
  if (t.planScout !== "done") return "awaiting_planscout";
  if (t.discoveryPrep !== "done") return "awaiting_planscout";
  if (lead.stage === "Advisor Plan" || lead.stage === "Discovery Meeting") return "in_advisor_flow";
  return "ready_to_assign";
}

// ─── Backend hydration ───────────────────────────────────────────────────
// The mock data above is the initial in-memory snapshot. On app boot, the
// AppDataProvider fetches the same snapshot from Lovable Cloud (public.app_data)
// and calls applyBackendSnapshot() to replace this in-memory copy. Consumers
// subscribe via useAppDataVersion() to re-render after hydration.

type BackendSnapshot = {
  advisors: Advisor[];
  leads: Omit<Lead, "timeline">[];
  lead_meta: Record<string, Meta>;
  advisor_activity: AdvisorActivity[];
};

const dataListeners = new Set<() => void>();
let dataVersion = 0;
export function subscribeAppData(cb: () => void) {
  dataListeners.add(cb);
  return () => {
    dataListeners.delete(cb);
  };
}
export function getAppDataVersion() {
  return dataVersion;
}
function notifyAppData() {
  dataVersion++;
  dataListeners.forEach((l) => l());
}

function regenerateTimelines() {
  for (const l of LEADS) {
    const adv = ADVISORS.find((a) => a.id === l.ownerId);
    const owner = adv?.name ?? "BDO — Kenji Ito";
    l.timeline = timelineUpTo(l.stage, owner, Math.max(1, l.daysInStage), hashSeed(l.id));
  }
}

export function applyBackendSnapshot(snap: BackendSnapshot) {
  ADVISORS.length = 0;
  ADVISORS.push(...snap.advisors);

  LEADS.length = 0;
  for (const raw of snap.leads) LEADS.push({ ...raw, timeline: [] } as Lead);

  for (const k of Object.keys(LEAD_META)) delete LEAD_META[k];
  Object.assign(LEAD_META, snap.lead_meta);

  ADVISOR_ACTIVITY.length = 0;
  ADVISOR_ACTIVITY.push(...snap.advisor_activity);

  realignLeadBranches();
  regenerateTimelines();
  rebuildEnriched();
  notifyAppData();
}
