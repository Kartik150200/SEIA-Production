// SEIA physical office footprint — real USA outline via react-simple-maps.
import { useMemo, useState } from "react";
import { X, Plus, Minus, RotateCcw, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { officeCoords, officeMapsUrl, officeSlug, type Office } from "../data/offices";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export type OfficePoint = Office & {
  leads: number;
  won: number;
  aum: number;
};

export function OfficeMap({ offices }: { offices: OfficePoint[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [-96, 38],
    zoom: 1,
  });
  const zoomIn = () => setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }));
  const zoomOut = () => setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }));
  const zoomReset = () => setPosition({ coordinates: [-96, 38], zoom: 1 });

  const maxTeam = Math.max(...offices.map((o) => o.teamSize), 1);
  const points = useMemo(
    () => offices.map((o) => ({ ...o, coords: officeCoords(o.name) })),
    [offices],
  );
  const active = points.find((p) => p.name === hover) ?? null;
  const detail = points.find((p) => p.name === selected) ?? null;

  return (
    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-lg border border-border bg-surface-elevated md:aspect-[16/9]">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1200 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={1}
          maxZoom={8}
          onMoveEnd={(pos) => setPosition(pos as { coordinates: [number, number]; zoom: number })}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="var(--cream)"
                  stroke="var(--sand)"
                  strokeWidth={0.5 / position.zoom}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "var(--cream)" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {points.map((p) => {
            const r = (4 + (p.teamSize / maxTeam) * 8) / position.zoom;
            const isHover = hover === p.name;
            const isSelected = selected === p.name;
            return (
              <Marker
                key={p.name}
                coordinates={p.coords}
                onMouseEnter={() => setHover(p.name)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setSelected(p.name)}
                style={{
                  default: { cursor: "pointer" },
                  hover: { cursor: "pointer" },
                  pressed: { cursor: "pointer" },
                }}
              >
                <circle
                  r={r + 5 / position.zoom}
                  fill="var(--bark)"
                  opacity={isHover || isSelected ? 0.25 : 0.1}
                />
                <circle
                  r={r}
                  fill="var(--bark)"
                  opacity={isHover || isSelected ? 1 : 0.85}
                  stroke={isSelected || p.hq ? "var(--paper)" : "none"}
                  strokeWidth={isSelected || p.hq ? 1.5 / position.zoom : 0}
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      <div className="absolute left-3 top-3 z-10 flex flex-col overflow-hidden rounded-md border border-border bg-background/90 shadow-sm">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="p-1.5 text-foreground hover:bg-muted disabled:opacity-40"
          disabled={position.zoom >= 8}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          className="border-t border-border p-1.5 text-foreground hover:bg-muted disabled:opacity-40"
          disabled={position.zoom <= 1}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={zoomReset}
          aria-label="Reset zoom"
          className="border-t border-border p-1.5 text-foreground hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {active && !detail && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 min-w-[220px] -translate-x-1/2 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-sm">
          <div className="font-medium text-foreground">
            {active.name}
            {active.hq ? " · HQ" : ""}
          </div>
          <div className="mt-0.5 text-muted-foreground">
            {active.city}, {active.state}
          </div>
          <div className="mt-1 flex gap-3 text-muted-foreground">
            <span>Team of {active.teamSize}</span>
            <span>{active.won} won</span>
            <span className="text-foreground">${active.aum.toFixed(1)}M</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            Click for details
          </div>
        </div>
      )}

      <div className="absolute bottom-2 right-3 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-bark" />
        Branch · dot size = team size
      </div>

      {detail && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-[min(420px,90%)] rounded-xl border border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Close details"
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold">
              Branch{detail.hq ? " · Headquarters" : ""}
            </div>
            <Link
              to="/offices/$officeId"
              params={{ officeId: officeSlug(detail.name) }}
              search={{ from: "map" } as never}
              className="mt-1 block font-display text-2xl text-foreground hover:text-gold hover:underline"
            >
              {detail.name}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {detail.street}
              {detail.suite ? `, ${detail.suite}` : ""} · {detail.city}, {detail.state} {detail.zip}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <Stat label="Team" value={String(detail.teamSize)} />
              <Stat label="Clients won" value={String(detail.won)} />
              <Stat label="AUM" value={`$${detail.aum.toFixed(1)}M`} />
            </div>

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <Row label="Advisor-stage leads" value={String(detail.leads)} />
              <Row label="Phone" value={detail.phone} />
              {detail.fax && <Row label="Fax" value={detail.fax} />}
            </div>

            <a
              href={officeMapsUrl(detail)}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline"
            >
              Get directions <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg text-foreground">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-1 last:border-none">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
