import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { trackEvent } from "@/lib/track";

/**
 * Dwell (ms) a section must stay the active one before we count it as
 * "engaged". Tuned to filter out fast scroll-throughs.
 */
const ENGAGE_DWELL_MS = 2000;

/**
 * Tracks which of the given DOM section ids is currently in view on the
 * homepage. Returns null when off-route or when no watched section is
 * intersecting. Also mirrors the value to window.__activeSection and the
 * URL hash (via history.replaceState) so nav highlighting stays in sync
 * without triggering a router navigation loop.
 *
 * Fires two analytics events:
 *   - `section_visible`  — the moment a section becomes the active one
 *   - `section_engaged`  — after the user has dwelled ENGAGE_DWELL_MS on it
 * A section only ever fires `section_engaged` once per mount, so scrolling
 * back to the same section doesn't spam duplicates.
 */
export function useActiveSection(ids: string[], routePath = "/"): string | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (pathname !== routePath) {
      setActive(null);
      return;
    }
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    let current: string | null = null;
    const visibility = new Map<string, number>();
    const engaged = new Set<string>();
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let enteredAt = 0;

    const clearDwell = () => {
      if (dwellTimer) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visibility.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0.15; // require at least 15% visibility to count
        visibility.forEach((r, id) => {
          if (r > bestRatio) {
            best = id;
            bestRatio = r;
          }
        });
        if (best !== current) {
          current = best;
          setActive(best);
          (window as unknown as { __activeSection?: string | null }).__activeSection = best;
          // Only sync the URL hash when a section is actively in view.
          // Clearing the hash on scroll-up caused the browser to jump back
          // to the top of the page.
          if (best) {
            const desiredHash = `#${best}`;
            if (window.location.hash !== desiredHash) {
              const url = window.location.pathname + window.location.search + desiredHash;
              window.history.replaceState(null, "", url);
            }
          }

          clearDwell();
          if (best) {
            enteredAt = Date.now();
            trackEvent("section_visible", { section: best });
            const target = best;
            if (!engaged.has(target)) {
              dwellTimer = setTimeout(() => {
                engaged.add(target);
                trackEvent("section_engaged", {
                  section: target,
                  dwell_ms: Date.now() - enteredAt,
                });
              }, ENGAGE_DWELL_MS);
            }
          }
        }
      },
      { threshold: [0, 0.15, 0.3, 0.6, 1], rootMargin: "-96px 0px -40% 0px" },
    );

    targets.forEach((t) => io.observe(t));
    return () => {
      clearDwell();
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, ids.join(","), routePath]);

  return active;
}
