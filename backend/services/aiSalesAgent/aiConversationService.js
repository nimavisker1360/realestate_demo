import { randomUUID } from "node:crypto";
import {
  AI_AGENT_STAGE_ORDER,
  normalizeAiLocale,
} from "../../constants/aiSalesAgent.js";
import { buildQuickReplies, getLocalizedAgentCopy } from "./copy.js";
import {
  extractLeadSignalUpdate,
  getMissingLeadFields,
  mergeLeadData,
  normalizeLeadPayload,
} from "./aiExtractionService.js";
import { scoreLead } from "./leadScoringService.js";
import { getDeterministicRecommendations } from "./projectRecommendationService.js";
import {
  getRelevantBlogResources,
  resolveRelevantBlogTopics,
} from "./blogResourceService.js";
import {
  formatLeadForCRM,
  formatLeadForWhatsApp,
  persistAiLeadConversation,
  sendLeadPackageByEmail,
} from "./leadRoutingService.js";
import { generateAiSalesAgentReply } from "./aiProviderService.js";
import {
  hasWhatsAppCloudApiConfig,
  sendLeadPackageToWhatsApp,
} from "./whatsappCloudService.js";

const MAX_TRANSCRIPT_ITEMS = 24;
const DEFAULT_AGENT_WHATSAPP_NUMBER = "905303871050";
const MIN_RECOMMENDATION_SIGNALS = 2;
const MAX_QUALIFICATION_GAPS_BEFORE_RECOMMENDATION = 8;
const PRICE_FORMAT_LOCALE_BY_AI_LOCALE = {
  en: "en-US",
  tr: "tr-TR",
  ru: "ru-RU",
  ar: "ar-EG",
};

const safeText = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const formatUsdPrice = (value, locale = "en") => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";

  const normalizedLocale = normalizeAiLocale(locale);
  const numberLocale = PRICE_FORMAT_LOCALE_BY_AI_LOCALE[normalizedLocale] || "en-US";
  const formatted = new Intl.NumberFormat(numberLocale, {
    maximumFractionDigits: 0,
  }).format(numeric);

  return normalizedLocale === "en" ? `$${formatted}` : `${formatted} $`;
};

const normalizeTranscript = (transcript = []) =>
  (Array.isArray(transcript) ? transcript : [])
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-MAX_TRANSCRIPT_ITEMS)
    .map((item) => ({
      role: item.role,
      content: safeText(item.content).slice(0, 1600),
      timestamp: safeText(item.timestamp) || new Date().toISOString(),
    }));

const inferPageType = (pageContext = {}) => {
  const explicitType = safeText(pageContext.pageType);
  if (explicitType) return explicitType;

  const pathname = safeText(pageContext.pathname);
  if (pathname === "/") return "home";
  if (pathname === "/listing") return "listing";
  if (pathname.startsWith("/listing/")) return "property_detail";
  if (pathname.startsWith("/projects/")) return "project_detail";
  if (pathname === "/contact") return "contact";
  if (pathname.includes("citizenship")) return "citizenship";
  if (pathname.includes("investment")) return "investment";
  return "default";
};

const normalizePageContext = (pageContext = {}, locale = "en") => {
  const currentProject = pageContext?.currentProject &&
    typeof pageContext.currentProject === "object" &&
    !Array.isArray(pageContext.currentProject)
    ? pageContext.currentProject
    : null;

  return {
    locale: normalizeAiLocale(pageContext.locale || locale),
    pathname: safeText(pageContext.pathname, "/"),
    search: safeText(pageContext.search),
    url: safeText(pageContext.url || pageContext.pathname, "/"),
    title: safeText(pageContext.title),
    pageType: inferPageType(pageContext),
    currentProjectId: safeText(pageContext.currentProjectId || currentProject?.id),
    currentProjectName: safeText(
      pageContext.currentProjectName || currentProject?.title || currentProject?.name
    ),
    currentProject: currentProject
      ? {
          id: safeText(currentProject.id),
          title: safeText(currentProject.title || currentProject.name),
          city: safeText(currentProject.city),
          district: safeText(currentProject.district),
          propertyType: safeText(currentProject.propertyType),
        }
      : null,
  };
};

const buildLeadDefaultsFromContext = (pageContext = {}, locale = "en") => {
  const defaults = {
    preferredLanguage: normalizeAiLocale(locale),
    sourcePage: safeText(pageContext.url || pageContext.pathname),
  };

  if (pageContext.currentProjectName) {
    defaults.projectInterest = pageContext.currentProjectName;
  }
  if (
    pageContext.currentProject?.city ||
    pageContext.currentProject?.district
  ) {
    defaults.locationInterest = [pageContext.currentProject.city, pageContext.currentProject.district]
      .filter(Boolean)
      .join(", ");
    defaults.cityInterest = safeText(pageContext.currentProject.city) || "";
    defaults.districtInterest = safeText(pageContext.currentProject.district) || "";
  }
  if (pageContext.pageType === "citizenship") {
    defaults.citizenshipInterest = true;
    defaults.purpose = defaults.purpose || "citizenship";
  }
  if (pageContext.pageType === "investment" && !defaults.purpose) {
    defaults.purpose = "investment";
  }
  return defaults;
};

const hasContact = (lead = {}) => Boolean(safeText(lead.email));
const hasNamedContact = (lead = {}) => Boolean(safeText(lead.fullName) && hasContact(lead));

const getQualificationMissingFields = (lead = {}, pageContext = {}) =>
  getMissingLeadFields(lead, pageContext).filter(
    (field) => field !== "name" && field !== "contact"
  );

const hasBudgetSignal = (lead = {}) =>
  Number(lead.budgetMin) > 0 || Number(lead.budgetMax) > 0;

const hasLocationSignal = (lead = {}, pageContext = {}) =>
  Boolean(
    safeText(lead.preferredArea) ||
      safeText(lead.locationInterest) ||
      safeText(lead.cityInterest) ||
      safeText(lead.districtInterest) ||
      safeText(lead.projectInterest) ||
      safeText(pageContext.currentProjectName) ||
      safeText(pageContext.currentProject?.city) ||
      safeText(pageContext.currentProject?.district)
  );

const getRecommendationSignalCount = (lead = {}, pageContext = {}) => {
  const signalChecks = [
    Boolean(safeText(lead.purpose)),
    hasBudgetSignal(lead),
    hasLocationSignal(lead, pageContext) || Boolean(safeText(lead.preferredArea)),
    Boolean(safeText(lead.propertyTypeInterest)),
    Boolean(safeText(lead.paymentPlan)),
    Boolean(safeText(lead.timeline)),
    Boolean(safeText(lead.deliveryStatus)),
    Boolean(safeText(lead.citizenshipNeed)),
  ];

  if (safeText(lead.propertyTypeInterest).toLowerCase() !== "land") {
    signalChecks.push(Boolean(safeText(lead.roomType)));
  }
  if (safeText(lead.purpose).toLowerCase() === "living") {
    signalChecks.push(Boolean(safeText(lead.buyerProfile)));
  }

  return signalChecks.filter(Boolean).length;
};

const canUnlockRecommendations = ({
  lead = {},
  pageContext = {},
  qualificationMissingFields = [],
} = {}) => {
  if (
    qualificationMissingFields.length > MAX_QUALIFICATION_GAPS_BEFORE_RECOMMENDATION
  ) {
    return false;
  }

  const hasCoreSignals =
    Boolean(safeText(lead.purpose)) &&
    hasBudgetSignal(lead) &&
    hasLocationSignal(lead, pageContext) &&
    Boolean(safeText(lead.propertyTypeInterest));
  const hasSearchReadySignals =
    hasBudgetSignal(lead) &&
    (hasLocationSignal(lead, pageContext) || Boolean(safeText(lead.preferredArea))) &&
    (
      Boolean(safeText(lead.propertyTypeInterest)) ||
      Boolean(safeText(lead.roomType)) ||
      Boolean(safeText(lead.projectInterest)) ||
      Boolean(safeText(lead.preferredArea))
    );
  const requiresRoomType =
    safeText(lead.propertyTypeInterest).toLowerCase() !== "land";
  const hasRequiredRoomSignal =
    !requiresRoomType || Boolean(safeText(lead.roomType));

  if (
    hasSearchReadySignals &&
    getRecommendationSignalCount(lead, pageContext) >= MIN_RECOMMENDATION_SIGNALS
  ) {
    return true;
  }

  return (
    hasCoreSignals &&
    hasRequiredRoomSignal &&
    getRecommendationSignalCount(lead, pageContext) >= MIN_RECOMMENDATION_SIGNALS
  );
};

const isAffirmativeReply = (value = "") =>
  /\b(yes|yeah|yep|sure|ok|okay|send|please do|evet|olur|tamam|gonder|gönder|da|konechno|otprav)\b/iu.test(
    safeText(value)
  );

const isNegativeReply = (value = "") =>
  /\b(no|not now|no thanks|dont|don't|hayir|hayır|istemiyorum|gerek yok|net|ne nado)\b/iu.test(
    safeText(value)
  );

const buildResourceOfferText = (locale = "en", topicId = "") => {
  const localized = getLocalizedAgentCopy(locale);
  return (
    localized.resourceOfferByTopic?.[topicId] ||
    localized.resourceOfferByTopic?.default ||
    localized.questions?.resource_offer ||
    ""
  );
};

const resolveResourcePlan = ({
  locale = "en",
  stage = "qualification",
  previousLead = {},
  lead = {},
  pageContext = {},
  latestUserMessage = "",
} = {}) => {
  const explicitTopics = resolveRelevantBlogTopics({
    latestUserMessage,
    pageContext,
    lead,
    explicitOnly: true,
  });
  const relatedTopics = resolveRelevantBlogTopics({
    latestUserMessage: "",
    pageContext,
    lead,
    explicitOnly: false,
  });
  let resourceConsent =
    lead.resourceConsent === true
      ? true
      : lead.resourceConsent === false
      ? false
      : null;

  if (explicitTopics.length > 0) {
    resourceConsent = true;
  } else if (previousLead?.resourceOfferShown && resourceConsent === null) {
    if (isAffirmativeReply(latestUserMessage)) {
      resourceConsent = true;
    } else if (isNegativeReply(latestUserMessage)) {
      resourceConsent = false;
    }
  }

  const primaryTopic = explicitTopics[0] || relatedTopics[0] || null;
  const shouldOfferResources =
    ["contact_capture", "cta_handoff"].includes(stage) &&
    resourceConsent === null &&
    Boolean(primaryTopic?.id) &&
    previousLead?.resourceOfferShown !== true;

  return {
    explicitOnly: explicitTopics.length > 0,
    shouldShowResources: explicitTopics.length > 0 || resourceConsent === true,
    shouldOfferResources,
    offerText: shouldOfferResources
      ? buildResourceOfferText(locale, primaryTopic?.id)
      : "",
    offerQuickReplies: shouldOfferResources
      ? buildQuickReplies("resource_offer", locale)
      : [],
    leadPatch: {
      resourceTopic: safeText(primaryTopic?.id || lead.resourceTopic),
      resourceConsent,
      resourceOfferShown:
        previousLead?.resourceOfferShown === true || shouldOfferResources,
    },
  };
};

const getVisibleRecommendations = ({
  stage = "qualification",
  recommendations = [],
} = {}) => {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return [];
  }

  return ["recommendation", "contact_capture", "cta_handoff"].includes(stage)
    ? recommendations
    : [];
};

const isRecognizedStage = (value) => AI_AGENT_STAGE_ORDER.includes(value);

const determineStage = ({
  previousStage = "",
  lead = {},
  recommendations = [],
  score = {},
  pageContext = {},
  highIntent = false,
} = {}) => {
  const qualificationMissingFields = getQualificationMissingFields(lead, pageContext);

  if (!previousStage) return "greeting";
  if (!lead.purpose) return "intent_detection";
  if (qualificationMissingFields.length > 0) {
    return "qualification";
  }
  if (recommendations.length === 0) {
    return "recommendation";
  }
  if (!hasNamedContact(lead)) return "contact_capture";
  if (score?.leadTemperature !== "cold" || highIntent) return "cta_handoff";
  return "cta_handoff";
};

const buildQuestionConfig = ({
  locale = "en",
  stage = "qualification",
  lead = {},
  pageContext = {},
  resourcePlan = null,
  pendingFallbackQuestion = false,
  pendingLeadIntent = false,
} = {}) => {
  const localized = getLocalizedAgentCopy(locale);
  const missingFields = getMissingLeadFields(lead, pageContext);
  let questionKey = "";

  if (stage === "greeting") {
    return {
      questionKey: "",
      nextQuestion: "",
      quickReplies: buildQuickReplies("start", locale),
    };
  }

  if (pendingFallbackQuestion) {
    questionKey = "fallback_preference";
  } else if (pendingLeadIntent && !safeText(lead.leadIntent)) {
    questionKey = "lead_intent";
  } else if (stage === "contact_capture") {
    if (!safeText(lead.fullName) || !hasContact(lead)) {
      questionKey = "contact_details";
    }
  } else if (stage === "cta_handoff") {
    questionKey = "";
  } else if (stage === "intent_detection" && missingFields.includes("purpose")) {
    questionKey = "purpose";
  } else {
    questionKey = missingFields[0] || "";
  }

  const quickReplyMap = {
    purpose: "purpose",
    preferred_area: "preferred_area",
    budget: "budget",
    payment_plan: "payment_plan",
    down_payment: "down_payment",
    property_type: "property_type",
    room_type: "room_type",
    delivery_status: "delivery_status",
    citizenship_need: "citizenship_need",
    buyer_profile: "buyer_profile",
    amenities: "amenities",
    timeline: "timeline",
    fallback_preference: "fallback_preference",
    lead_intent: "lead_intent",
    consultation_mode: "consultation_mode",
    contact: "contact_method",
    contact_details: "",
    citizenship: "citizenship",
  };

  return {
    questionKey,
    nextQuestion: questionKey ? localized.questions?.[questionKey] || "" : "",
    quickReplies: resourcePlan?.shouldOfferResources
      ? resourcePlan.offerQuickReplies
      : questionKey
      ? buildQuickReplies(quickReplyMap[questionKey], locale)
      : [],
    resourceOfferText: safeText(resourcePlan?.offerText),
  };
};

const formatBudgetLabel = (lead = {}) => {
  const min = Number(lead.budgetMin) || 0;
  const max = Number(lead.budgetMax) || 0;
  const currency = safeText(lead.currency, "USD");
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "TRY" ? "₺" : "";
  const fmt = (n) => `${symbol}${n.toLocaleString("en-US")}`;
  if (min > 0 && max > 0 && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  if (max > 0) return fmt(max);
  if (min > 0) return fmt(min);
  return "";
};

const formatRecommendationLine = (item = {}, locale = "en") => {
  const segments = [
    safeText(item.title, "Project"),
    [safeText(item.city), safeText(item.district)].filter(Boolean).join(" / "),
    formatUsdPrice(item.price_usd, locale),
  ].filter(Boolean);
  return segments.join(" - ");
};

const buildFallbackReply = ({
  locale = "en",
  stage = "qualification",
  pageContext = {},
  recommendations = [],
  nextQuestion = "",
  lead = {},
  recommendationContext = null,
  resourceOfferText = "",
  resources = [],
} = {}) => {
  const localized = getLocalizedAgentCopy(locale);
  const greeting =
    localized.greetings?.[pageContext.pageType] || localized.greetings.default;
  const resourceShareText =
    Array.isArray(resources) && resources.length > 0
      ? ` ${localized.resourceShareIntro || ""}`
      : "";
  const resourceOfferSuffix = resourceOfferText ? ` ${resourceOfferText}` : "";
  if (stage === "greeting") {
    return greeting;
  }
  if (stage === "contact_capture") {
    return `${nextQuestion || localized.questions.contact_details}${resourceShareText}${resourceOfferSuffix}`.trim();
  }
  if (stage === "cta_handoff") {
    return `${localized.handoffReady || localized.handoff}${resourceShareText}${resourceOfferSuffix}`.trim();
  }
  if (stage === "intent_detection" || stage === "qualification") {
    const budgetConfirm = formatBudgetLabel(lead);
    const budgetPrefix = budgetConfirm && nextQuestion && nextQuestion !== localized.questions?.budget
      ? `${budgetConfirm} — `
      : "";
    return `${budgetPrefix}${nextQuestion || localized.questions.budget || greeting}${resourceShareText}`.trim();
  }
  const recommendationFallbackNote =
    stage === "recommendation" &&
    recommendationContext?.fallbackMode &&
    recommendationContext.fallbackMode !== "exact_match"
      ? ` ${
          localized.recommendationFallback?.[recommendationContext.fallbackMode] || ""
        }`
      : "";
  const recommendationText =
    stage === "recommendation"
      ? recommendations.length > 0
        ? ` ${localized.recommendationIntro} ${recommendations
            .slice(0, 3)
            .map((item) => formatRecommendationLine(item, locale))
            .join("; ")}.`
        : ` ${localized.noFilesInRegion || "No properties are currently available in this region."}`
      : "";
  const nudge =
    stage === "contact_capture" || stage === "cta_handoff"
      ? ` ${localized.leadCaptureNudge}`
      : "";
  const question = nextQuestion ? ` ${nextQuestion}` : "";

  return `${recommendationFallbackNote}${recommendationText}${resourceShareText}${nudge}${question}${resourceOfferSuffix}`.trim();
};

const buildHandoffPayload = ({
  lead = {},
  transcript = [],
  recommendations = [],
  score = {},
  pageContext = {},
  sessionId = "",
} = {}) => {
  const whatsappNumber = safeText(
    process.env.AI_SALES_AGENT_WHATSAPP_NUMBER ||
      process.env.WHATSAPP_NUMBER ||
      DEFAULT_AGENT_WHATSAPP_NUMBER
  ).replace(/\D/g, "");
  const whatsappSummary = formatLeadForWhatsApp({
    lead: { ...lead, aiSessionId: sessionId },
    score,
    recommendations,
  });

  return {
    whatsapp: {
      ready: Boolean(whatsappNumber),
      url: whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
            whatsappSummary
          )}`
        : "",
      summary: whatsappSummary,
    },
    crm: formatLeadForCRM({
      lead: { ...lead, aiSessionId: sessionId },
      transcript,
      recommendations,
      score,
      pageContext,
      attribution: {},
    }),
  };
};

const withWhatsAppDelivery = (handoff = {}, delivery = null) => ({
  ...handoff,
  whatsapp: {
    ...(handoff.whatsapp || {}),
    cloudConfigured: hasWhatsAppCloudApiConfig(),
    delivery: delivery || null,
  },
});

const buildRecommendationContext = (recommendations = []) => {
  const visibleRecommendations = Array.isArray(recommendations) ? recommendations : [];
  const exactAreaCount = visibleRecommendations.filter((item) =>
    ["exact_project", "exact_district"].includes(item?.locationMatchLabel)
  ).length;
  const sameCityCount = visibleRecommendations.filter(
    (item) => item?.locationMatchLabel === "same_city"
  ).length;
  const withinBudgetCount = visibleRecommendations.filter(
    (item) => item?.budgetFitLabel === "within_budget"
  ).length;
  const aboveBudgetCount = visibleRecommendations.filter(
    (item) => item?.budgetFitLabel === "above_budget"
  ).length;

  let fallbackMode = "exact_match";
  if (exactAreaCount === 0 && sameCityCount > 0 && withinBudgetCount > 0) {
    fallbackMode = "same_city_budget_fallback";
  } else if (withinBudgetCount === 0 && aboveBudgetCount > 0) {
    fallbackMode = "above_budget_area_fallback";
  } else if (exactAreaCount === 0 && sameCityCount === 0 && visibleRecommendations.length > 0) {
    fallbackMode = "broad_area_fallback";
  }

  return {
    exactAreaCount,
    sameCityCount,
    withinBudgetCount,
    aboveBudgetCount,
    fallbackMode,
  };
};

const buildWhyItMatches = (item = {}, lead = {}) => {
  const labels = [];
  const reasons = Array.isArray(item.matchReasons) ? item.matchReasons : [];
  const itemSearchable = [
    safeText(item.title),
    safeText(item.city),
    safeText(item.district),
    safeText(item.payment_plan),
    safeText(item.property_type),
    safeText(item.description),
    safeText(item.features),
  ].join(" ").toLowerCase();

  if (reasons.includes("project_match")) labels.push("exact project match");
  if (reasons.includes("district_match")) labels.push("near preferred area");
  if (reasons.includes("preferred_side_match")) labels.push("preferred side of Istanbul");
  if (reasons.includes("city_match") && !reasons.includes("district_match")) labels.push("same city");

  if (
    safeText(lead.roomType) &&
    safeText(item.rooms) &&
    safeText(item.rooms) === safeText(lead.roomType)
  ) {
    labels.push("matches room type");
  }

  if (reasons.includes("within_budget")) {
    labels.push("within budget");
  } else if (reasons.includes("above_budget")) {
    labels.push("slightly above budget");
  }

  if (
    (lead.citizenshipInterest === true || lead.citizenshipNeed === "yes" || lead.citizenshipNeed === "maybe") &&
    reasons.includes("citizenship_fit")
  ) {
    labels.push("eligible for citizenship");
  }

  if (
    (lead.paymentPlan === "installment" || lead.paymentPlan === "flexible") &&
    reasons.includes("installment_match")
  ) {
    labels.push("installment available");
  }

  if (
    safeText(lead.deliveryStatus) === "ready" &&
    (itemSearchable.includes("ready") || itemSearchable.includes("hazir") || itemSearchable.includes("teslim"))
  ) {
    labels.push("ready title deed");
  } else if (reasons.includes("delivery_match")) {
    labels.push("matches delivery preference");
  }

  if (reasons.includes("family_friendly")) labels.push("family-friendly concept");
  if (reasons.includes("sea_view_match")) labels.push("sea view available");
  if (reasons.includes("title_deed_ready") && !labels.includes("ready title deed")) labels.push("ready title deed");
  if (reasons.includes("amenity_match")) labels.push("matches your priorities");

  if (
    safeText(lead.propertyTypeInterest) &&
    itemSearchable.includes(safeText(lead.propertyTypeInterest).toLowerCase())
  ) {
    if (!labels.some((l) => l.includes("property"))) {
      labels.push("matches property type");
    }
  }

  if (lead.purpose === "investment" && reasons.includes("investment_fit")) {
    labels.push("investment-friendly");
  }

  return labels;
};

const enrichRecommendationsWithWhyItMatches = (recommendations = [], lead = {}) =>
  recommendations.map((item) => ({
    ...item,
    whyItMatches: buildWhyItMatches(item, lead),
  }));

const buildAssistantPayload = async ({
  locale,
  stage,
  lead,
  pageContext,
  recommendations,
  nextQuestion,
  quickReplies,
  transcript,
  score,
  latestUserMessage = "",
  resourcePlan = null,
} = {}) => {
  let visibleRecommendations = getVisibleRecommendations({
    stage,
    recommendations,
  });
  const resources =
    resourcePlan?.shouldShowResources
      ? await getRelevantBlogResources({
          latestUserMessage,
          pageContext,
          lead,
          locale,
          limit: 3,
          explicitOnly: Boolean(resourcePlan?.explicitOnly),
        })
      : [];
  const recommendationContext = buildRecommendationContext(visibleRecommendations);

  const isFallbackNeeded =
    stage === "recommendation" &&
    visibleRecommendations.length > 0 &&
    recommendationContext.fallbackMode !== "exact_match" &&
    !safeText(lead.fallbackPreference);

  if (isFallbackNeeded) {
    visibleRecommendations = [];
  }

  visibleRecommendations = enrichRecommendationsWithWhyItMatches(
    visibleRecommendations,
    lead
  );

  const fallbackReply = buildFallbackReply({
    locale,
    stage,
    pageContext,
    recommendations: visibleRecommendations,
    nextQuestion,
    lead,
    recommendationContext: isFallbackNeeded ? null : recommendationContext,
    resourceOfferText: safeText(resourcePlan?.offerText),
    resources,
  });
  const generated = await generateAiSalesAgentReply({
    locale,
    stage,
    lead,
    pageContext,
    recommendations: visibleRecommendations,
    nextQuestion,
    transcript,
    score,
    fallbackReply,
    recommendationContext: isFallbackNeeded ? null : recommendationContext,
  });
  const localized = getLocalizedAgentCopy(locale);
  const shouldUseDeterministicReply =
    stage === "greeting" ||
    stage === "intent_detection" ||
    stage === "contact_capture" ||
    stage === "cta_handoff" ||
    isFallbackNeeded ||
    ((stage === "qualification" || stage === "recommendation") &&
      (!visibleRecommendations.length || !nextQuestion));

  const hasRecommendationsShown = visibleRecommendations.length > 0;
  const showLeadForm =
    (stage === "contact_capture" || stage === "cta_handoff") ||
    (hasRecommendationsShown && safeText(lead.leadIntent));

  return {
    content:
      shouldUseDeterministicReply ? fallbackReply : generated?.reply || fallbackReply,
    nextQuestion,
    quickReplies,
    recommendations: visibleRecommendations,
    resources,
    cta: {
      primaryLabel: localized.cta.primary,
      secondaryLabel: localized.cta.secondary,
      showLeadForm,
      showWhatsApp: false,
    },
  };
};

const shouldPersistLead = ({ lead = {}, score = {}, stage = "qualification" } = {}) =>
  hasContact(lead) ||
  score?.qualified ||
  score?.leadTemperature === "hot" ||
  stage === "cta_handoff" ||
  safeText(lead.consultationMode) !== "";

const withAssistantTimestamp = (assistant = {}) => ({
  role: "assistant",
  content: safeText(assistant.content),
  timestamp: new Date().toISOString(),
  nextQuestion: safeText(assistant.nextQuestion),
  quickReplies: Array.isArray(assistant.quickReplies) ? assistant.quickReplies : [],
  recommendations: Array.isArray(assistant.recommendations)
    ? assistant.recommendations
    : [],
  resources: Array.isArray(assistant.resources) ? assistant.resources : [],
  cta:
    assistant.cta && typeof assistant.cta === "object"
      ? {
          primaryLabel: safeText(assistant.cta.primaryLabel),
          secondaryLabel: safeText(assistant.cta.secondaryLabel),
          showLeadForm: Boolean(assistant.cta.showLeadForm),
          showWhatsApp: Boolean(assistant.cta.showWhatsApp),
        }
      : null,
});

export const startAiSalesConversation = async ({
  sessionId,
  locale,
  pageContext = {},
} = {}) => {
  const normalizedPageContext = normalizePageContext(pageContext, locale);
  const normalizedLocale = normalizeAiLocale(locale || normalizedPageContext.locale);
  const lead = mergeLeadData(buildLeadDefaultsFromContext(normalizedPageContext, normalizedLocale));
  const recommendations =
    normalizedPageContext.currentProjectName || normalizedPageContext.pageType === "investment"
      ? await getDeterministicRecommendations(lead, normalizedPageContext, { limit: 3, locale: normalizedLocale })
      : [];
  const score = scoreLead(lead, normalizedPageContext);
  const { nextQuestion, quickReplies } = buildQuestionConfig({
    locale: normalizedLocale,
    stage: "greeting",
    lead,
    pageContext: normalizedPageContext,
  });
  const assistant = await buildAssistantPayload({
    locale: normalizedLocale,
    stage: "greeting",
    lead,
    pageContext: normalizedPageContext,
    recommendations,
    nextQuestion,
    quickReplies,
    transcript: [],
    score,
    latestUserMessage: "",
  });
  const resolvedSessionId = safeText(sessionId) || randomUUID();

  return {
    sessionId: resolvedSessionId,
    stage: "greeting",
    lead,
    leadScore: score.score,
    leadTemperature: score.leadTemperature,
    qualified: score.qualified,
    assistant: withAssistantTimestamp(assistant),
    handoff: buildHandoffPayload({
      lead,
      transcript: [],
      recommendations,
      score,
      pageContext: normalizedPageContext,
      sessionId: resolvedSessionId,
    }),
  };
};

export const continueAiSalesConversation = async ({
  sessionId,
  locale,
  message,
  transcript = [],
  lead = {},
  pageContext = {},
  attribution = {},
} = {}) => {
  const normalizedLocale = normalizeAiLocale(locale || pageContext.locale);
  const normalizedPageContext = normalizePageContext(pageContext, normalizedLocale);
  const normalizedTranscript = normalizeTranscript(transcript);
  const baseLead = mergeLeadData(
    buildLeadDefaultsFromContext(normalizedPageContext, normalizedLocale),
    lead
  );
  const extraction = extractLeadSignalUpdate({
    message,
    existingLead: baseLead,
    pageContext: normalizedPageContext,
    locale: normalizedLocale,
  });
  const mergedLead = mergeLeadData(baseLead, extraction.lead);
  const previousStage = safeText(
    normalizeLeadPayload(lead).aiStage || lead.aiStage || ""
  );
  const recommendations = await getDeterministicRecommendations(
    mergedLead,
    normalizedPageContext,
    { limit: 4, locale: normalizedLocale }
  );
  const score = scoreLead(mergedLead, normalizedPageContext);
  const stage = determineStage({
    previousStage: isRecognizedStage(previousStage) ? previousStage : "greeting",
    lead: mergedLead,
    recommendations,
    score,
    pageContext: normalizedPageContext,
    highIntent: extraction.highIntent,
  });
  const resourcePlan = resolveResourcePlan({
    locale: normalizedLocale,
    stage,
    previousLead: baseLead,
    lead: mergedLead,
    pageContext: normalizedPageContext,
    latestUserMessage: message,
  });
  const leadWithStage = {
    ...mergeLeadData(mergedLead, resourcePlan.leadPatch),
    aiStage: stage,
    aiSessionId: safeText(sessionId),
  };

  const recommendationContext = buildRecommendationContext(recommendations);
  const pendingFallbackQuestion =
    stage === "recommendation" &&
    recommendations.length > 0 &&
    recommendationContext.fallbackMode !== "exact_match" &&
    !safeText(leadWithStage.fallbackPreference);

  const hasRecommendationsForLeadIntent =
    stage === "recommendation" &&
    recommendations.length > 0 &&
    !pendingFallbackQuestion;

  const pendingLeadIntent =
    hasRecommendationsForLeadIntent && !safeText(leadWithStage.leadIntent);

  const questionConfig = buildQuestionConfig({
    locale: normalizedLocale,
    stage,
    lead: leadWithStage,
    pageContext: normalizedPageContext,
    resourcePlan,
    pendingFallbackQuestion,
    pendingLeadIntent,
  });
  const assistant = await buildAssistantPayload({
    locale: normalizedLocale,
    stage,
    lead: leadWithStage,
    pageContext: normalizedPageContext,
    recommendations,
    nextQuestion: questionConfig.nextQuestion,
    quickReplies: questionConfig.quickReplies,
    transcript: normalizedTranscript,
    score,
    latestUserMessage: message,
    resourcePlan: {
      ...resourcePlan,
      offerText: questionConfig.resourceOfferText || resourcePlan.offerText,
    },
  });

  let persistedLeadId = null;
  if (shouldPersistLead({ lead: leadWithStage, score, stage })) {
    const persisted = await persistAiLeadConversation({
      sessionId,
      lead: leadWithStage,
      transcript: normalizedTranscript,
      recommendations,
      score,
      pageContext: normalizedPageContext,
      attribution,
      notifyByEmail: false,
    });
    persistedLeadId = persisted?.record?.id || null;
  }

  return {
    sessionId,
    stage,
    lead: leadWithStage,
    leadScore: score.score,
    leadTemperature: score.leadTemperature,
    qualified: score.qualified,
    extractedFields: extraction.updatedFields,
    persistedLeadId,
    assistant: withAssistantTimestamp(assistant),
    handoff: buildHandoffPayload({
      lead: leadWithStage,
      transcript: normalizedTranscript,
      recommendations,
      score,
      pageContext: normalizedPageContext,
      sessionId,
    }),
  };
};

export const submitAiSalesLead = async ({
  sessionId,
  locale,
  transcript = [],
  lead = {},
  pageContext = {},
  attribution = {},
} = {}) => {
  const normalizedLocale = normalizeAiLocale(locale || pageContext.locale);
  const normalizedPageContext = normalizePageContext(pageContext, normalizedLocale);
  const normalizedTranscript = normalizeTranscript(transcript);
  const finalLead = mergeLeadData(
    buildLeadDefaultsFromContext(normalizedPageContext, normalizedLocale),
    lead,
    {
      aiStage: "cta_handoff",
      aiSessionId: safeText(sessionId),
      preferredLanguage: normalizedLocale,
    }
  );
  const recommendations = await getDeterministicRecommendations(
    finalLead,
    normalizedPageContext,
    { limit: 4, locale: normalizedLocale }
  );
  const score = scoreLead(finalLead, normalizedPageContext);
  const persisted = await persistAiLeadConversation({
    sessionId,
    lead: finalLead,
    transcript: normalizedTranscript,
    recommendations,
    score,
    pageContext: normalizedPageContext,
    attribution,
    notifyByEmail: true,
  });
  const shouldSendShortlistOnWhatsApp =
    Boolean(safeText(finalLead.phone)) &&
    ["", "whatsapp"].includes(
      safeText(finalLead.preferredContactMethod).toLowerCase()
    );
  const whatsappDelivery = shouldSendShortlistOnWhatsApp
    ? await sendLeadPackageToWhatsApp({
        lead: finalLead,
        recommendations,
        locale: normalizedLocale,
      })
    : {
        attempted: false,
        sent: false,
        reason: "whatsapp_not_requested",
        messages: [],
      };
  const emailDelivery = safeText(finalLead.email)
    ? await sendLeadPackageByEmail({
        lead: finalLead,
        recommendations,
        locale: normalizedLocale,
      })
    : { attempted: false, sent: false, reason: "missing_recipient_email", messages: [] };
  const handoff = withWhatsAppDelivery(
    buildHandoffPayload({
      lead: finalLead,
      transcript: normalizedTranscript,
      recommendations,
      score,
      pageContext: normalizedPageContext,
      sessionId,
    }),
    whatsappDelivery
  );
  handoff.emailDelivery = emailDelivery;

  return {
    success: true,
    leadId: persisted.record.id,
    leadScore: score.score,
    leadTemperature: score.leadTemperature,
    qualified: score.qualified,
    crmPayload: persisted.crmPayload,
    handoff,
    emailNotification: persisted.emailResult,
  };
};

export const createAiWhatsAppHandoff = async ({
  sessionId,
  locale,
  transcript = [],
  lead = {},
  pageContext = {},
  attribution = {},
} = {}) => {
  const normalizedLocale = normalizeAiLocale(locale || pageContext.locale);
  const normalizedPageContext = normalizePageContext(pageContext, normalizedLocale);
  const normalizedTranscript = normalizeTranscript(transcript);
  const finalLead = mergeLeadData(
    buildLeadDefaultsFromContext(normalizedPageContext, normalizedLocale),
    lead,
    {
      aiStage: "cta_handoff",
      aiSessionId: safeText(sessionId),
      preferredLanguage: normalizedLocale,
    }
  );
  const recommendations = await getDeterministicRecommendations(
    finalLead,
    normalizedPageContext,
    { limit: 4, locale: normalizedLocale }
  );
  const score = scoreLead(finalLead, normalizedPageContext);

  await persistAiLeadConversation({
    sessionId,
    lead: finalLead,
    transcript: normalizedTranscript,
    recommendations,
    score,
    pageContext: normalizedPageContext,
    attribution,
    notifyByEmail: false,
  });
  const whatsappDelivery = await sendLeadPackageToWhatsApp({
    lead: finalLead,
    recommendations,
    locale: normalizedLocale,
  });
  const emailDelivery = safeText(finalLead.email)
    ? await sendLeadPackageByEmail({
        lead: finalLead,
        recommendations,
        locale: normalizedLocale,
      })
    : { attempted: false, sent: false, reason: "missing_recipient_email", messages: [] };

  const handoff = withWhatsAppDelivery(buildHandoffPayload({
    lead: finalLead,
    transcript: normalizedTranscript,
    recommendations,
    score,
    pageContext: normalizedPageContext,
    sessionId,
  }), whatsappDelivery);
  handoff.emailDelivery = emailDelivery;
  return handoff;
};

export const createAiEmailHandoff = async ({
  sessionId,
  locale,
  transcript = [],
  lead = {},
  pageContext = {},
  attribution = {},
} = {}) => {
  const normalizedLocale = normalizeAiLocale(locale || pageContext.locale);
  const normalizedPageContext = normalizePageContext(pageContext, normalizedLocale);
  const normalizedTranscript = normalizeTranscript(transcript);
  const finalLead = mergeLeadData(
    buildLeadDefaultsFromContext(normalizedPageContext, normalizedLocale),
    lead,
    {
      aiStage: "cta_handoff",
      aiSessionId: safeText(sessionId),
      preferredLanguage: normalizedLocale,
    }
  );
  const recommendations = await getDeterministicRecommendations(
    finalLead,
    normalizedPageContext,
    { limit: 4, locale: normalizedLocale }
  );
  const score = scoreLead(finalLead, normalizedPageContext);
  const persisted = await persistAiLeadConversation({
    sessionId,
    lead: finalLead,
    transcript: normalizedTranscript,
    recommendations,
    score,
    pageContext: normalizedPageContext,
    attribution,
    notifyByEmail: true,
  });
  const emailDelivery = safeText(finalLead.email)
    ? await sendLeadPackageByEmail({
        lead: finalLead,
        recommendations,
        locale: normalizedLocale,
      })
    : { attempted: false, sent: false, reason: "missing_recipient_email", messages: [] };

  return {
    sent: persisted.emailResult.sent,
    reason: persisted.emailResult.reason || "",
    leadId: persisted.record.id,
    emailDelivery,
  };
};

export const getAiSalesRecommendations = async ({
  locale,
  lead = {},
  pageContext = {},
} = {}) => {
  const normalizedLocale = normalizeAiLocale(locale || pageContext.locale);
  const normalizedPageContext = normalizePageContext(pageContext, normalizedLocale);
  const normalizedLead = mergeLeadData(
    buildLeadDefaultsFromContext(normalizedPageContext, normalizedLocale),
    lead
  );
  const recommendations = await getDeterministicRecommendations(
    normalizedLead,
    normalizedPageContext,
    { limit: 6, locale: normalizedLocale }
  );

  return {
    recommendations,
  };
};
