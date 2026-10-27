import { v } from "convex/values";
import { httpAction, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const add = mutation({
  args: {
    seedId: v.id("seeds"),
    userId: v.id("users"),
    soilTemperatureC: v.number(),
    soilMoisture: v.optional(v.number()),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sensorReadings", args);
  },
});

export const listForSeed = query({
  args: { seedId: v.id("seeds") },
  handler: async (ctx, { seedId }) => {
    return await ctx.db
      .query("sensorReadings")
      .withIndex("by_seed_and_time", (q) => q.eq("seedId", seedId))
      .order("desc")
      .collect();
  },
});

export const latestForSeed = query({
  args: { seedId: v.id("seeds") },
  handler: async (ctx, { seedId }) => {
    const readings = await ctx.db
      .query("sensorReadings")
      .withIndex("by_seed_and_time", (q) => q.eq("seedId", seedId))
      .order("desc")
      .take(1);
    return readings[0] ?? null;
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("sensorReadings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const ingestHttp = httpAction(async (ctx, req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { seedId, userId, soilTemperatureC, soilMoisture, timestamp } = body as {
    seedId?: string;
    userId?: string;
    soilTemperatureC?: unknown;
    soilMoisture?: unknown;
    timestamp?: string;
  };

  if (
    typeof seedId !== "string" ||
    typeof userId !== "string" ||
    typeof soilTemperatureC !== "number"
  ) {
    return new Response(
      JSON.stringify({ error: "seedId, userId, soilTemperatureC required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    await ctx.runMutation(api.sensorReadings.add, {
      seedId: seedId as Id<"seeds">,
      userId: userId as Id<"users">,
      soilTemperatureC,
      soilMoisture:
        typeof soilMoisture === "number" ? soilMoisture : undefined,
      timestamp: timestamp || new Date().toISOString(),
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Insert failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
