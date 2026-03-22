import { normalizeLeadPayload } from "../services/aiSalesAgent/aiExtractionService.js";
import { normalizeAiLocale } from "../constants/aiSalesAgent.js";

const safeText = (value, maxLength = 2000) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const sanitizeTranscript = (transcript = []) =>
  (Array.isArray(transcript) ? transcript : [])
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-24)
    .map((item) => ({
      role: item.role,
      content: safeText(item.content, 1600),
      timestamp: safeText(item.timestamp, 64),
    }));

const sanitizePageContext = (pageContext = {}) => {
  const currentProject =
    pageContext?.currentProject &&
    typeof pageContext.currentProject === "object" &&
    !Array.isArray(pageContext.currentProject)
      ? {
          id: safeText(pageContext.currentProject.id, 80),
          title: safeText(pageContext.currentProject.title || pageContext.currentProject.name, 160),
          city: safeText(pageContext.currentProject.city, 80),
          district: safeText(pageContext.currentProject.district, 80),
          propertyType: safeText(pageContext.currentProject.propertyType, 80),
        }
      : null;

  return {
    locale: normalizeAiLocale(pageContext.locale),
    pathname: safeText(pageContext.pathname, 240),
    search: safeText(pageContext.search, 400),
    url: safeText(pageContext.url, 400),
    title: safeText(pageContext.title, 180),
    pageType: safeText(pageContext.pageType, 60),
    currentProjectId: safeText(pageContext.currentProjectId, 80),
    currentProjectName: safeText(pageContext.currentProjectName, 160),
    currentProject,
  };
};

const sanitizeSharedPayload = (body = {}) => ({
  sessionId: safeText(body.sessionId, 120),
  locale: normalizeAiLocale(body.locale || body.pageContext?.locale),
  pageContext: sanitizePageContext(body.pageContext || {}),
  transcript: sanitizeTranscript(body.transcript),
  lead: normalizeLeadPayload(body.lead || {}),
  website: safeText(body.website, 120),
});

export const normalizeAiChatStartPayload = (body = {}) => sanitizeSharedPayload(body);

export const normalizeAiChatMessagePayload = (body = {}) => ({
  ...sanitizeSharedPayload(body),
  message: safeText(body.message, 1600),
});

export const normalizeAiLeadSubmitPayload = (body = {}) => sanitizeSharedPayload(body);

export const assertAiPayloadIsClean = (payload = {}) => {
  if (payload.website) {
    const error = new Error("spam_detected");
    error.statusCode = 400;
    throw error;
  }
};

export const assertLeadSubmissionIsComplete = (payload = {}) => {
  const fullName = safeText(payload?.lead?.fullName || payload?.lead?.name, 160);
  const phone = safeText(payload?.lead?.phone, 40);
  const email = safeText(payload?.lead?.email, 160);

  if (!fullName) {
    const error = new Error("full_name_required");
    error.statusCode = 400;
    throw error;
  }

  if (!phone && !email) {
    const error = new Error("phone_or_email_required");
    error.statusCode = 400;
    throw error;
  }
};
