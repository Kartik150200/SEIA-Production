import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { trackEvent } from "../lib/track";
import { useActiveSection } from "../hooks/use-active-section";
import { DevEventLog } from "../components/dev-event-log";
import { supabase } from "@/integrations/supabase/client";
import { AppDataProvider } from "@/components/app-data-provider";
import { SiteThemeProvider, ThemeToggle, SeiaLogoMark, useSiteTheme } from "@/components/site-theme";
import { Toaster } from "@/components/ui/sonner";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SEIA Lead Nurturing Workflow" },
      {
        name: "description",
        content:
          "Visual workflow of the SEIA wealth management lead nurturing process — from Schwab & Fidelity referrals to signed clients.",
      },
      { property: "og:title", content: "SEIA Lead Nurturing Workflow" },
      {
        property: "og:description",
        content:
          "From referral to signed client: how SEIA moves leads through BDO, PlanScout, and the Advisor team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=Inter:wght@300;400;500;600;700&family=Pinyon+Script&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <DevEventLog />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const navigate = useNavigate();
  const activeSection = useActiveSection(["faq"], "/");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSignedIn(!!session);
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!signedIn) return;
    const path = router.state.location.pathname;
    const publicOnly = ["/", "/integrations", "/security"];
    if (publicOnly.includes(path)) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [signedIn, router.state.location.pathname, navigate]);

  const onSectionNav = (section: "faq") => () => {
    trackEvent("nav_section_click", { section, source: "top_nav" });
  };


  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SiteThemeProvider>
        <AppDataProvider>
          <NavShell
            signedIn={signedIn}
            activeSection={activeSection}
            onSectionNav={onSectionNav}
            handleSignOut={handleSignOut}
          />
        </AppDataProvider>
      </SiteThemeProvider>
    </QueryClientProvider>
  );
}

function NavShell({
  signedIn,
  activeSection,
  onSectionNav,
  handleSignOut,
}: {
  signedIn: boolean;
  activeSection: string | null;
  onSectionNav: (s: "faq") => () => void;
  handleSignOut: () => void;
}) {
  const { theme } = useSiteTheme();
  const isSeia = theme === "seia";
  const [mobileOpen, setMobileOpen] = useState(false);
  const linkBase =
    "border-b border-transparent pb-1 text-muted-foreground transition-colors hover:text-ink data-[status=active]:border-bark data-[status=active]:text-ink";
  const faqBase =
    "border-b border-transparent pb-1 text-muted-foreground transition-colors hover:text-ink data-[active=true]:border-bark data-[active=true]:text-ink";

  const publicLinks = (
    <>
      <Link to="/" activeOptions={{ exact: true }} className={linkBase} onClick={() => setMobileOpen(false)}>
        Workflow
      </Link>
      <Link
        to="/"
        hash="faq"
        onClick={() => {
          onSectionNav("faq")();
          setMobileOpen(false);
        }}
        data-active={activeSection === "faq" ? "true" : undefined}
        className={faqBase}
      >
        FAQ
      </Link>
      <Link to="/integrations" className={linkBase} onClick={() => setMobileOpen(false)}>
        Integrations
      </Link>
      <Link to="/security" className={linkBase} onClick={() => setMobileOpen(false)}>
        Security
      </Link>
    </>
  );

  const privateLinks = (
    <>
      <Link to="/dashboard" className={linkBase} onClick={() => setMobileOpen(false)}>
        Dashboard
      </Link>
    </>
  );




  const authAction = signedIn ? (
    <button
      type="button"
      onClick={() => {
        setMobileOpen(false);
        handleSignOut();
      }}
      className={`text-[11px] uppercase tracking-[0.22em] hover:text-ink ${
        isSeia ? "text-white/70 hover:!text-white" : "text-muted-foreground"
      }`}
    >
      Sign out
    </button>
  ) : (
    <Link
      to="/auth"
      onClick={() => setMobileOpen(false)}
      className={`text-[11px] uppercase tracking-[0.22em] hover:text-ink ${
        isSeia ? "text-white/70 hover:!text-white" : "text-muted-foreground"
      }`}
    >
      Sign in
    </Link>
  );

  return (
    <div className={`min-h-screen text-foreground ${isSeia ? "bg-transparent" : "bg-background"}`}>
      <nav
        className={`sticky top-0 z-40 border-b backdrop-blur-md ${
          isSeia ? "border-white/10 bg-[#02014a]/70" : "border-border/60 bg-background/85"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={`flex min-w-0 items-center gap-2 font-serif text-lg sm:gap-3 ${
              isSeia ? "text-white" : "text-ink"
            }`}
          >
            <span className="shrink-0">
              <SeiaLogoMark />
            </span>
            <span
              className={`truncate italic text-sm sm:text-base ${
                isSeia ? "text-white/70" : "text-bark/70"
              }`}
            >
              Growth Labs
            </span>
          </Link>

          {/* Desktop links */}
          <div
            className={`hidden lg:flex items-center justify-center gap-8 text-[11px] uppercase tracking-[0.22em] ${
              isSeia
                ? "[&_a]:text-white/70 [&_a:hover]:!text-white [&_a[data-status=active]]:!text-white [&_a[data-active=true]]:!text-white"
                : ""
            }`}
          >
            {signedIn ? privateLinks : publicLinks}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center justify-end gap-3 sm:gap-4 lg:ml-0">
            <ThemeToggle />
            <div className="hidden sm:block">{authAction}</div>
            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border lg:hidden ${
                isSeia
                  ? "border-white/20 text-white/80 hover:text-white"
                  : "border-border/60 text-muted-foreground hover:text-ink"
              }`}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            className={`lg:hidden border-t ${
              isSeia ? "border-white/10 bg-[#02014a]/95" : "border-border/60 bg-background/95"
            }`}
          >
            <div
              className={`mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 text-[11px] uppercase tracking-[0.22em] sm:px-6 ${
                isSeia
                  ? "[&_a]:text-white/70 [&_a:hover]:!text-white [&_a[data-status=active]]:!text-white [&_a[data-active=true]]:!text-white"
                  : ""
              }`}
            >
              {signedIn ? privateLinks : publicLinks}
              <div className="sm:hidden pt-2 border-t border-border/40">{authAction}</div>
            </div>
          </div>
        )}
      </nav>
      <Outlet />
      <Toaster />
    </div>
  );
}

