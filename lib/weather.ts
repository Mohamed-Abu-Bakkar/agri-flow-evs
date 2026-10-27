export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
}

interface OpenWeatherResponse {
  main?: {
    temp?: unknown;
    humidity?: unknown;
  };
  wind?: {
    speed?: unknown;
  };
  weather?: Array<{
    id?: unknown;
    description?: unknown;
  }>;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_OPENWEATHER_API_KEY");
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  const payload = (await response.json()) as OpenWeatherResponse;
  if (
    !payload.main ||
    !isFiniteNumber(payload.main.temp) ||
    !isFiniteNumber(payload.main.humidity)
  ) {
    throw new Error("Invalid weather response");
  }

  const description =
    typeof payload.weather?.[0]?.description === "string"
      ? (payload.weather[0].description as string)
      : "";
  const code =
    payload.weather && isFiniteNumber(payload.weather[0]?.id)
      ? (payload.weather[0].id as number)
      : 800;

  return {
    temperature: payload.main.temp,
    humidity: payload.main.humidity,
    windSpeed: isFiniteNumber(payload.wind?.speed)
      ? (payload.wind.speed as number)
      : 0,
    weatherCode: code,
    description,
  };
}

interface WeatherCacheBox {
  data: WeatherData | null;
  inFlight: Promise<WeatherData> | null;
}

function weatherCache(): WeatherCacheBox {
  const g = globalThis as typeof globalThis & {
    __agriflowWeatherCache?: WeatherCacheBox;
  };
  if (!g.__agriflowWeatherCache) {
    g.__agriflowWeatherCache = { data: null, inFlight: null };
  }
  return g.__agriflowWeatherCache;
}

export function peekWeatherCache(): WeatherData | null {
  return weatherCache().data;
}

export async function getWeatherCached(
  latitude: number,
  longitude: number,
  options?: { force?: boolean }
): Promise<WeatherData> {
  const force = options?.force === true;
  const cache = weatherCache();

  if (!force && cache.data) {
    return cache.data;
  }
  if (!force && cache.inFlight) {
    return cache.inFlight;
  }

  const task = fetchWeather(latitude, longitude).then((data) => {
    weatherCache().data = data;
    return data;
  });
  cache.inFlight = task;
  try {
    return await task;
  } finally {
    const current = weatherCache();
    if (current.inFlight === task) {
      current.inFlight = null;
    }
  }
}
