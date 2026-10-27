export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const MIN_ACCURACY_M = 80;
const FIX_ATTEMPTS = 2;
const FIX_TIMEOUT_MS = 8000;

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function requestPosition(
  options: PositionOptions
): Promise<GeoPoint> {
  if (await isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? FIX_TIMEOUT_MS,
      maximumAge: options.maximumAge ?? 0,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  }

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission denied"));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error("Location unavailable"));
        } else {
          reject(new Error("Location request timed out"));
        }
      },
      options
    );
  });
}

export async function getPrecisePosition(): Promise<GeoPoint> {
  let best: GeoPoint | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < FIX_ATTEMPTS; attempt += 1) {
    try {
      const fix = await requestPosition({
        enableHighAccuracy: true,
        timeout: FIX_TIMEOUT_MS,
        maximumAge: 30_000,
      });
      if (!best || fix.accuracy < best.accuracy) {
        best = fix;
      }
      if (fix.accuracy <= MIN_ACCURACY_M) {
        return fix;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Location failed");
      if (best) return best;
    }
  }

  if (best) return best;
  throw lastError ?? new Error("Location failed");
}

interface NominatimAddress {
  road?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
  name?: string;
}

function formatAddress(address: NominatimAddress, fallback: string): string {
  const streetRoad = address.road;
  const locality =
    address.village ||
    address.suburb ||
    address.town ||
    address.city ||
    address.municipality;
  const region = address.county || address.state;

  const parts = [streetRoad, locality, region].filter(
    (p): p is string => !!p && p.length > 0
  );
  if (parts.length >= 2) {
    return parts.join(", ");
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return fallback;
}

export function formatCoordinates(point: GeoPoint): string {
  const lat = point.latitude.toFixed(6);
  const lon = point.longitude.toFixed(6);
  const acc = Math.round(point.accuracy);
  return `${lat}, ${lon} · ±${acc}m`;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = (await response.json()) as NominatimResponse;
      if (data.address) {
        const formatted = formatAddress(data.address, fallback);
        if (formatted !== fallback) {
          return formatted;
        }
      }
      if (data.display_name) {
        const short = data.display_name.split(",").slice(0, 3).join(",").trim();
        if (short) return short;
      }
    }
  } catch {
    // fall through to BigDataCloud
  }

  try {
    const url = new URL(
      "https://api.bigdatacloud.net/data/reverse-geocode-client"
    );
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("localityLanguage", "en");

    const response = await fetch(url.toString());
    if (response.ok) {
      const data = (await response.json()) as NominatimAddress & {
        locality?: string;
        principalSubdivision?: string;
        countryName?: string;
      };
      const formatted = formatAddress(data, fallback);
      if (formatted !== fallback) return formatted;
    }
  } catch {
    // fall through to coordinates
  }

  return fallback;
}

export interface GeolocatedPlace {
  point: GeoPoint;
  label: string;
}

interface PlaceCacheBox {
  place: GeolocatedPlace | null;
  inFlight: Promise<GeolocatedPlace> | null;
}

function placeCache(): PlaceCacheBox {
  const g = globalThis as typeof globalThis & {
    __agriflowPlaceCache?: PlaceCacheBox;
  };
  if (!g.__agriflowPlaceCache) {
    g.__agriflowPlaceCache = { place: null, inFlight: null };
  }
  return g.__agriflowPlaceCache;
}

export function peekPlaceCache(): GeolocatedPlace | null {
  return placeCache().place;
}

export function clearPlaceCache(): void {
  const cache = placeCache();
  cache.place = null;
  cache.inFlight = null;
}

export async function getPlace(options?: {
  force?: boolean;
}): Promise<GeolocatedPlace> {
  const force = options?.force === true;
  const cache = placeCache();

  if (!force && cache.place) {
    return cache.place;
  }
  if (!force && cache.inFlight) {
    return cache.inFlight;
  }

  const task = (async (): Promise<GeolocatedPlace> => {
    const point = await getPrecisePosition();
    const label = await reverseGeocode(point.latitude, point.longitude);
    const place: GeolocatedPlace = { point, label };
    placeCache().place = place;
    return place;
  })();

  cache.inFlight = task;
  try {
    return await task;
  } finally {
    const current = placeCache();
    if (current.inFlight === task) {
      current.inFlight = null;
    }
  }
}
