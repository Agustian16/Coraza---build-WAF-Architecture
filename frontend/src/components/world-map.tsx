"use client";

import { useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import type { GeoStat } from "@/lib/types";

const W = 820;
const H = 420;

// Projection + land paths are deterministic — computed once, safe for SSR.
const countries = feature(
  worldData as never,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (worldData as any).objects.countries
) as unknown as GeoJSON.FeatureCollection;
const pathGen = geoPath(geoNaturalEarth1().fitSize([W, H], { type: "Sphere" } as never));
const countryPaths = countries.features.map((f) => pathGen(f) ?? "");
const project = (lng: number, lat: number): [number, number] | null => {
  const p = geoNaturalEarth1().fitSize([W, H], { type: "Sphere" } as never)([lng, lat]);
  return p ?? null;
};

export function WorldMap({ stats }: { stats: GeoStat[] }) {
  const [hover, setHover] = useState<GeoStat | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {countryPaths.map((d, i) => (
          <path key={i} d={d} fill="var(--hover)" stroke="var(--line2)" strokeWidth={0.4} />
        ))}
        {stats.map((s) => {
          const pt = project(s.lng, s.lat);
          if (!pt) return null;
          const rReq = Math.max(3, Math.sqrt(s.requests / 20000));
          const rBlk = Math.max(1.5, Math.sqrt(s.blocked / 900));
          return (
            <g
              key={s.code}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
            >
              {/* requests */}
              <circle cx={pt[0]} cy={pt[1]} r={rReq} fill="#22d3ee" fillOpacity={0.35} stroke="#22d3ee" strokeWidth={0.8} />
              {/* blocked (inner) */}
              <circle cx={pt[0]} cy={pt[1]} r={rBlk} fill="#f43f5e" />
            </g>
          );
        })}
      </svg>

      {hover && (
        <GeoTooltip stat={hover} />
      )}

      <div className="mt-2 flex items-center gap-5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-cyan-400 bg-cyan-400/35" />
          Requests (area)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Blocked (core)
        </span>
      </div>
    </div>
  );
}

function GeoTooltip({ stat }: { stat: GeoStat }) {
  const pct = ((stat.blocked / stat.requests) * 100).toFixed(1);
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-panel px-3 py-2 text-xs shadow-xl">
      <div className="font-medium text-ink">{stat.country}</div>
      <div className="font-mono text-[11px] text-muted">
        req: {stat.requests.toLocaleString("en-US")} · blocked:{" "}
        <span className="text-red-400">{stat.blocked.toLocaleString("en-US")}</span> ({pct}%)
      </div>
    </div>
  );
}
