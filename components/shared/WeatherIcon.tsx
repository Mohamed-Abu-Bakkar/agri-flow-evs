"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type WeatherKind =
  | "sun"
  | "partly"
  | "cloud"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

/** OpenWeatherMap condition IDs → icon kind */
export function weatherKindFromCode(code: number): WeatherKind {
  if (code >= 200 && code < 300) return "storm";
  if (code >= 300 && code < 400) return "rain";
  if (code >= 500 && code < 600) return "rain";
  if (code >= 600 && code < 700) return "snow";
  if (code >= 700 && code < 800) return "fog";
  if (code === 800) return "sun";
  if (code === 801 || code === 802) return "partly";
  if (code === 803 || code === 804) return "cloud";
  return "partly";
}

export function weatherLabelFromCode(code: number, description?: string): string {
  if (description && description.trim()) {
    return description
      .trim()
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  const kind = weatherKindFromCode(code);
  switch (kind) {
    case "sun":
      return "Clear";
    case "partly":
      return "Partly cloudy";
    case "cloud":
      return "Overcast";
    case "fog":
      return "Fog";
    case "rain":
      return "Rain";
    case "snow":
      return "Snow";
    case "storm":
      return "Storm";
  }
}

const icons: Record<WeatherKind, typeof Sun> = {
  sun: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

interface WeatherIconProps {
  code: number;
  className?: string;
}

export function WeatherIcon({ code, className }: WeatherIconProps) {
  const Icon = icons[weatherKindFromCode(code)];
  return <Icon className={cn("h-5 w-5", className)} aria-hidden />;
}
