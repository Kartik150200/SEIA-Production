// Interactive "Simulate a lead" module for the Workflow page.
// All logic is local — but every number is anchored to the real YTD funnel
// (125 → 75 → 50 → 45 → 21, $16.5M AUM) from src/data/funnel.ts.
// Anything that isn't measured is labeled "modeled" in the UI.
import { useMemo, useState } from "react";
import { ADVISORS, type Source, type Advisor } from "@/data/leads";
import { FUNNEL, FUNNEL_RATES } from "@/data/funnel";
import { AnimatedCounter } from "@/components/flourish";
import { Sparkles, ArrowRight, Info } from "lucide-react";

const SOURCES: Source[] = ["Schwab", "Fidelity", "Website", "Seminar", "Referral"];

// Source multipliers on the measured end-to-end capture rate (16.8%).
// Weighted average across the actual pipeline mix is intentionally ~1.0 so
// the simulator can't inflate expectations above what YTD actually shows.
const SOURCE_MULTIPLIER: Record<Source, number> = {
  Schwab: 1.15,   // custodian program, strongest historic close
  Fidelity: 1.05, // custodian program
  Referral: 1.25, // warm intros close best but are the smallest slice
  Seminar: 0.80,
  Website: 0.55,
};

// Rough per-stage baseline in days (modeled — no measured cycle data yet).
// Sums to ~44d for a mid-band Schwab lead, aligned with advisor.avgDaysToClose.
const STAGE_BASE_DAYS = {
  intake: 2,
  qualify: 6,
  plan: 8,
  discovery: 14,
  close: 14,
} as const;

const SOURCE_CYCLE_ADJ: Record<Source, number> = {
  Schwab: 0, Fidelity: 2, Referral: -4, Seminar: 3, Website: 8,
};

function aumBandMultiplier(aum: number): number {
  if (aum < 1.5) return 0.75;   // small leads stall / churn
  if (aum <= 8) return 1.0;     // sweet spot
  if (aum <= 12) return 0.90;   // long diligence
  return 0.80;                  // mega leads, longest cycles
}

function aumCycleAdjust(aum: number): number {
  // Larger leads take longer — small, honest bump.
  return Math.round(Math.log2(Math.max(1, aum)) * 3);
}

function pickAdvisor(aum: number): { advisor: Advisor; reason: string } {
  // Route by book-AUM band match, break ties by win rate.
  const bandOf = (a: number) => (a < 2 ? "S" : a <= 8 ? "M" : "L");
  const leadBand = bandOf(aum);
  const advisorBand = (bookAum: number) =>
    bookAum < 100 ? "S" : bookAum <= 160 ? "M" : "L";

  const ranked = [...ADVISORS]
    .map((a) => ({
      advisor: a,
      match: advisorBand(a.bookAum) === leadBand ? 1 : 0,
    }))
    .sort((a, b) => b.match - a.match || b.advisor.winRate - a.advisor.winRate);

  const top = ranked[0];
  const bandLabel =
    leadBand === "S" ? "$<2M" : leadBand === "M" ? "$2–8M" : "$8M+";
  return {
    advisor: top.advisor,
    reason: `${top.match ? "book matches" : "closest fit"} ${bandLabel} · win rate ${Math.round(top.advisor.winRate * 100)}%`,
  };
}

export function LeadSimulator() {
  const [source, setSource] = useState<Source>("Schwab");
  const [aum, setAum] = useState<number>(3.5);

  const projection = useMemo(() => {
    // Convert probability — measured base × modeled adjustments, clamped.
    const rawConvert =
      FUNNEL_RATES.endToEndCapture *
      SOURCE_MULTIPLIER[source] *
      aumBandMultiplier(aum);
    const convert = Math.max(0.05, Math.min(0.60, rawConvert));

    // Cycle days — modeled from stage baselines + source + AUM adjustments.
    const baseCycle = Object.values(STAGE_BASE_DAYS).reduce((a, b) => a + b, 0);
    const cycle = Math.max(
      21,
      Math.round(baseCycle + SOURCE_CYCLE_ADJ[source] + aumCycleAdjust(aum)),
    );

    const close = new Date();
    close.setDate(close.getDate() + cycle);
    const closeLabel = close.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    // Funnel — pass-through rates are the measured YTD rates.
    // Final "Won" bar reflects the simulated convert probability.
    const funnel = [
      {
        label: "Intake",
        pct: 100,
        measured: true,
        note: `${FUNNEL.referrals} referrals YTD`,
      },
      {
        label: "Qualified",
        pct: Math.round(FUNNEL_RATES.qualifiedOfReferrals * 100),
        measured: true,
        note: `${FUNNEL.qualified} of ${FUNNEL.referrals} YTD`,
      },
      {
        label: "Meetings",
        pct: Math.round(
          FUNNEL_RATES.qualifiedOfReferrals *
            FUNNEL_RATES.meetingsOfQualified *
            100,
        ),
        measured: true,
        note: `${FUNNEL.meetings} of ${FUNNEL.referrals} YTD`,
      },
      {
        label: "Proposals",
        pct: Math.round(
          FUNNEL_RATES.qualifiedOfReferrals *
            FUNNEL_RATES.meetingsOfQualified *
            FUNNEL_RATES.proposalsOfMeetings *
            100,
        ),
        measured: true,
        note: `${FUNNEL.proposals} of ${FUNNEL.referrals} YTD`,
      },
      {
        label: "Won",
        pct: Math.round(convert * 100),
        measured: false,
        note: "modeled from source + AUM",
      },
    ];

    const routed = pickAdvisor(aum);

    return {
      cycle,
      convert,
      advisor: routed.advisor,
      advisorReason: routed.reason,
      closeLabel,
      funnel,
    };
  }, [source, aum]);

  return (
    <div className="border border-sand/60 bg-background/70 p-8 paper-grain">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-bark" />
        <span className="text-[11px] uppercase tracking-[0.24em] text-bark/70">Simulator</span>
      </div>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
        <div className="md:col-span-5 space-y-6">
          <h3 className="font-serif text-3xl italic text-ink">
            Drop in a lead.<br />See where it lands.
          </h3>
          <p className="text-sm text-ink-soft">
            Move the dials. Convert probability starts from the real YTD capture rate
            ({Math.round(FUNNEL_RATES.endToEndCapture * 100)}%, {FUNNEL.wonClients} of{" "}
            {FUNNEL.referrals}) and is adjusted for source and AUM. Cycle days and
            close date are modeled.
          </p>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">Referral source</div>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                    source === s
                      ? "border-bark bg-bark text-paper"
                      : "border-sand/60 text-bark hover:border-bark"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">Estimated AUM</div>
              <div className="font-serif text-xl text-ink">${aum.toFixed(1)}M</div>
            </div>
            <input
              type="range" min={0.5} max={15} step={0.1}
              value={aum} onChange={(e) => setAum(parseFloat(e.target.value))}
              className="w-full accent-bark"
              aria-label="Estimated AUM in millions"
            />
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-bark/50">
              <span>$0.5M</span><span>$15M</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 space-y-6 md:border-l md:border-sand/50 md:pl-10">
          <div className="grid grid-cols-3 gap-4">
            <ProjectionCell
              label="Cycle"
              modeled
              value={<AnimatedCounter value={projection.cycle} suffix="d" duration={600} />}
            />
            <ProjectionCell
              label="Convert prob."
              value={<AnimatedCounter value={projection.convert * 100} decimals={0} suffix="%" duration={600} />}
            />
            <ProjectionCell
              label="Target close"
              modeled
              value={<span className="font-serif text-2xl italic text-ink">{projection.closeLabel}</span>}
            />
          </div>

          <div className="border-t border-sand/50 pt-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">
              Likely advisor
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-bark/40 font-serif text-sm italic text-bark">
                {projection.advisor.name.split(" ").map((p) => p[0]).join("")}
              </div>
              <div>
                <div className="font-serif text-lg text-ink">{projection.advisor.name}</div>
                <div className="text-xs text-ink-soft">
                  {projection.advisor.title} · {projection.advisorReason}
                </div>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-bark" />
            </div>
          </div>

          <div className="border-t border-sand/50 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">
                Projected funnel
              </div>
              <div className="text-[10px] uppercase tracking-widest text-bark/50">
                measured YTD rates · modeled Won
              </div>
            </div>
            <div className="space-y-1.5">
              {projection.funnel.map((f) => (
                <div key={f.label} className="grid grid-cols-[90px_1fr_44px] items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-bark/70">
                    {f.label}
                    {!f.measured && (
                      <span
                        title="Modeled — not measured"
                        aria-label="Modeled — not measured"
                        className="inline-block h-1.5 w-1.5 rounded-full bg-bark/40"
                      />
                    )}
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-cream"
                    title={f.note}
                  >
                    <div
                      className={`h-full ${f.measured ? "bg-bark/80" : "bg-bark/60"}`}
                      style={{ width: `${f.pct}%`, transition: "width 500ms cubic-bezier(.2,.7,.2,1)" }}
                    />
                  </div>
                  <div className="text-right font-serif text-sm italic text-ink">{f.pct}%</div>
                </div>
              ))}
            </div>
          </div>

          <details className="group border-t border-sand/50 pt-5">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70 hover:text-ink">
              <Info className="h-3.5 w-3.5" />
              How this is calculated
              <span className="ml-auto text-bark/50 transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3 text-[11px] leading-relaxed text-ink-soft md:grid-cols-2">
              <div>
                <div className="mb-1 font-semibold uppercase tracking-widest text-bark/70">Measured (YTD)</div>
                <ul className="space-y-0.5">
                  <li>Referrals: {FUNNEL.referrals}</li>
                  <li>Qualified: {FUNNEL.qualified} ({Math.round(FUNNEL_RATES.qualifiedOfReferrals * 100)}%)</li>
                  <li>Meetings: {FUNNEL.meetings} ({Math.round(FUNNEL_RATES.meetingsOfQualified * 100)}% of qual.)</li>
                  <li>Proposals: {FUNNEL.proposals} ({Math.round(FUNNEL_RATES.proposalsOfMeetings * 100)}% of mtgs.)</li>
                  <li>Won: {FUNNEL.wonClients} · AUM ${FUNNEL.aumAddedM}M</li>
                  <li>End-to-end capture: {Math.round(FUNNEL_RATES.endToEndCapture * 100)}%</li>
                </ul>
              </div>
              <div>
                <div className="mb-1 font-semibold uppercase tracking-widest text-bark/70">Modeled</div>
                <ul className="space-y-0.5">
                  <li>Source × AUM multipliers on capture rate</li>
                  <li>Source mult: Schwab 1.15 · Fidelity 1.05 · Referral 1.25 · Seminar 0.80 · Website 0.55</li>
                  <li>AUM band mult: 1.0 for $1.5–8M, tapers outside</li>
                  <li>Cycle: sum of stage baselines (~44d) + source/AUM adj.</li>
                  <li>Advisor routing: book-AUM band match, tie-break win rate</li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function ProjectionCell({
  label,
  value,
  modeled,
}: {
  label: string;
  value: React.ReactNode;
  modeled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">
        {label}
        {modeled && (
          <span
            title="Modeled — not measured"
            aria-label="Modeled — not measured"
            className="inline-block h-1.5 w-1.5 rounded-full bg-bark/40"
          />
        )}
      </div>
      <div className="mt-2 font-serif text-3xl text-ink">{value}</div>
    </div>
  );
}
