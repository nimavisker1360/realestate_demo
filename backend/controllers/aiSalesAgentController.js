import asyncHandler from "express-async-handler";
import {
  continueAiSalesConversation,
  createAiEmailHandoff,
  createAiWhatsAppHandoff,
  getAiSalesRecommendations,
  startAiSalesConversation,
  submitAiSalesLead,
} from "../services/aiSalesAgent/aiConversationService.js";
import { consumeAiRateLimit } from "../services/aiSalesAgent/aiRateLimitService.js";
import { extractLeadAttribution } from "../utils/leadAttribution.js";
import {
  assertAiPayloadIsClean,
  assertLeadSubmissionIsComplete,
  normalizeAiChatMessagePayload,
  normalizeAiChatStartPayload,
  normalizeAiLeadSubmitPayload,
} from "../validators/aiLeadValidators.js";

const buildClientKey = (req, suffix) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = forwarded || req.ip || "unknown";
  return `${suffix}:${ip}`;
};

const assertRateLimit = (req, suffix, limit, windowMs) => {
  const result = consumeAiRateLimit({
    key: buildClientKey(req, suffix),
    limit,
    windowMs,
  });
  if (!result.allowed) {
    const error = new Error("rate_limited");
    error.statusCode = 429;
    throw error;
  }
};

const handleControllerError = (res, error, fallbackMessage) => {
  const statusCode = Number(error?.statusCode) || 500;
  return res.status(statusCode).json({
    message: fallbackMessage,
    error: String(error?.message || fallbackMessage),
  });
};

export const startChat = asyncHandler(async (req, res) => {
  try {
    assertRateLimit(req, "ai-agent-start", 20, 60 * 1000);
    const payload = normalizeAiChatStartPayload(req.body || {});
    assertAiPayloadIsClean(payload);

    const result = await startAiSalesConversation(payload);
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error, "Failed to start AI sales conversation");
  }
});

export const sendMessage = asyncHandler(async (req, res) => {
  try {
    assertRateLimit(req, "ai-agent-message", 45, 60 * 1000);
    const payload = normalizeAiChatMessagePayload(req.body || {});
    assertAiPayloadIsClean(payload);

    if (!payload.message) {
      return res.status(400).json({
        message: "message is required",
      });
    }

    const attribution = extractLeadAttribution(req, {
      defaultLeadSource: "ai_agent",
    });

    const result = await continueAiSalesConversation({
      ...payload,
      attribution,
    });
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error, "Failed to process AI sales message");
  }
});

export const submitLead = asyncHandler(async (req, res) => {
  try {
    assertRateLimit(req, "ai-agent-submit", 10, 60 * 1000);
    const payload = normalizeAiLeadSubmitPayload(req.body || {});
    assertAiPayloadIsClean(payload);
    assertLeadSubmissionIsComplete(payload);

    const attribution = extractLeadAttribution(req, {
      defaultLeadSource: "ai_agent",
    });
    const result = await submitAiSalesLead({
      ...payload,
      attribution,
    });

    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error, "Failed to submit AI lead");
  }
});

export const getRecommendations = asyncHandler(async (req, res) => {
  try {
    const payload = normalizeAiLeadSubmitPayload(req.body || req.query || {});
    const result = await getAiSalesRecommendations(payload);
    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error, "Failed to fetch AI recommendations");
  }
});

export const handoffWhatsApp = asyncHandler(async (req, res) => {
  try {
    assertRateLimit(req, "ai-agent-whatsapp", 12, 60 * 1000);
    const payload = normalizeAiLeadSubmitPayload(req.body || {});
    assertAiPayloadIsClean(payload);

    const attribution = extractLeadAttribution(req, {
      defaultLeadSource: "ai_agent",
    });
    const result = await createAiWhatsAppHandoff({
      ...payload,
      attribution,
    });

    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error, "Failed to create WhatsApp handoff");
  }
});

export const handoffEmail = asyncHandler(async (req, res) => {
  try {
    assertRateLimit(req, "ai-agent-email", 8, 60 * 1000);
    const payload = normalizeAiLeadSubmitPayload(req.body || {});
    assertAiPayloadIsClean(payload);
    assertLeadSubmissionIsComplete(payload);

    const attribution = extractLeadAttribution(req, {
      defaultLeadSource: "ai_agent",
    });
    const result = await createAiEmailHandoff({
      ...payload,
      attribution,
    });

    res.status(200).json(result);
  } catch (error) {
    handleControllerError(res, error, "Failed to trigger email handoff");
  }
});
