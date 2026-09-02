// Lightweight client-side event tracking.
// Pushes to window.dataLayer (GTM), dispatches a CustomEvent on window
// (for anything else listening, incl. tests), and logs in dev.

type EventProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(name: string, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  const payload = { event: name, ts: Date.now(), ...props };
  try {
    (window.dataLayer ||= []).push(payload);
    window.dispatchEvent(new CustomEvent("app:track", { detail: payload }));
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[track]", name, props);
    }
  } catch {
    /* no-op */
  }
}

/** Read the currently active in-view section id set by the homepage. */
export function getActiveSection(): string | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __activeSection?: string }).__activeSection ?? null;
}
