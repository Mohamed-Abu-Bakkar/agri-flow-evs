"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { WeatherBadge } from "@/components/shared/WeatherBadge";
import { useWeather } from "@/hooks/useWeather";

interface WeatherPanelProps {
  showRefresh?: boolean;
  title?: string;
}

export function WeatherPanel({
  showRefresh = true,
  title = "Weather capture",
}: WeatherPanelProps) {
  const { weather, loading, error, geo, reload } = useWeather();

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          {title}
        </h2>
        {showRefresh && weather && (
          <button
            type="button"
            onClick={() => void reload({ forceLocation: true })}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        )}
      </div>

      <div className="mt-3">
        {weather ? (
          <WeatherBadge data={weather} locationLabel={geo.label} />
        ) : loading ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-700" aria-hidden />
            Fetching GPS location &amp; weather…
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            No weather data yet. Uses high-accuracy GPS.
          </p>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {!error && geo.error && (
        <p className="mt-2 text-sm text-red-600">{geo.error}</p>
      )}

      {!weather && (
        <button
          type="button"
          onClick={() => void reload({ forceLocation: true })}
          disabled={loading}
          className="mt-3 w-full inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Capturing GPS weather…
            </>
          ) : (
            "Capture precise weather"
          )}
        </button>
      )}
    </section>
  );
}
