// Unified lifecycle figure — Fig.01 diagonal schematic (nodes I–XI along
// swimlanes, dashed connectors, traveling glow) merged with the Eleven-Stage
// Lifecycle overlay (kickers, owners, active-stage detail panel).
//
// State (active stage, marker index, playing) lives in the parent so the
// same controls can drive both this figure and the sample-lead walkthrough
// launched from the hero.
import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

export type Lane =
  | "Custodian"
  | "SEIA CRM"
  | "BDO"
  | "Catchlight"
  | "PlanScout"
  | "Claude"
  | "Advisors";

export const LANES: Lane[] = [
  "Custodian",
  "SEIA CRM",
  "BDO",
  "Catchlight",
  "PlanScout",
  "Claude",
  "Advisors",
];

export type Stage = {
  id: string;
  step: string; // roman numeral
  kicker: string; // small uppercase label above node
  title: string;
  lane: Lane;
  actor: string;
  summary: string;
  inputs: string[];
  outputs: string[];
  tools: string[];
  sla: string;
};

// Reduced-motion hook — respects prefers-reduced-motion.
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

// Node x/y in the SVG viewBox. Diagonal descent from Custodian down through
// PlanScout, then flat along the Advisors lane for the closing steps —
// matches the Fig.01 layout exactly.
const VB = { w: 1600, h: 780 };
const LEFT_LABEL_X = 220;
const NODE_X_START = 300;
const NODE_X_END = 1540;
const LANE_Y_START = 90;
const LANE_Y_GAP = 96; // 7 lanes → last lane at 90 + 6*96 = 666

function laneY(laneIndex: number) {
  return LANE_Y_START + laneIndex * LANE_Y_GAP;
}

// Column positions I..XI. Even spread across the plotting area, then the
// last four crowd right on the Advisors lane.
const COL_X: number[] = (() => {
  const cols = 11;
  const step = (NODE_X_END - NODE_X_START) / (cols - 1);
  return Array.from({ length: cols }, (_, i) => NODE_X_START + i * step);
})();

export function nodePosition(stage: Stage, index: number) {
  const laneIdx = LANES.indexOf(stage.lane);
  return { x: COL_X[index], y: laneY(laneIdx) };
}

export function LifecycleFigure({
  stages,
  activeId,
  onSelect,
  markerIdx,
  playing,
  sampleLeadName,
}: {
  stages: Stage[];
  activeId: string;
  onSelect: (id: string) => void;
  markerIdx: number;
  playing: boolean;
  sampleLeadName: string;
}) {
  const reduced = useReducedMotion();
  const active = stages.find((s) => s.id === activeId) ?? stages[0];
  const pathRef = useRef<SVGPathElement | null>(null);
  const [glow, setGlow] = useState({ x: COL_X[0], y: laneY(0) });

  // Path connecting every node in order — dashed connectors.
  const pathD = stages
    .map((s, i) => {
      const { x, y } = nodePosition(s, i);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Move the amber glow along the path to the active node. When the tour
  // is playing we ease along the connector; otherwise snap.
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const idx = Math.max(0, stages.findIndex((s) => s.id === activeId));
    const target = nodePosition(stages[idx], idx);
    if (reduced || !playing) {
      setGlow(target);
      return;
    }
    // Animate from current glow to target along the path.
    const total = path.getTotalLength();
    const stepLen = total / (stages.length - 1);
    const start = performance.now();
    const from = glow;
    const to = target;
    let raf = 0;
    const duration = Math.min(900, stepLen * 2.2);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeInOutCubic
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setGlow({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, playing, reduced]);

  return (
    <div className="lifecycle-figure">
      {/* Editorial caption strip, kept from Fig. 01 */}
      <div className="mb-6 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-bark/60">
        <span>Fig. 01 — The Referral-to-Client Journey</span>
        <span className="hidden md:inline">
          Sample lead · <span className="text-ink">{sampleLeadName}</span>
        </span>
      </div>

      <div className="relative overflow-hidden rounded-sm border border-sand/60 bg-cream paper-grain">
        <svg
          data-testid="fig1-svg"
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-labelledby="fig1-title fig1-desc"
          className="block h-auto w-full"
        >
          <title id="fig1-title">SEIA lead-to-client workflow</title>
          <desc id="fig1-desc">
            Eleven-stage swimlane from Schwab or Fidelity referral through
            Salesforce, BDO research, Catchlight, PlanScout, Claude, and the
            advisor team to a signed client.
          </desc>

          <defs>
            <radialGradient id="lf-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.85 0.16 78)" stopOpacity="0.95" />
              <stop offset="55%" stopColor="oklch(0.72 0.13 72)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="oklch(0.72 0.13 72)" stopOpacity="0" />
            </radialGradient>
            {/* Reference path — used for aria description; also drives .getTotalLength */}
            <path id="lf-path" ref={pathRef} d={pathD} fill="none" />
          </defs>

          {/* Lane guides — dotted horizontal rules with left-column labels */}
          {LANES.map((lane, i) => {
            const y = laneY(i);
            return (
              <g key={lane} aria-hidden="true">
                <line
                  x1={LEFT_LABEL_X + 20}
                  y1={y}
                  x2={VB.w - 30}
                  y2={y}
                  stroke="oklch(0.82 0.02 70)"
                  strokeWidth="1"
                  strokeDasharray="1 6"
                />
                <text
                  x={LEFT_LABEL_X}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="16"
                  fill="oklch(0.4 0.03 60)"
                  style={{ letterSpacing: "0.24em", textTransform: "uppercase" }}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {lane}
                </text>
              </g>
            );
          })}

          {/* Dashed connectors between nodes */}
          {stages.map((s, i) => {
            const next = stages[i + 1];
            if (!next) return null;
            const a = nodePosition(s, i);
            const b = nodePosition(next, i + 1);
            const isPast = i < markerIdx;
            return (
              <line
                key={`c-${s.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isPast ? "oklch(0.45 0.05 65)" : "oklch(0.55 0.045 67 / 0.55)"}
                strokeWidth={isPast ? 1.6 : 1.2}
                strokeDasharray="6 6"
                aria-hidden="true"
              />
            );
          })}

          {/* Traveling glow — follows the active stage */}
          <circle
            cx={glow.x}
            cy={glow.y}
            r={44}
            fill="url(#lf-glow)"
            aria-hidden="true"
            style={{ transition: reduced ? "none" : undefined }}
          />

          {/* Nodes */}
          {stages.map((s, i) => {
            const { x, y } = nodePosition(s, i);
            const isActive = s.id === activeId;
            return (
              <g
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={`Stage ${i + 1} of ${stages.length}: ${s.title}. ${s.lane}, ${s.actor}. ${s.summary}`}
                aria-pressed={isActive}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(s.id);
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[3]"
              >
                {/* Kicker above node */}
                <text
                  x={x}
                  y={y - 42}
                  textAnchor="middle"
                  fontSize="15"
                  fill={isActive ? "oklch(0.25 0.02 60)" : "oklch(0.45 0.03 65)"}
                  style={{ letterSpacing: "0.24em", textTransform: "uppercase" }}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {s.kicker}
                </text>
                <circle
                  cx={x}
                  cy={y}
                  r={26}
                  fill={isActive ? "oklch(0.25 0.02 60)" : "oklch(0.98 0.01 82)"}
                  stroke="oklch(0.35 0.04 65)"
                  strokeWidth="1.6"
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fontSize="18"
                  fill={isActive ? "oklch(0.98 0.01 82)" : "oklch(0.25 0.02 60)"}
                  fontFamily="'Cormorant Garamond', 'Playfair Display', serif"
                  fontStyle="italic"
                >
                  {s.step}
                </text>
                {/* Owner tag below the node — appears on active */}
                {isActive && (
                  <text
                    x={x}
                    y={y + 52}
                    textAnchor="middle"
                    fontSize="13"
                    fill="oklch(0.35 0.04 65)"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    fontStyle="italic"
                  >
                    {s.actor}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel — driven by whichever node is active */}
      <article className="mt-10 border-t border-sand/50 pt-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-bark/60">
              Stage {active.step} · {active.lane}
            </div>
            <h3 className="mt-2 font-serif text-3xl italic text-ink">{active.title}</h3>
            <p className="mt-1 text-sm text-bark/70">{active.actor}</p>
            <p className="mt-4 text-ink-soft">{active.summary}</p>
            <div className="mt-5 flex items-start gap-3 border-l-2 border-bark pl-4 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-bark" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-bark/70">
                  Timing
                </div>
                <div className="mt-1 text-ink">{active.sla}</div>
              </div>
            </div>
          </div>
          <div className="md:col-span-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <DetailList label="Inputs" items={active.inputs} />
              <DetailList label="Outputs" items={active.outputs} />
              <DetailList label="Tools" items={active.tools} />
            </div>
          </div>
        </div>
      </article>

      {/* SR-only stage roster — keeps the diagram accessible */}
      <ol className="sr-only">
        {stages.map((s, i) => (
          <li key={s.id}>
            Stage {i + 1}: {s.title} — {s.lane} ({s.actor}). {s.summary} SLA: {s.sla}.
          </li>
        ))}
      </ol>
    </div>
  );
}

function DetailList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-bark/70">
        {label}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-ink">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-bark" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
