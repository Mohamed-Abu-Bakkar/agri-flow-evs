"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { PageHeader } from "@/components/shared/PageHeader";
import { SeedCard, type SeedEntry } from "@/components/shared/SeedCard";
import { WeatherIcon, weatherLabelFromCode } from "@/components/shared/WeatherIcon";
import { useWeather } from "@/hooks/useWeather";
import {
  buildTodos,
  countOpenTodos,
  loadPlanDone,
} from "@/lib/todos";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

function toSeedEntry(doc: Doc<"seeds">): SeedEntry {
  return {
    id: doc._id,
    name: doc.name,
    variety: doc.variety,
    datePlanted: doc.datePlanted,
    farmName: doc.farmName,
    soilType: doc.soilType,
    location: doc.location,
  };
}

function riskFromPlan(
  plan: { runoffWarning: string; fertilizerAdvice: string } | undefined | null
): { elevated: boolean; headline: string; detail: string; bullets: string[] } {
  if (!plan) {
    return {
      elevated: false,
      headline: "No plan yet",
      detail: "Generate an AI plan to score runoff risk for your fields.",
      bullets: [],
    };
  }
  const warning = plan.runoffWarning.trim();
  const elevated =
    warning.length > 0 && warning.toLowerCase() !== "none";
  const bullets = plan.fertilizerAdvice
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    elevated,
    headline: elevated ? "Elevated" : "Low",
    detail: elevated
      ? warning
      : "No significant runoff risk detected for current conditions.",
    bullets,
  };
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const { weather, loading: weatherLoading, geo } = useWeather();

  const ensureUser = useMutation(api.users.ensure);
  const seeds = useQuery(api.seeds.listByUser, userId ? { userId } : "skip");
  const plans = useQuery(
    api.recommendations.listByUser,
    userId ? { userId } : "skip"
  );
  const readings = useQuery(
    api.sensorReadings.listByUser,
    userId ? { userId } : "skip"
  );

  useEffect(() => {
    let cancelled = false;
    void ensureUser()
      .then((id) => {
        if (!cancelled) setUserId(id);
      })
      .catch(() => {
        if (!cancelled) setBootError("Backend unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [ensureUser]);

  const latestPlan = plans?.[0];
  const risk = riskFromPlan(latestPlan);
  const seedCount = seeds?.length ?? null;
  const recentSeeds = (seeds ?? []).slice(0, 3).map(toSeedEntry);

  const latestBySeed = new Map<string, { timestamp: string; soilTemperatureC: number }>();
  (readings ?? []).forEach((r) => {
    const cur = latestBySeed.get(r.seedId);
    if (!cur || r.timestamp > cur.timestamp) {
      latestBySeed.set(r.seedId, { timestamp: r.timestamp, soilTemperatureC: r.soilTemperatureC });
    }
  });
  const openTodoCount = countOpenTodos(
    buildTodos(seeds ?? [], latestPlan),
    loadPlanDone()
  );

  return (
    <main className="flex min-h-screen flex-col bg-white pb-8">
      <PageHeader
        eyebrow="Runoff control"
        title="AgriFlow Guardian"
        subtitle="Reduce runoff. Farm smarter."
        showBack={false}
        trailing={
          <button
            type="button"
            onClick={() => void geo.refresh()}
            className="flex w-24 flex-col items-center gap-1 rounded-xl border border-white/25 bg-white/15 px-2 py-2 transition active:scale-95"
            title={geo.label ? `${geo.label} — tap to refresh location` : "Refresh location"}
            aria-label={geo.label ? `${geo.label}. Refresh location` : "Refresh location"}
          >
            <MapPin
              className={cn(
                "h-5 w-5 shrink-0 text-white",
                geo.loading && "animate-pulse"
              )}
              aria-hidden
            />
            <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-emerald-50">
              {geo.label
                ? geo.label
                : geo.error
                  ? geo.error
                  : geo.loading
                    ? "Locating…"
                    : "Location"}
            </span>
            {geo.coordinates && (
              <span className="w-full truncate text-center font-mono text-[9px] leading-tight text-emerald-100/85">
                {geo.coordinates}
              </span>
            )}
          </button>
        }
      />

      <div className="-mt-3 flex flex-col gap-4 px-5">
        <section
          className={
            risk.elevated
              ? "rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"
              : "rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4"
          }
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">
                Field runoff risk
              </p>
              <p className="mt-0.5 text-3xl font-bold text-zinc-900">
                {seedCount === null && !bootError ? "…" : risk.headline}
              </p>
            </div>
            <span
              className={
                risk.elevated
                  ? "rounded-full bg-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950"
                  : "rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
              }
            >
              {risk.elevated ? "⚠ ACTION" : "✓ OK"}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
            <div
              className={
                risk.elevated
                  ? "h-full w-[68%] rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
                  : "h-full w-[18%] rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
              }
            />
          </div>
          <p className="mt-3 text-sm text-zinc-800">{risk.detail}</p>
          {risk.bullets.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-zinc-800">
              {risk.bullets.map((b, i) => (
                <li key={`risk-${i}`} className="flex gap-2">
                  <span className="text-amber-700" aria-hidden>
                    ·
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {bootError && (
            <p className="mt-2 text-xs text-red-600">{bootError}</p>
          )}
        </section>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
            <p className="text-xl font-bold leading-none text-emerald-800">
              {seedCount ?? "–"}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
              Seeds
            </p>
          </div>

          <Link
            href="/farm"
            className="flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-xl border border-sky-100 bg-sky-50 p-3 text-center transition active:scale-95"
            aria-label="Open weather details"
          >
            {weather ? (
              <>
                <span className="flex items-center gap-1.5">
                  <WeatherIcon
                    code={weather.weatherCode}
                    className="h-5 w-5 shrink-0 text-sky-700"
                  />
                  <span className="text-xl font-bold leading-none text-sky-900">
                    {Math.round(weather.temperature)}°C
                  </span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-sky-700">
                  {weatherLabelFromCode(weather.weatherCode, weather.description)}
                </span>
                <span className="text-[10px] text-sky-600/90">
                  {Math.round(weather.humidity)}% · {Math.round(weather.windSpeed)} km/h
                </span>
              </>
            ) : weatherLoading ? (
              <>
                <span className="text-xl font-bold leading-none text-sky-400">
                  …
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-sky-600">
                  Weather
                </span>
              </>
            ) : (
              <>
                <span className="text-xl font-bold leading-none text-sky-700">
                  —°
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-sky-600">
                  Weather off
                </span>
              </>
            )}
          </Link>

          <Link
            href="/plans"
            className="flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-xl border border-violet-100 bg-violet-50 p-3 text-center transition active:scale-95"
            aria-label="Open today's plan"
          >
            <p className="text-xl font-bold leading-none text-violet-800">
              {openTodoCount}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-700">
              Today&apos;s plan
            </p>
          </Link>
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Field log
            </h2>
            <Link
              href="/farm"
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              See all
            </Link>
          </div>
          {seeds === undefined && (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
              Loading field data…
            </p>
          )}
          {seeds !== undefined && recentSeeds.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
              No seeds logged yet.
            </p>
          )}
          {recentSeeds.map((seed) => {
            const reading = latestBySeed.get(seed.id);
            return (
              <SeedCard
                key={seed.id}
                entry={{
                  ...seed,
                  soilTemperatureC: reading?.soilTemperatureC,
                }}
              />
            );
          })}
        </section>

        <div className="space-y-2.5 pt-1">
                    <Link
            href="/farm"
            className="block w-full rounded-xl border border-emerald-700/30 bg-white py-3 text-center text-sm font-semibold text-emerald-800 active:scale-[0.98] transition"
          >
            + Log seed &amp; capture weather
          </Link>
        </div>
      </div>
    </main>
  );
}
