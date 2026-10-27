import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "qwen/qwen3.8-27b";

interface GroqChoice {
  message?: { content?: unknown };
}

interface GroqResponse {
  choices?: GroqChoice[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseRecommendation(content: string): {
  fertilizerAdvice: string;
  irrigationSchedule: string;
  runoffWarning: string;
} {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as {
    fertilizerAdvice?: unknown;
    irrigationSchedule?: unknown;
    runoffWarning?: unknown;
  };
  if (
    !isNonEmptyString(parsed.fertilizerAdvice) ||
    !isNonEmptyString(parsed.irrigationSchedule) ||
    !isNonEmptyString(parsed.runoffWarning)
  ) {
    throw new Error("Recommendation response missing required fields");
  }
  return {
    fertilizerAdvice: parsed.fertilizerAdvice,
    irrigationSchedule: parsed.irrigationSchedule,
    runoffWarning: parsed.runoffWarning,
  };
}

export const generate = action({
  args: {
    soilType: v.string(),
    cropType: v.string(),
    plantingDate: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (_ctx, { soilType, cropType, plantingDate, location }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GROQ_API_KEY");
    }

    const locationLine = location
      ? `Location: ${location}`
      : "Location: not specified";
    const userPrompt = [
      `Soil type: ${soilType}`,
      `Crop type: ${cropType}`,
      `Planting date: ${plantingDate}`,
      locationLine,
      "Provide practical fertilizer timing, a weekly irrigation schedule, and a runoff risk note for this context.",
    ].join("\n");

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are an agricultural advisor. Respond with JSON only, no markdown fences, no extra text. Use this shape: {"fertilizerAdvice": string, "irrigationSchedule": string, "runoffWarning": string}. fertilizerAdvice and irrigationSchedule should use newlines between discrete points. runoffWarning should be a short sentence, or the word none when risk is low.',
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq request failed: ${response.status}`);
    }

    const payload = (await response.json()) as GroqResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!isNonEmptyString(content)) {
      throw new Error("Empty Groq response");
    }

    return parseRecommendation(content);
  },
});

export const save = mutation({
  args: {
    userId: v.id("users"),
    soilType: v.string(),
    cropType: v.string(),
    plantingDate: v.string(),
    location: v.optional(v.string()),
    fertilizerAdvice: v.string(),
    irrigationSchedule: v.string(),
    runoffWarning: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("schedules", args);
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("schedules")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
