import { useEffect } from "react";

/**
 * Fires `onBack` on Alt+Left (Option+Left on macOS), matching the
 * "← Back" button behaviour. Ignored while typing in an input/textarea/select
 * so text-editing shortcuts keep working.
 */
export function useBackShortcut(onBack: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" || !e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);
}
