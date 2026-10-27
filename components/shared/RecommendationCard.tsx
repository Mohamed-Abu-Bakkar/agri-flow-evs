"use client";

import { Droplets, Sprout, AlertTriangle, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Recommendation {
  fertilizerAdvice: string;
  irrigationSchedule: string;
  runoffWarning: string;
}

interface RecommendationCardProps {
  data: Recommendation;
  className?: string;
}

function renderLines(text: string) {
  return text.split("\n").filter((line) => line.trim().length > 0);
}

function sectionTitle(icon: React.ReactNode, title: string) {
  return (
    <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-700">
      {icon}
      {title}
    </p>
  );
}

export function RecommendationCard({
  data,
  className,
}: RecommendationCardProps) {
  const fertilizerLines = renderLines(data.fertilizerAdvice);
  const irrigationLines = renderLines(data.irrigationSchedule);
  const runoffText = data.runoffWarning.trim();
  const hasRunoffWarning =
    runoffText.length > 0 && runoffText.toLowerCase() !== "none";

  return (
    <div className={cn("space-y-4", className)}>
      <section
        className={cn(
          "rounded-2xl border-2 p-4",
          hasRunoffWarning
            ? "border-amber-300 bg-amber-50"
            : "border-emerald-300 bg-emerald-50"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-700">
              <AlertTriangle
                className={cn(
                  "h-4 w-4",
                  hasRunoffWarning ? "text-amber-700" : "text-emerald-700"
                )}
                aria-hidden
              />
              Runoff risk
            </p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {hasRunoffWarning ? "Elevated" : "Low"}
            </p>
          </div>
          <Badge variant={hasRunoffWarning ? "warning" : "success"}>
            {hasRunoffWarning ? "WATCH" : "OK"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-zinc-800">
          {hasRunoffWarning
            ? runoffText
            : "No significant runoff risk detected for current conditions."}
        </p>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-white p-4">
        {sectionTitle(
          <ListChecks className="h-4 w-4 text-amber-700" aria-hidden />,
          "Do this"
        )}
        <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
          {fertilizerLines.length > 0 ? (
            fertilizerLines.map((line, i) => (
              <li key={`fert-${i}`} className="flex gap-2">
                <span className="text-amber-700" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))
          ) : (
            <li className="text-zinc-500">No fertilizer advice available.</li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-white p-4">
        {sectionTitle(
          <Droplets className="h-4 w-4 text-sky-700" aria-hidden />,
          "Irrigation schedule"
        )}
        <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
          {irrigationLines.length > 0 ? (
            irrigationLines.map((line, i) => (
              <li key={`irr-${i}`} className="flex gap-2">
                <span className="text-sky-700" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))
          ) : (
            <li className="text-zinc-500">No schedule available.</li>
          )}
        </ul>
      </section>

      <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
        <Sprout className="h-3.5 w-3.5" aria-hidden />
        AgriFlow · fertilizer timing to reduce field runoff
      </p>
    </div>
  );
}
