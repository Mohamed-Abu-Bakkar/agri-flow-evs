import { useCallback, useEffect, useState } from "react";
import {
  formatCoordinates,
  getPlace,
  peekPlaceCache,
  type GeolocatedPlace,
} from "@/lib/location";

export type { GeolocatedPlace };

interface UseGeolocationResult {
  loading: boolean;
  error: string | null;
  place: GeolocatedPlace | null;
  label: string | null;
  coordinates: string | null;
  accuracy: number | null;
  locate: (options?: { force?: boolean }) => Promise<GeolocatedPlace | null>;
  refresh: () => Promise<GeolocatedPlace | null>;
}

export function useGeolocation(): UseGeolocationResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<GeolocatedPlace | null>(
    () => peekPlaceCache()
  );

  useEffect(() => {
    const cached = peekPlaceCache();
    if (cached) setPlace(cached);
  }, []);

  const locate = useCallback(
    async (options?: { force?: boolean }): Promise<GeolocatedPlace | null> => {
      const cached = peekPlaceCache();
      if (!options?.force && cached) {
        setPlace(cached);
        return cached;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await getPlace(options);
        setPlace(next);
        return next;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Location failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(() => locate({ force: true }), [locate]);

  return {
    loading,
    error,
    place,
    label: place?.label ?? null,
    coordinates: place ? formatCoordinates(place.point) : null,
    accuracy: place?.point.accuracy ?? null,
    locate,
    refresh,
  };
}
