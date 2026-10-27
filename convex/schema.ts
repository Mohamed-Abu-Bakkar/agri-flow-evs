import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
  }).index("by_email", ["email"]),

  farms: defineTable({
    userId: v.id("users"),
    name: v.string(),
    soilType: v.string(),
  }).index("by_user", ["userId"]),

  seeds: defineTable({
    userId: v.id("users"),
    name: v.string(),
    variety: v.string(),
    datePlanted: v.string(),
    farmName: v.string(),
    soilType: v.string(),
    location: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  schedules: defineTable({
    userId: v.id("users"),
    soilType: v.string(),
    cropType: v.string(),
    plantingDate: v.string(),
    location: v.optional(v.string()),
    fertilizerAdvice: v.string(),
    irrigationSchedule: v.string(),
    runoffWarning: v.string(),
  }).index("by_user", ["userId"]),

  sensorReadings: defineTable({
    seedId: v.id("seeds"),
    userId: v.id("users"),
    soilTemperatureC: v.number(),
    soilMoisture: v.optional(v.number()),
    timestamp: v.string(),
  })
    .index("by_seed", ["seedId"])
    .index("by_user", ["userId"])
    .index("by_seed_and_time", ["seedId", "timestamp"]),
});
