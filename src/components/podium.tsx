// Advisor leaderboard podium — animated bar heights, medal SVGs.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

export type PodiumEntry = { id: string; name: string; won: number; aum: number };

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const [mount, setMount] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setMount(true)); return () => cancelAnimationFrame(t); }, []);

  const top = [...entries].sort((a, b) => b.won - a.won).slice(0, 3);
  const max = Math.max(...top.map((t) => t.won), 1);
  const order = [top[1], top[0], top[2]].filter(Boolean); // 2nd, 1st, 3rd
  const rankOf = (e: PodiumEntry) => top.findIndex((x) => x.id === e.id) + 1;

  return (
    <div className="grid grid-cols-3 items-end gap-4 rounded-2xl border border-border bg-surface-elevated p-6">
      {order.map((e) => {
        const rank = rankOf(e);
        const heightPct = (e.won / max) * 100;
        const podiumH = rank === 1 ? 140 : rank === 2 ? 108 : 82;
        return (
          <div key={e.id} className="flex flex-col items-center">
            <Medal rank={rank} />
            <Link
              to="/advisors/$advisorId"
              params={{ advisorId: e.id }}
              className="mt-2 text-center font-display text-sm font-semibold text-foreground hover:text-gold"
            >
              {e.name}
            </Link>
            <div className="text-xs text-muted-foreground">${e.aum.toFixed(1)}M · {e.won} won</div>
            <div
              className={`mt-3 w-full rounded-t-lg ${rank === 1 ? "gold-gradient" : rank === 2 ? "bg-bark/70" : "bg-bark/50"}`}
              style={{
                height: mount ? podiumH : 0,
                transition: "height 1.1s cubic-bezier(.2,.7,.2,1)",
                opacity: 0.3 + (heightPct / 100) * 0.7,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Medal({ rank }: { rank: number }) {
  const fill = rank === 1 ? "var(--bark)" : rank === 2 ? "var(--sand)" : "oklch(0.6 0.08 60)";
  return (
    <svg width="28" height="34" viewBox="0 0 28 34" aria-label={`Rank ${rank}`}>
      <path d="M8,0 L20,0 L18,10 L10,10 Z" fill={fill} opacity="0.7" />
      <circle cx="14" cy="20" r="10" fill={fill} stroke="var(--paper)" strokeWidth="1.5" />
      <text x="14" y="24" fontSize="10" fontWeight="700" fill="var(--paper)" textAnchor="middle" fontFamily="serif">{rank}</text>
    </svg>
  );
}
