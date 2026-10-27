import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("seeds")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { seedId: v.id("seeds") },
  handler: async (ctx, { seedId }) => {
    return await ctx.db.get(seedId);
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    variety: v.string(),
    datePlanted: v.string(),
    farmName: v.string(),
    soilType: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const location = args.location?.trim() || undefined;
    const trimmed = {
      userId: args.userId,
      name: args.name.trim(),
      variety: args.variety.trim(),
      datePlanted: args.datePlanted,
      farmName: args.farmName.trim(),
      soilType: args.soilType.trim(),
      location,
    };
    if (
      !trimmed.name ||
      !trimmed.variety ||
      !trimmed.farmName ||
      !trimmed.soilType
    ) {
      throw new Error("Seed fields must be non-empty");
    }
    return await ctx.db.insert("seeds", trimmed);
  },
});

export const updateLocation = mutation({
  args: {
    seedId: v.id("seeds"),
    location: v.string(),
  },
  handler: async (ctx, { seedId, location }) => {
    const trimmed = location.trim();
    if (!trimmed) {
      throw new Error("Location must be non-empty");
    }
    await ctx.db.patch(seedId, { location: trimmed });
  },
});

export const remove = mutation({
  args: { seedId: v.id("seeds") },
  handler: async (ctx, { seedId }) => {
    await ctx.db.delete(seedId);
  },
});
