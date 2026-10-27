"use client";

import Link from "next/link";
import { Sprout, CalendarDays, MapPin, Eye, ChevronRight, Thermometer, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SeedEntry {
  id: string;
  name: string;
  variety: string;
  datePlanted: string;
  farmName: string;
  soilType: string;
  location?: string;
  soilTemperatureC?: number;
}

interface SeedCardProps {
  entry: SeedEntry;
  className?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysSince(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function SeedCard({ entry, className }: SeedCardProps) {
  const age = daysSince(entry.datePlanted);
  const watching = age !== null && age < 14;

  return (
    <Link
      href={`/schedule?seed=${encodeURIComponent(entry.id)}`}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 transition active:scale-[0.98] hover:border-emerald-300 hover:bg-emerald-50/40",
        className
      )}
      aria-label={`Get AI plan for ${entry.name}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg" aria-hidden>
        <Sprout className="h-5 w-5 text-emerald-700" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-zinc-900">
          {entry.name}
          <span className="font-normal text-zinc-500">{entry.variety}</span>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-emerald-600"
            aria-hidden
          />
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-500">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {entry.farmName} · {entry.soilType}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-zinc-500">
          <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
          {formatDate(entry.datePlanted)}
          {age !== null && ` · Day ${age}`}
        </span>
        {entry.location && (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-emerald-700">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            {entry.location}
          </span>
        )}
        {entry.soilTemperatureC !== undefined ? (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-emerald-700">
            <Thermometer className="h-3 w-3 shrink-0" aria-hidden />
            Soil {entry.soilTemperatureC.toFixed(1)}°C
          </span>
        ) : (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            No sensor
          </span>
        )}
      </span>
      <Badge variant={watching ? "warning" : "success"}>
        {watching ? (
          <>
            <Eye className="mr-1 inline h-3 w-3" aria-hidden />
            WATCH
          </>
        ) : (
          "OK"
        )}
      </Badge>
    </Link>
  );
}
