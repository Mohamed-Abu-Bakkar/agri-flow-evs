export interface Recommendation {
  fertilizerAdvice: string;
  irrigationSchedule: string;
  runoffWarning: string;
}

export interface GroqRecommendationInput {
  soilType: string;
  cropType: string;
  plantingDate: string;
  location?: string;
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqChoice {
  message?: {
    content?: unknown;
  };
}

interface GroqResponse {
  choices?: GroqChoice[];
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "qwen/qwen3.8-27b";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseRecommendation(content: string): Recommendation {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Partial<Recommendation>;
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

export async function getGroqRecommendation({
  soilType,
  cropType,
  plantingDate,
  location,
}: GroqRecommendationInput): Promise<Recommendation> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const locationLine = location ? `Location: ${location}` : "Location: not specified";
  const userPrompt = [
    `Soil type: ${soilType}`,
    `Crop type: ${cropType}`,
    `Planting date: ${plantingDate}`,
    locationLine,
    "Provide practical fertilizer timing, a weekly irrigation schedule, and a runoff risk note for this context.",
  ].join("\n");

  const messages: GroqMessage[] = [
    {
      role: "system",
      content:
        "You are an agricultural advisor. Respond with JSON only, no markdown fences, no extra text. Use this shape: {\"fertilizerAdvice\": string, \"irrigationSchedule\": string, \"runoffWarning\": string}. fertilizerAdvice and irrigationSchedule should use newlines between discrete points. runoffWarning should be a short sentence, or the word none when risk is low.",
    },
    { role: "user", content: userPrompt },
  ];

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
      messages,
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
}

export interface FarmChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function askFarmAI(
  turns: FarmChatTurn[],
  farmContext?: string
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const contextLine = farmContext
    ? `\nFarmer context: ${farmContext}`
    : "";
  const messages: GroqMessage[] = [
    {
      role: "system",
      content:
        "You are Farm AI, a friendly agricultural assistant inside AgriFlow. Help with seeds, fertilizer timing, irrigation, soil, weather, and agricultural runoff prevention. Be practical and concise. Use short paragraphs or bullet points. Do not invent farm data you were not given." +
        contextLine,
    },
    ...turns.slice(-12),
  ];

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 1024,
      messages,
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
  return content.trim();
}
