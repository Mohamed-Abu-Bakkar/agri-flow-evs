"use client";

import { Droplets, Wind, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/lib/weather";
import {
  WeatherIcon,
  weatherLabelFromCode,
} from "@/components/shared/WeatherIcon";

interface WeatherBadgeProps {
  data: WeatherData;
  locationLabel: string | null;
  className?: string;
}

export function WeatherBadge({
  data,
  locationLabel,
  className,
}: WeatherBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
          <WeatherIcon
            code={data.weatherCode}
            className="h-4 w-4 text-sky-700"
          />
          {weatherLabelFromCode(data.weatherCode, data.description)}
        </p>
        {locationLabel && (
          <div className="flex min-w-0 items-center gap-1 text-xs text-emerald-800/80">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate max-w-[140px]">{locationLabel}</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 rounded-xl border border-emerald-100 bg-white p-2.5">
          <WeatherIcon
            code={data.weatherCode}
            className="h-5 w-5 text-sky-700"
          />
          <span className="text-lg font-bold leading-none text-zinc-900">
            {Math.round(data.temperature)}°C
          </span>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Temp
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-sky-100 bg-white p-2.5">
          <Droplets className="h-5 w-5 text-sky-600" aria-hidden />
          <span className="text-lg font-bold leading-none text-zinc-900">
            {Math.round(data.humidity)}%
          </span>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Humidity
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-100 bg-white p-2.5">
          <Wind className="h-5 w-5 text-zinc-500" aria-hidden />
          <span className="text-lg font-bold leading-none text-zinc-900">
            {Math.round(data.windSpeed)}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Wind km/h
          </span>
        </div>
      </div>
      {locationLabel && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
          <MapPin className="h-3 w-3" aria-hidden />
          GPS used for runoff context
        </p>
      )}
    </div>
  );
}
