import { useEffect, useState } from "react";

export function TodayLabel({ className }: { className?: string }) {
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    const update = () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setToday(
        new Date().toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: tz,
        }),
      );
    };
    update();
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(update, msToMidnight + 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={
        className ?? "text-xs uppercase tracking-[0.2em] text-muted-foreground"
      }
      suppressHydrationWarning
    >
      {today || "\u00A0"}
    </div>
  );
}
