import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyBackendSnapshot, subscribeAppData } from "@/data/leads";

/**
 * On mount, fetches the seeded app snapshot from Lovable Cloud (`app_data`)
 * and applies it to the in-memory data store. Children re-render once the
 * snapshot has been applied. Unauthenticated visitors keep the initial
 * mock — the table is only readable by authenticated users.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [, force] = useState(0);

  useEffect(() => {
    const unsub = subscribeAppData(() => force((v) => v + 1));
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const { data, error } = await supabase
        .from("app_data")
        .select("key, payload");
      if (cancelled) return;
      if (error || !data) return;

      const map = new Map<string, unknown>();
      for (const row of data) map.set(row.key as string, row.payload);

      const advisors = map.get("advisors") as unknown;
      const leads = map.get("leads") as unknown;
      const lead_meta = map.get("lead_meta") as unknown;
      const advisor_activity = map.get("advisor_activity") as unknown;

      if (
        Array.isArray(advisors) &&
        Array.isArray(leads) &&
        lead_meta &&
        typeof lead_meta === "object" &&
        Array.isArray(advisor_activity)
      ) {
        applyBackendSnapshot({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advisors: advisors as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leads: leads as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lead_meta: lead_meta as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advisor_activity: advisor_activity as any,
        });
      }
    }

    void hydrate();

    // Re-hydrate on sign-in (RLS restricts reads to authenticated users).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") void hydrate();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
