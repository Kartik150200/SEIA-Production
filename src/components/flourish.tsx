// Reusable animated primitives for the Warm Sand aesthetic.
// All motion respects prefers-reduced-motion.
import { useEffect, useRef, useState, type ReactNode } from "react";

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return r;
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { setSeen(true); io.disconnect(); break; }
      },
      { threshold }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return { ref, seen };
}

/** Ticks a number up from 0 when it scrolls into view. */
export function AnimatedCounter({
  value, decimals = 0, prefix = "", suffix = "", duration = 1400, className = "",
}: {
  value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string;
}) {
  const reduced = useReducedMotion();
  const { ref, seen } = useInView<HTMLSpanElement>(0.4);
  const [n, setN] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!seen || reduced) { setN(value); return; }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(value * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration, reduced]);

  const display = n.toLocaleString(undefined, {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}

/** Inline SVG sparkline — no chart lib. */
export function Sparkline({
  data, width = 72, height = 22, stroke = "var(--bark)", fill = "var(--sand)",
}: {
  data: number[]; width?: number; height?: number; stroke?: string; fill?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={area} fill={fill} opacity="0.25" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={stroke} />
    </svg>
  );
}

/** Fades + slides children in on view. */
export function ScrollReveal({
  children, delay = 0, className = "",
}: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  const { ref, seen } = useInView<HTMLDivElement>(0.15);
  const show = reduced || seen;
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(20px)",
        transition: reduced ? "none" : `opacity 700ms ease ${delay}ms, transform 700ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Marquee news ticker, pauses on hover. */
export function Ticker({ items }: { items: string[] }) {
  const reduced = useReducedMotion();
  const doubled = [...items, ...items];
  return (
    <div className="group relative overflow-hidden border-y border-sand/50 bg-background py-2">
      <div
        className="flex whitespace-nowrap"
        style={{
          animation: reduced ? "none" : "ticker-scroll 60s linear infinite",
        }}
      >
        {doubled.map((t, i) => (
          <span key={i} className="mx-8 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-bark/80">
            <span className="h-1.5 w-1.5 rounded-full bg-bark/70" />
            {t}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .group:hover [style*="ticker-scroll"] { animation-play-state: paused; }
      `}</style>
    </div>
  );
}

/** Circular arc gauge (0-100). */
export function RingGauge({
  value, size = 56, stroke = 6, label,
}: { value: number; size?: number; stroke?: number; label?: string }) {
  const reduced = useReducedMotion();
  const { ref, seen } = useInView<HTMLDivElement>(0.4);
  const shown = reduced || seen ? value : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, shown)) / 100) * c;
  return (
    <div ref={ref} className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--sand)" strokeOpacity="0.5" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--bark)" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: reduced ? "none" : "stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      {label && <span className="text-[10px] uppercase tracking-widest text-bark/70">{label}</span>}
    </div>
  );
}
