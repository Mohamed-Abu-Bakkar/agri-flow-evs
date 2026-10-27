import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULT_EMAIL = "local@agriflow.evs";
const DEFAULT_NAME = "Local Farmer";

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", DEFAULT_EMAIL))
      .unique();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("users", {
      email: DEFAULT_EMAIL,
      name: DEFAULT_NAME,
    });
  },
});

export const getLocal = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", DEFAULT_EMAIL))
      .unique();
  },
});
