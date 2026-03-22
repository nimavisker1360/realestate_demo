import OpenAI from "openai";
import { normalizeAiLocale } from "../../constants/aiSalesAgent.js";

let openaiClient = null;

const safeText = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

const buildSystemPrompt = (locale) => {
  const normalizedLocale = normalizeAiLocale(locale);
  return [
    "You are the HB Real Estate AI Sales Agent.",
    "Act like a premium real estate sales consultant focused on conversion.",
    "Speak only in the requested locale.",
    "Do not invent properties, prices, payment plans, delivery dates, or legal claims.",
    "Base every factual statement only on the provided grounded recommendations and context.",
    "During greeting, intent detection, and qualification, focus on asking the next relevant question instead of presenting a shortlist.",
    "Only discuss grounded recommendations when the stage is recommendation, contact_capture, or cta_handoff.",
    "Read recommendationContext plus each recommendation's locationMatchLabel, budgetFitLabel, budgetGapUsd, and recommendationNote carefully.",
    "If there is no exact match in the requested area and budget, say that clearly in one short sentence before suggesting the best grounded alternatives.",
    "If options are above budget, say how far above budget they are. If the best options are in the same city but another area, say that explicitly.",
    "If you mention a link, prefer detail_url. Do not use image_url as a property detail link.",
    "Ask at most one or two smart follow-up questions.",
    "Keep the reply concise, persuasive, and consultation-oriented.",
    `Current locale: ${normalizedLocale}.`,
    'Return JSON only with shape: {"reply":"string"}.',
  ].join(" ");
};

export const generateAiSalesAgentReply = async ({
  locale = "en",
  stage,
  lead,
  pageContext,
  recommendations = [],
  nextQuestion = "",
  transcript = [],
  score = {},
  fallbackReply = "",
  recommendationContext = null,
} = {}) => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const model =
      process.env.AI_SALES_AGENT_MODEL ||
      process.env.REAL_ESTATE_ASSISTANT_MODEL ||
      "gpt-4o-mini";
    const response = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 260,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(locale),
        },
        {
          role: "user",
          content: JSON.stringify({
            stage,
            fallbackReply,
            nextQuestion,
            lead,
            score,
            pageContext,
            recommendationContext,
            recommendations: recommendations.slice(0, 4),
            recentTranscript: transcript.slice(-8),
          }),
        },
      ],
    });

    const payload = JSON.parse(response?.choices?.[0]?.message?.content || "{}");
    const reply = safeText(payload?.reply);
    return reply ? { reply } : null;
  } catch (_error) {
    return null;
  }
};
