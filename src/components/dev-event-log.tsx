import { useEffect, useState } from "react";

type LogEntry = {
  id: number;
  event: string;
  ts: number;
  props: Record<string, unknown>;
};

const WATCHED = new Set([
  "nav_section_click",
  "funnel_step_view",
  "section_visible",
  "section_engaged",
  "funnel_drawer_open",
]);

const MAX = 8;

/**
 * Development-only floating event log. Renders nothing in production.
 * Listens to `app:track` CustomEvents dispatched by trackEvent().
 */
export function DevEventLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    let nextId = 1;
    const onTrack = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { event?: string; ts?: number; [k: string]: unknown }
        | undefined;
      if (!detail?.event || !WATCHED.has(detail.event)) return;
      const { event, ts, ...props } = detail;
      setEntries((prev) =>
        [{ id: nextId++, event, ts: ts ?? Date.now(), props }, ...prev].slice(0, MAX),
      );
    };
    window.addEventListener("app:track", onTrack as EventListener);
    return () => window.removeEventListener("app:track", onTrack as EventListener);
  }, []);

  if (!import.meta.env?.DEV) return null;

  return (
    <div
      aria-label="Development event log"
      className="fixed bottom-3 right-3 z-[60] w-[280px] rounded border border-black/20 bg-black/85 font-mono text-[10px] text-emerald-200 shadow-lg backdrop-blur"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-emerald-100/90 hover:text-white"
        aria-expanded={open}
      >
        <span className="uppercase tracking-[0.18em]">Dev · events</span>
        <span className="text-emerald-300/70">
          {entries.length}/{MAX} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <ol className="max-h-64 overflow-auto border-t border-white/10 px-2.5 py-1.5">
          {entries.length === 0 && (
            <li className="py-2 text-emerald-100/40">
              waiting for nav_section_click / funnel_step_view / section_engaged…
            </li>
          )}
          {entries.map((e) => (
            <li key={e.id} className="border-b border-white/5 py-1 last:border-b-0">
              <div className="flex items-center justify-between text-emerald-200">
                <span className="truncate">{e.event}</span>
                <span className="text-emerald-100/40">
                  {new Date(e.ts).toLocaleTimeString([], { hour12: false })}
                </span>
              </div>
              {Object.keys(e.props).length > 0 && (
                <div className="truncate text-emerald-100/60">
                  {Object.entries(e.props)
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(" ")}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
