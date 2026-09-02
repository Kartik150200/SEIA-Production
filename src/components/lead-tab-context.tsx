import { createContext, useContext } from "react";

export type LeadOrigin = "pipeline" | "won";

export type LeadTabContextValue = {
  openLead: (id: string, from?: LeadOrigin, opts?: { returnTab?: string }) => void;
  openPipeline?: (opts?: { slaOnly?: boolean }) => void;
};

export const LeadTabContext = createContext<LeadTabContextValue | null>(null);

export function useLeadTab() {
  const ctx = useContext(LeadTabContext);
  return ctx ?? { openLead: () => {}, openPipeline: () => {} };
}
