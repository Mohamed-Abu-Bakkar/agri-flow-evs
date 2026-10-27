"use client";

import { useCallback, useEffect, useState } from "react";
import { getWeatherCached, peekWeatherCache, type WeatherData } from "@/lib/weather";
import { useGeolocation } from "@/hooks/useGeolocation";

interface UseWeatherResult {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  geo: ReturnType<typeof useGeolocation>;
  reload: (options?: { forceLocation?: boolean }) => Promise<void>;
}

export function useWeather(): UseWeatherResult {
  const geo = useGeolocation();
  const [weather, setWeather] = useState<WeatherData | null>(
    () => peekWeatherCache()
  );
  const [loading, setLoading] = useState(() => !peekWeatherCache());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { forceLocation?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const place = await geo.locate({
          force: options?.forceLocation === true,
        });
        if (!place) {
          return;
        }
        const data = await getWeatherCached(
          place.point.latitude,
          place.point.longitude,
          { force: options?.forceLocation === true }
        );
        setWeather(data);
      } catch {
        setError("Failed to fetch weather");
        setWeather(peekWeatherCache());
      } finally {
        setLoading(false);
      }
    },
    [geo.locate]
  );

  useEffect(() => {
    if (peekWeatherCache()) {
      setWeather(peekWeatherCache());
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const place = await geo.locate();
        if (!place || cancelled) return;
        const data = await getWeatherCached(
          place.point.latitude,
          place.point.longitude
        );
        if (!cancelled) setWeather(data);
      } catch {
        if (!cancelled) setError("Failed to fetch weather");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [geo.locate]);

  const reload = useCallback(
    async (options?: { forceLocation?: boolean }) => {
      await load(options);
    },
    [load]
  );

  return { weather, loading, error, geo, reload };
}
