"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, ShieldCheck, X } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

type PermissionState = "unknown" | "prompt" | "granted" | "denied";

async function readPermission(): Promise<PermissionState> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const status = await Geolocation.checkPermissions();
      if (status.location === "granted") return "granted";
      if (status.location === "denied") return "denied";
      return "prompt";
    }
  } catch {
    // fall through to browser permissions
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "denied";
  }
  if (typeof navigator.permissions === "undefined") {
    return "prompt";
  }
  return navigator.permissions
    .query({ name: "geolocation" as PermissionName })
    .then((status) => {
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      return "prompt";
    })
    .catch(() => "prompt");
}

async function requestNativePermission(): Promise<PermissionState> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const status = await Geolocation.requestPermissions();
      if (status.location === "granted") return "granted";
      if (status.location === "denied") return "denied";
      return "prompt";
    }
  } catch {
    return "denied";
  }
  return "denied";
}

export function LocationPermissionModal() {
  const { impact } = useHaptic();
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const evaluate = useCallback(async () => {
    const state = await readPermission();
    setChecking(false);
    if (state === "granted") {
      setVisible(false);
      setDenied(false);
      return;
    }
    setDenied(state === "denied");
    setVisible(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await evaluate();
    })();
    return () => {
      cancelled = true;
    };
  }, [evaluate]);

  const requestLocation = useCallback(async () => {
    setRequesting(true);
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const state = await requestNativePermission();
        if (state === "granted") {
          const { Geolocation } = await import("@capacitor/geolocation");
          try {
            await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 10000,
            });
          } catch {
            // permission granted even if this fix fails
          }
          impact("medium");
          setRequesting(false);
          setVisible(false);
          return;
        }
        setRequesting(false);
        setDenied(state === "denied");
        setVisible(true);
        return;
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setRequesting(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => {
          impact("medium");
          setRequesting(false);
          setVisible(false);
          void evaluate();
        },
        () => {
          setRequesting(false);
          void evaluate();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } catch {
      setRequesting(false);
      void evaluate();
    }
  }, [evaluate, impact]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible || checking) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loc-perm-title"
    >
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-600 active:scale-95"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
          <MapPin className="h-7 w-7 text-emerald-700" aria-hidden />
        </div>

        <h2
          id="loc-perm-title"
          className="mt-4 text-center text-lg font-bold text-zinc-900"
        >
          {denied ? "Location is blocked" : "Allow location access?"}
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-zinc-600">
          {denied
            ? "Location is turned off for AgriFlow. Allow it so we can show field weather and runoff advice for your position."
            : "AgriFlow uses your precise location to fetch field weather, reverse-geocode your farm area, and improve runoff risk advice. We only use it while you use the app."}
        </p>

        <div className="mt-4 space-y-2 rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-900">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            GPS stays on-device except for weather / map lookups.
          </p>
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => void requestLocation()}
            disabled={requesting}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {requesting ? "Waiting for permission…" : "Allow location"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition active:scale-[0.98]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
