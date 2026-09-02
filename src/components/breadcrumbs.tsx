import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type Crumb = {
  label: ReactNode;
  /** Link props (to, params, search). Omit for the current page. */
  link?: Record<string, any>;
};

/**
 * Responsive breadcrumb trail.
 * - Mobile (<sm): collapses middle segments into "…" while keeping first and
 *   last visible. The ellipsis is a native <select>-free menu using <details>
 *   so every hidden segment stays clickable.
 * - sm+: shows every segment inline.
 * All segments remain <Link>s (except the final current page).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  const first = items[0];
  const last = items[items.length - 1];
  const middle = items.slice(1, -1);
  const collapsed = middle.length > 0;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 min-w-0 text-sm text-muted-foreground">
      {/* Mobile: first / … / last */}
      <ol className="flex min-w-0 items-center gap-1.5 sm:hidden">
        <Segment crumb={first} />
        {collapsed && (
          <>
            <li><Sep /></li>
            <li className="relative shrink-0">
              <details className="group">
                <summary
                  className="cursor-pointer list-none rounded px-1 hover:text-foreground [&::-webkit-details-marker]:hidden"
                  aria-label="Show hidden breadcrumb segments"
                >
                  …
                </summary>
                <ul className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-md border border-border bg-background p-1 shadow-md">
                  {middle.map((c, i) => (
                    <li key={i}>
                      {c.link ? (
                        <Link {...(c.link as any)} className="block truncate rounded px-2 py-1.5 hover:bg-muted hover:text-foreground">
                          {c.label}
                        </Link>
                      ) : (
                        <span className="block truncate px-2 py-1.5">{c.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          </>
        )}
        {items.length > 1 && <li><Sep /></li>}
        <li className="min-w-0 flex-1">
          <span className="block truncate text-foreground">{last.label}</span>
        </li>
      </ol>

      {/* Desktop: full trail */}
      <ol className="hidden min-w-0 flex-wrap items-center gap-1.5 sm:flex">
        {items.map((c, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <Sep />}
              {isLast || !c.link ? (
                <span className={`min-w-0 truncate ${isLast ? "text-foreground" : ""}`}>{c.label}</span>
              ) : (
                <Link {...(c.link as any)} className="min-w-0 truncate hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Segment({ crumb }: { crumb: Crumb }) {
  return (
    <li className="min-w-0 shrink-0">
      {crumb.link ? (
        <Link {...(crumb.link as any)} className="truncate hover:text-foreground">
          {crumb.label}
        </Link>
      ) : (
        <span className="truncate">{crumb.label}</span>
      )}
    </li>
  );
}

function Sep() {
  return (
    <span aria-hidden className="shrink-0 text-muted-foreground/60">
      <ChevronRight className="h-3.5 w-3.5" />
    </span>
  );
}

