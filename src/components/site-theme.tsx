import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import heroAsset from "@/assets/seia-hero.jpg.asset.json";

type SiteTheme = "warm" | "seia";
type Ctx = { theme: SiteTheme; setTheme: (t: SiteTheme) => void; toggle: () => void };

const ThemeCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "site-theme";

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>("warm");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) as SiteTheme | null;
    if (saved === "seia" || saved === "warm") setTheme(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.siteTheme = theme;
    if (theme === "seia") {
      // Clean white/blue scheme mirroring seia.com — no dark hero overlay.
      document.body.style.backgroundImage = "";
      document.body.style.backgroundAttachment = "";
    } else {
      document.body.style.backgroundImage = "";
      document.body.style.backgroundAttachment = "";
    }
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "warm" ? "seia" : "warm") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useSiteTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return v;
}

export function ThemeToggle() {
  const { theme, toggle } = useSiteTheme();
  const isSeia = theme === "seia";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSeia}
      title={isSeia ? "Switch to Warm Editorial theme" : "Switch to SEIA Ocean theme"}
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-ink"
    >
      <span className={`h-2 w-2 rounded-full ${isSeia ? "bg-blue-500" : "bg-amber-500"}`} />
      {isSeia ? "SEIA" : "Warm"}
    </button>
  );
}

import seiaLogo from "@/assets/seia-mark.png.asset.json";

export function SeiaLogoMark({ className = "" }: { className?: string } = {}) {
  return (
    <img
      src={seiaLogo.url}
      alt="SEIA — Signature Estate & Investment Advisors"
      decoding="async"
      className={`block h-7 sm:h-8 lg:h-9 w-auto max-w-[140px] object-contain shrink-0 select-none ${className}`.trim()}
      draggable={false}
    />
  );
}
