const SUPPORTED_LOCALES = ["en", "tr", "ru"];
const DEFAULT_LOCALE = "en";

export const AI_AGENT_SUPPORTED_LOCALES = SUPPORTED_LOCALES;
export const AI_AGENT_DEFAULT_LOCALE = DEFAULT_LOCALE;
export const AI_AGENT_STAGE_ORDER = [
  "greeting",
  "intent_detection",
  "qualification",
  "recommendation",
  "contact_capture",
  "cta_handoff",
];

export const AI_AGENT_PROPERTY_TYPES = [
  "apartment",
  "villa",
  "office",
  "commercial",
  "townhouse",
  "penthouse",
  "land",
];

export const AI_AGENT_PURPOSES = [
  "investment",
  "living",
  "citizenship",
  "rental_income",
];

export const AI_AGENT_PAYMENT_PLANS = ["cash", "installment"];
export const AI_AGENT_TIMELINES = [
  "just_researching",
  "immediate",
  "within_1_month",
  "within_3_months",
  "within_6_plus_months",
];
export const AI_AGENT_CONTACT_METHODS = ["whatsapp", "phone", "email"];
export const AI_AGENT_CONSULTATION_MODES = ["visit", "online"];

export const AI_AGENT_DELIVERY_STATUSES = [
  "ready",
  "under_construction",
  "no_preference",
];

export const AI_AGENT_DOWN_PAYMENTS = ["20%", "30%", "50%+", "need_guidance"];

export const AI_AGENT_BUYER_PROFILES = [
  "single",
  "couple",
  "family",
  "large_family",
];

export const AI_AGENT_AMENITIES = [
  "near_metro",
  "parking",
  "security",
  "family_concept",
  "pool_gym",
  "sea_view",
  "title_deed_ready",
];

export const AI_AGENT_PREFERRED_AREAS = [
  "european_side",
  "asian_side",
  "cyprus",
  "greece",
  "dubai",
  "georgia",
  "central_istanbul",
  "near_metro",
  "no_preference",
];

export const AI_AGENT_LEAD_INTENTS = [
  "price_list",
  "payment_plan",
  "consultation",
  "send_details",
];

export const AI_AGENT_CITIZENSHIP_OPTIONS = ["yes", "no", "maybe"];

export const AI_AGENT_PREFERRED_LANGUAGES = ["en", "tr", "ru", "ar"];

export const normalizeAiLocale = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.startsWith("tr")) return "tr";
  if (normalized.startsWith("ru")) return "ru";
  return DEFAULT_LOCALE;
};

export const readPositiveEnvNumber = (name, fallback) => {
  const parsed = Number(process.env[name]);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

export const AI_AGENT_SCORING_THRESHOLDS = {
  warm: readPositiveEnvNumber("AI_SALES_AGENT_WARM_SCORE", 40),
  hot: readPositiveEnvNumber("AI_SALES_AGENT_HOT_SCORE", 70),
  highBudgetUsd: readPositiveEnvNumber("AI_SALES_AGENT_HIGH_BUDGET_USD", 250000),
  citizenshipMinUsd: readPositiveEnvNumber(
    "AI_SALES_AGENT_CITIZENSHIP_MIN_USD",
    400000
  ),
};
