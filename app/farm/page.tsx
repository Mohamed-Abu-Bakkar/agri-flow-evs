"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { SeedCard, type SeedEntry } from "@/components/shared/SeedCard";
import { WeatherPanel } from "@/components/shared/WeatherPanel";
import { useHaptic } from "@/hooks/useHaptic";
import { useGeolocation } from "@/hooks/useGeolocation";

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

export default function FarmPage() {
  const { impact } = useHaptic();
  const geo = useGeolocation();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [farmName, setFarmName] = useState("");
  const [soilType, setSoilType] = useState("");
  const [location, setLocation] = useState("");
  const [datePlanted, setDatePlanted] = useState(() => new Date().toISOString().split("T")[0]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [locationFilled, setLocationFilled] = useState(false);

  const ensureUser = useMutation(api.users.ensure);
  const addSeedMutation = useMutation(api.seeds.add);
  const updateLocationMutation = useMutation(api.seeds.updateLocation);
  const seedDocs = useQuery(
    api.seeds.listByUser,
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
        if (!cancelled) setSaveError("Backend unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [ensureUser]);

  const fillCurrentLocation = async () => {
    const place = await geo.refresh();
    if (place) {
      setLocation(place.label);
      setLocationFilled(true);
    }
  };

  useEffect(() => {
    if (locationFilled || !geo.label || location.trim()) return;
    setLocation(geo.label);
    setLocationFilled(true);
  }, [geo.label, locationFilled, location]);

  const addSeed = async () => {
    if (!userId) {
      setSaveError("Syncing with backend…");
      return;
    }
    if (!name.trim() || !variety.trim() || !farmName.trim() || !soilType.trim()) {
      setSaveError("Fill all seed fields");
      return;
    }
    setSaveError(null);
    try {
      await addSeedMutation({
        userId,
        name: name.trim(),
        variety: variety.trim(),
        datePlanted,
        farmName: farmName.trim(),
        soilType: soilType.trim(),
        location: location.trim() || undefined,
      });
      impact("medium");
      setName("");
      setVariety("");
      setFarmName("");
      setSoilType("");
      setLocation("");
      setLocationFilled(false);
    } catch {
      setSaveError("Failed to save seed");
    }
  };

  const backfillLocation = async (seedId: Id<"seeds">) => {
    const place = await geo.refresh();
    if (!place) return;
    try {
      await updateLocationMutation({ seedId, location: place.label });
      impact("light");
    } catch {
      setSaveError("Failed to update seed location");
    }
  };

  const seedDocsResolved = seedDocs;
  const missingLocation = (seedDocsResolved ?? []).filter((d) => !d.location);

  const latestBySeed = new Map<string, { timestamp: string; soilTemperatureC: number }>();
  (readings ?? []).forEach((r) => {
    const cur = latestBySeed.get(r.seedId);
    if (!cur || r.timestamp > cur.timestamp) {
      latestBySeed.set(r.seedId, { timestamp: r.timestamp, soilTemperatureC: r.soilTemperatureC });
    }
  });

  return (
    <main className="flex min-h-screen flex-col bg-white pb-8">
      <PageHeader
        eyebrow="Field log"
        title="Farm Guardian"
        subtitle="Precise GPS · seeds · weather"
      />

      <div className="flex flex-col gap-4 px-5 pt-4">
        <WeatherPanel />

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Log a seed
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            <Input placeholder="Seed name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Variety" value={variety} onChange={(e) => setVariety(e.target.value)} />
            <Input placeholder="Farm name" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
            <Input placeholder="Soil type" value={soilType} onChange={(e) => setSoilType(e.target.value)} />
            <div className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="Location (auto GPS)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={fillCurrentLocation}
                disabled={geo.loading}
                aria-label="Fill current location"
                className="shrink-0 px-3"
              >
                {geo.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <MapPin className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </div>
            <Input
              type="date"
              value={datePlanted}
              onChange={(e) => setDatePlanted(e.target.value)}
            />
            <Button onClick={addSeed} disabled={!userId} className="w-full">
              Save seed
            </Button>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Seeds
            </h2>
            {missingLocation.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const place = await geo.refresh();
                    if (!place) return;
                    for (const doc of missingLocation) {
                      try {
                        await updateLocationMutation({
                          seedId: doc._id,
                          location: place.label,
                        });
                      } catch {
                        setSaveError("Failed to update a seed location");
                      }
                    }
                    impact("medium");
                  })();
                }}
                disabled={geo.loading}
                className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
              >
                {geo.loading
                  ? "Fetching GPS…"
                  : `Set GPS on ${missingLocation.length} seed${missingLocation.length === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
          {seedDocs === undefined && (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
              Loading seeds…
            </p>
          )}
          {seedDocs !== undefined && (seedDocs ?? []).length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-500">
              No seeds logged yet.
            </p>
          )}
          {(seedDocs ?? []).map((doc) => {
            const entry = toSeedEntry(doc);
            const reading = latestBySeed.get(entry.id);
            return (
              <div key={entry.id} className="space-y-1">
                <SeedCard
                  entry={{
                    ...entry,
                    soilTemperatureC: reading?.soilTemperatureC,
                  }}
                />
                {!doc.location && (
                  <button
                    type="button"
                    onClick={() => void backfillLocation(doc._id)}
                    disabled={geo.loading}
                    className="ml-1 text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
                  >
                    {geo.loading
                      ? "Fetching GPS…"
                      : "＋ Add current GPS location"}
                  </button>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
