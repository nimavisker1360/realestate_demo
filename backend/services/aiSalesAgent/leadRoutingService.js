import nodemailer from "nodemailer";
import { prisma } from "../../config/prismaConfig.js";
import { extractLeadAttribution } from "../../utils/leadAttribution.js";
import { uploadQualifiedLeadConversion } from "../googleAdsQualifiedLeadUpload.js";

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const safeText = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const buildBudgetLabel = (lead = {}) => {
  const min = Number(lead.budgetMin) || 0;
  const max = Number(lead.budgetMax) || 0;
  const currency = safeText(lead.currency, "USD");

  if (min > 0 && max > 0 && min !== max) {
    return `${min.toLocaleString()} - ${max.toLocaleString()} ${currency}`;
  }
  if (max > 0) {
    return `Up to ${max.toLocaleString()} ${currency}`;
  }
  if (min > 0) {
    return `From ${min.toLocaleString()} ${currency}`;
  }
  return "";
};

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  const user = String(process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.EMAIL_PASS || "").replace(/\s+/g, "");
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
};

const CONTACT_MESSAGE_UPDATE_CHUNK_SIZE = 12;

const updateContactMessageInChunks = async (recordId, data = {}) => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (!recordId || entries.length === 0) {
    return null;
  }

  let updatedRecord = null;

  // Prisma Mongo updates large objects via aggregation pipelines.
  // Atlas rejects pipelines longer than 50 stages, so split wide updates.
  for (let index = 0; index < entries.length; index += CONTACT_MESSAGE_UPDATE_CHUNK_SIZE) {
    const chunkData = Object.fromEntries(
      entries.slice(index, index + CONTACT_MESSAGE_UPDATE_CHUNK_SIZE)
    );

    updatedRecord = await prisma.contactMessage.update({
      where: { id: recordId },
      data: chunkData,
    });
  }

  return updatedRecord;
};

export const formatLeadForCRM = ({
  lead = {},
  transcript = [],
  recommendations = [],
  score = {},
  pageContext = {},
  attribution = {},
  leadRecordId = null,
} = {}) => ({
  id: leadRecordId,
  source: "ai_agent",
  sessionId: safeText(lead.aiSessionId || lead.sessionId),
  preferredLanguage: safeText(lead.preferredLanguage),
  fullName: safeText(lead.fullName),
  email: safeText(lead.email),
  phone: safeText(lead.phone),
  preferredContactMethod: safeText(lead.preferredContactMethod),
  nationality: safeText(lead.nationality),
  budgetMin: Number(lead.budgetMin) || null,
  budgetMax: Number(lead.budgetMax) || null,
  currency: safeText(lead.currency),
  purpose: safeText(lead.purpose),
  preferredArea: safeText(lead.preferredArea),
  locationInterest: safeText(lead.locationInterest),
  cityInterest: safeText(lead.cityInterest),
  districtInterest: safeText(lead.districtInterest),
  projectInterest: safeText(lead.projectInterest),
  propertyType: safeText(lead.propertyTypeInterest),
  roomType: safeText(lead.roomType),
  paymentPlan: safeText(lead.paymentPlan),
  downPaymentAbility: safeText(lead.downPaymentAbility),
  deliveryStatus: safeText(lead.deliveryStatus),
  citizenshipNeed: safeText(lead.citizenshipNeed),
  citizenshipInterest: lead.citizenshipInterest === true,
  buyerProfile: safeText(lead.buyerProfile),
  amenitiesPriorities: Array.isArray(lead.amenitiesPriorities) ? lead.amenitiesPriorities : [],
  timeline: safeText(lead.timeline),
  fallbackPreference: safeText(lead.fallbackPreference),
  leadIntent: safeText(lead.leadIntent),
  selectedProjectName: safeText(lead.selectedProjectName),
  consultationMode: safeText(lead.consultationMode),
  leadScore: Number(score.score) || 0,
  leadTemperature: safeText(score.leadTemperature, "cold"),
  pageType: safeText(pageContext.pageType),
  sourcePage: safeText(pageContext.url || pageContext.pathname || lead.sourcePage),
  currentProjectName: safeText(pageContext.currentProjectName),
  campaign: {
    gclid: safeText(attribution.gclid),
    gbraid: safeText(attribution.gbraid),
    wbraid: safeText(attribution.wbraid),
    fbclid: safeText(attribution.fbclid),
    utmSource: safeText(attribution.utmSource),
    utmMedium: safeText(attribution.utmMedium),
    utmCampaign: safeText(attribution.utmCampaign),
    utmTerm: safeText(attribution.utmTerm),
    utmContent: safeText(attribution.utmContent),
    landingPage: safeText(attribution.landingPage),
    referrer: safeText(attribution.referrer),
  },
  recommendations: recommendations.map((item) => ({
    id: item.id,
    title: item.title,
    city: item.city,
    district: item.district,
    priceUsd: Number(item.price_usd) || 0,
    paymentPlan: item.payment_plan || "",
    detailUrl: item.detail_url || "",
    matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons : [],
  })),
  transcript,
});

export const formatLeadForWhatsApp = ({
  lead = {},
  score = {},
  recommendations = [],
} = {}) => {
  const lines = [
    `AI Lead: ${safeText(lead.fullName, "Website visitor")}`,
    hasValue(lead.phone) ? `Phone: ${lead.phone}` : "",
    hasValue(lead.email) ? `Email: ${lead.email}` : "",
    hasValue(lead.preferredContactMethod)
      ? `Preferred contact: ${lead.preferredContactMethod}`
      : "",
    hasValue(lead.purpose) ? `Purpose: ${lead.purpose}` : "",
    hasValue(buildBudgetLabel(lead)) ? `Budget: ${buildBudgetLabel(lead)}` : "",
    hasValue(lead.locationInterest) ? `Location: ${lead.locationInterest}` : "",
    hasValue(lead.projectInterest) ? `Project: ${lead.projectInterest}` : "",
    hasValue(lead.propertyTypeInterest)
      ? `Property type: ${lead.propertyTypeInterest}`
      : "",
    hasValue(lead.roomType) ? `Room type: ${lead.roomType}` : "",
    hasValue(lead.paymentPlan) ? `Payment plan: ${lead.paymentPlan}` : "",
    hasValue(lead.timeline) ? `Timeline: ${lead.timeline}` : "",
    lead.citizenshipInterest === true ? "Citizenship interest: yes" : "",
    hasValue(lead.consultationMode)
      ? `Consultation mode: ${lead.consultationMode}`
      : "",
    `Lead score: ${Number(score.score) || 0} (${safeText(score.leadTemperature, "cold")})`,
    recommendations.length > 0
      ? `Recommended: ${recommendations
          .slice(0, 3)
          .map((item) => item.title)
          .filter(Boolean)
          .join(", ")}`
      : "",
    ...recommendations.slice(0, 3).map((item, index) => {
      const detailUrl = safeText(item.detail_url || item.detailUrl);
      if (!detailUrl) return "";
      return `Option ${index + 1}: ${detailUrl}`;
    }),
  ].filter(Boolean);

  return lines.join("\n");
};

export const formatLeadForEmail = ({
  lead = {},
  transcript = [],
  recommendations = [],
  score = {},
  pageContext = {},
} = {}) => {
  const subject = `AI Sales Lead${
    hasValue(lead.projectInterest)
      ? ` - ${lead.projectInterest}`
      : hasValue(pageContext.currentProjectName)
      ? ` - ${pageContext.currentProjectName}`
      : ""
  }`;

  const amenitiesLabel = Array.isArray(lead.amenitiesPriorities) && lead.amenitiesPriorities.length > 0
    ? lead.amenitiesPriorities.map((a) => a.replace(/_/g, " ")).join(", ")
    : "-";

  const detailRows = [
    ["Name", safeText(lead.fullName, "-")],
    ["Email", safeText(lead.email, "-")],
    ["Phone", safeText(lead.phone, "-")],
    ["Preferred language", safeText(lead.preferredLanguage, "-")],
    ["Nationality", safeText(lead.nationality, "-")],
    ["Purpose / Goal", safeText(lead.purpose, "-")],
    ["Preferred area", safeText(lead.preferredArea || lead.locationInterest, "-")],
    ["Budget", safeText(buildBudgetLabel(lead), "-")],
    ["Currency", safeText(lead.currency, "-")],
    ["Payment preference", safeText(lead.paymentPlan, "-")],
    ["Down payment ability", safeText(lead.downPaymentAbility, "-")],
    ["Property type", safeText(lead.propertyTypeInterest, "-")],
    ["Room type", safeText(lead.roomType, "-")],
    ["Delivery status", safeText(lead.deliveryStatus, "-")],
    ["Citizenship need", safeText(lead.citizenshipNeed, "-")],
    ["Buyer profile", safeText(lead.buyerProfile, "-")],
    ["Amenities / Priorities", amenitiesLabel],
    ["Purchase timeline", safeText(lead.timeline, "-")],
    ["Fallback preference", safeText(lead.fallbackPreference, "-")],
    ["Selected project", safeText(lead.selectedProjectName || lead.projectInterest || pageContext.currentProjectName, "-")],
    ["CTA intent", safeText(lead.leadIntent, "-")],
    ["Consultation mode", safeText(lead.consultationMode, "-")],
    [
      "Lead score",
      `${Number(score.score) || 0} (${safeText(score.leadTemperature, "cold")})`,
    ],
    ["Page", safeText(pageContext.url || pageContext.pathname, "-")],
  ];

  const transcriptHtml = transcript
    .slice(-10)
    .map(
      (item) =>
        `<li><strong>${safeText(item.role, "user")}:</strong> ${safeText(
          item.content,
          "-"
        )}</li>`
    )
    .join("");

  const recommendationHtml = recommendations
    .slice(0, 3)
    .map(
      (item) =>
        `<li><strong>${safeText(item.title, "Project")}</strong> - ${safeText(
          item.city
        )} ${safeText(item.district)} ${item.price_usd ? `- $${Number(item.price_usd).toLocaleString()}` : ""}</li>`
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 760px; margin: 0 auto;">
      <h2 style="margin-bottom: 12px;">${subject}</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        ${detailRows
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #ececec; width: 220px;"><strong>${label}</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #ececec;">${safeText(value, "-")}</td>
              </tr>
            `
          )
          .join("")}
      </table>
      <h3>Recommended options</h3>
      <ul>${recommendationHtml || "<li>No deterministic recommendation was available.</li>"}</ul>
      <h3>Recent transcript</h3>
      <ul>${transcriptHtml || "<li>No transcript available.</li>"}</ul>
    </div>
  `;

  const text = detailRows.map(([label, value]) => `${label}: ${value}`).join("\n");

  return { subject, text, html };
};

export const buildAiLeadSummary = ({ lead = {}, score = {}, pageContext = {} } = {}) =>
  [
    safeText(lead.fullName, "Website visitor"),
    hasValue(lead.phone) ? `Phone: ${lead.phone}` : "",
    hasValue(lead.email) ? `Email: ${lead.email}` : "",
    hasValue(lead.purpose) ? `Purpose: ${lead.purpose}` : "",
    hasValue(buildBudgetLabel(lead)) ? `Budget: ${buildBudgetLabel(lead)}` : "",
    hasValue(lead.locationInterest) ? `Location: ${lead.locationInterest}` : "",
    hasValue(lead.projectInterest || pageContext.currentProjectName)
      ? `Project: ${lead.projectInterest || pageContext.currentProjectName}`
      : "",
    hasValue(lead.consultationMode) ? `Consultation: ${lead.consultationMode}` : "",
    `Lead score: ${Number(score.score) || 0} (${safeText(score.leadTemperature, "cold")})`,
  ]
    .filter(Boolean)
    .join(" | ");

export const sendLeadNotificationEmail = async (emailPayload = null) => {
  const transporter = createTransporter();
  if (!transporter || !emailPayload?.subject) {
    return { sent: false, reason: "email_not_configured" };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
    replyTo: emailPayload.replyTo || undefined,
  });

  return { sent: true };
};

const LEAD_EMAIL_COPY = {
  en: {
    subject: "Your Property Shortlist from HB Real Estate",
    greeting: "Hello {{name}},",
    intro: "Thank you for your interest! Here are the properties we selected based on your preferences:",
    viewDetails: "View Details",
    footer: "If you have any questions, feel free to reply to this email or contact us via WhatsApp.",
    team: "HB Real Estate Team",
  },
  tr: {
    subject: "HB Real Estate - Sizin İçin Seçilen Gayrimenkuller",
    greeting: "Merhaba {{name}},",
    intro: "İlginiz için teşekkür ederiz! Tercihlerinize göre seçtiğimiz gayrimenkuller:",
    viewDetails: "Detayları Gör",
    footer: "Herhangi bir sorunuz varsa bu e-postayı yanıtlayabilir veya WhatsApp üzerinden bize ulaşabilirsiniz.",
    team: "HB Real Estate Ekibi",
  },
  ru: {
    subject: "Подборка недвижимости от HB Real Estate",
    greeting: "Здравствуйте, {{name}}!",
    intro: "Спасибо за ваш интерес! Вот объекты, которые мы подобрали на основе ваших предпочтений:",
    viewDetails: "Подробнее",
    footer: "Если у вас есть вопросы, ответьте на это письмо или свяжитесь с нами через WhatsApp.",
    team: "Команда HB Real Estate",
  },
};

const resolveLeadEmailLocale = (value) => {
  const locale = safeText(value, "en").toLowerCase().slice(0, 2);
  return LEAD_EMAIL_COPY[locale] ? locale : "en";
};

const resolvePublicBaseUrl = () =>
  safeText(
    process.env.CANONICAL_BASE_URL ||
      process.env.SITEMAP_BASE_URL ||
      process.env.SITE_URL,
    "https://www.hbrealstate.com"
  );

const toAbsolutePropertyUrl = (relativeUrl) => {
  const raw = safeText(relativeUrl);
  if (!raw) return "";
  try {
    return new URL(raw).toString();
  } catch (_e) {
    try {
      return new URL(raw, resolvePublicBaseUrl()).toString();
    } catch (_e2) {
      return "";
    }
  }
};

const buildLeadPackageHtml = ({ locale = "en", lead = {}, recommendations = [] } = {}) => {
  const selectedLocale = resolveLeadEmailLocale(locale);
  const copy = LEAD_EMAIL_COPY[selectedLocale];
  const fullName = safeText(lead.fullName, "");

  const propertyCards = recommendations.slice(0, 4).map((item) => {
    const title = safeText(item.title, "Project");
    const location = [safeText(item.city), safeText(item.district)].filter(Boolean).join(", ");
    const price = Number(item.price_usd) > 0
      ? `$${Number(item.price_usd).toLocaleString()}`
      : "";
    const imageUrl = safeText(item.image_url || item.imageUrl);
    const detailUrl = toAbsolutePropertyUrl(item.detail_url || item.detailUrl);
    const rooms = safeText(item.rooms);
    const paymentPlan = safeText(item.payment_plan || item.paymentPlan);

    const imageBlock = imageUrl
      ? `<img src="${imageUrl}" alt="${title}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px 8px 0 0;" />`
      : `<div style="width:100%;height:140px;background:#e8edf2;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;color:#8899aa;font-size:14px;">HB Real Estate</div>`;

    const meta = [rooms, paymentPlan].filter(Boolean).join(" · ");

    return `
      <div style="background:#ffffff;border:1px solid #e4e8ec;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        ${imageBlock}
        <div style="padding:14px 16px;">
          <div style="font-size:16px;font-weight:600;color:#1a2b3c;margin-bottom:4px;">${title}</div>
          ${location ? `<div style="font-size:13px;color:#6b7b8d;margin-bottom:4px;">${location}</div>` : ""}
          ${price ? `<div style="font-size:18px;font-weight:700;color:#0e7a3a;margin-bottom:4px;">${price}</div>` : ""}
          ${meta ? `<div style="font-size:12px;color:#8899aa;margin-bottom:10px;">${meta}</div>` : ""}
          ${detailUrl ? `<a href="${detailUrl}" style="display:inline-block;padding:8px 20px;background:#1a73e8;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">${copy.viewDetails}</a>` : ""}
        </div>
      </div>`;
  }).join("");

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f7fa;padding:24px;">
      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="font-size:22px;color:#1a2b3c;margin:0;">HB Real Estate</h1>
      </div>
      <div style="background:#ffffff;border-radius:12px;padding:24px;margin-bottom:16px;">
        <p style="font-size:15px;color:#1a2b3c;margin:0 0 8px;">${copy.greeting.replace("{{name}}", fullName || "")}</p>
        <p style="font-size:14px;color:#4a5568;margin:0 0 20px;">${copy.intro}</p>
        ${propertyCards}
      </div>
      <div style="text-align:center;padding:16px;font-size:13px;color:#8899aa;">
        <p style="margin:0 0 4px;">${copy.footer}</p>
        <p style="margin:0;font-weight:600;">${copy.team}</p>
      </div>
    </div>`;
};

const NO_RECOMMENDATIONS_COPY = {
  en: {
    intro: "Thank you for your interest! Our team has received your preferences and will prepare a personalized shortlist for you shortly.",
    note: "We will review the latest inventory based on your criteria and get back to you with the best matching options.",
  },
  tr: {
    intro: "İlginiz için teşekkür ederiz! Ekibimiz tercihlerinizi aldı ve kısa sürede size özel bir liste hazırlayacak.",
    note: "Kriterlerinize göre mevcut portföyü inceleyip en uygun seçeneklerle size dönüş yapacağız.",
  },
  ru: {
    intro: "Спасибо за ваш интерес! Наша команда получила ваши предпочтения и подготовит для вас персональную подборку.",
    note: "Мы изучим актуальный каталог по вашим критериям и свяжемся с лучшими вариантами.",
  },
};

const buildNoRecommendationsHtml = ({ locale = "en", lead = {} } = {}) => {
  const selectedLocale = resolveLeadEmailLocale(locale);
  const copy = LEAD_EMAIL_COPY[selectedLocale];
  const noRecCopy = NO_RECOMMENDATIONS_COPY[selectedLocale] || NO_RECOMMENDATIONS_COPY.en;
  const fullName = safeText(lead.fullName, "");

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f7fa;padding:24px;">
      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="font-size:22px;color:#1a2b3c;margin:0;">HB Real Estate</h1>
      </div>
      <div style="background:#ffffff;border-radius:12px;padding:24px;margin-bottom:16px;">
        <p style="font-size:15px;color:#1a2b3c;margin:0 0 8px;">${copy.greeting.replace("{{name}}", fullName || "")}</p>
        <p style="font-size:14px;color:#4a5568;margin:0 0 12px;">${noRecCopy.intro}</p>
        <p style="font-size:13px;color:#718096;margin:0;">${noRecCopy.note}</p>
      </div>
      <div style="text-align:center;padding:16px;font-size:13px;color:#8899aa;">
        <p style="margin:0 0 4px;">${copy.footer}</p>
        <p style="margin:0;font-weight:600;">${copy.team}</p>
      </div>
    </div>`;
};

export const sendLeadPackageByEmail = async ({
  lead = {},
  recommendations = [],
  locale = "en",
} = {}) => {
  const transporter = createTransporter();
  const recipientEmail = safeText(lead.email);

  if (!transporter) {
    return { attempted: false, sent: false, reason: "email_not_configured", messages: [] };
  }
  if (!recipientEmail) {
    return { attempted: false, sent: false, reason: "missing_recipient_email", messages: [] };
  }

  const selectedLocale = resolveLeadEmailLocale(locale);
  const copy = LEAD_EMAIL_COPY[selectedLocale];
  const hasRecommendations = Array.isArray(recommendations) && recommendations.length > 0;
  const html = hasRecommendations
    ? buildLeadPackageHtml({ locale, lead, recommendations })
    : buildNoRecommendationsHtml({ locale, lead });

  try {
    await transporter.sendMail({
      from: `"HB Real Estate" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: copy.subject,
      html,
    });

    return {
      attempted: true,
      sent: true,
      reason: "",
      messages: [{ type: "email", success: true, to: recipientEmail }],
    };
  } catch (error) {
    console.error("Lead package email send failed:", error?.message || error);
    return {
      attempted: true,
      sent: false,
      reason: safeText(error?.message, "email_send_failed"),
      messages: [{ type: "email", success: false, to: recipientEmail }],
    };
  }
};

export const persistAiLeadConversation = async ({
  sessionId,
  lead = {},
  transcript = [],
  recommendations = [],
  score = {},
  pageContext = {},
  attribution = {},
  notifyByEmail = false,
} = {}) => {
  const normalizedLead = {
    ...lead,
    aiSessionId: safeText(sessionId || lead.aiSessionId || lead.sessionId),
  };
  const leadAttribution = extractLeadAttribution(
    { attribution },
    {
      defaultLeadSource: "ai_agent",
      defaultLeadStatus: score?.qualified ? "qualified" : "new",
    }
  );
  const crmPayload = formatLeadForCRM({
    lead: normalizedLead,
    transcript,
    recommendations,
    score,
    pageContext,
    attribution: leadAttribution,
  });
  const whatsappSummary = formatLeadForWhatsApp({
    lead: normalizedLead,
    score,
    recommendations,
  });
  const emailPayload = formatLeadForEmail({
    lead: normalizedLead,
    transcript,
    recommendations,
    score,
    pageContext,
  });
  const summary = buildAiLeadSummary({
    lead: normalizedLead,
    score,
    pageContext,
  });

  const upsertData = {
    name: safeText(normalizedLead.fullName) || null,
    email: safeText(normalizedLead.email) || null,
    phone: safeText(normalizedLead.phone) || null,
    subject: emailPayload.subject,
    message: summary || "AI sales agent lead",
    propertyId: safeText(pageContext.currentProjectId) || null,
    propertyTitle:
      safeText(normalizedLead.projectInterest || pageContext.currentProjectName) || null,
    gclid: leadAttribution.gclid,
    gbraid: leadAttribution.gbraid,
    wbraid: leadAttribution.wbraid,
    utmSource: leadAttribution.utmSource,
    utmMedium: leadAttribution.utmMedium,
    utmCampaign: leadAttribution.utmCampaign,
    utmTerm: leadAttribution.utmTerm,
    utmContent: leadAttribution.utmContent,
    landingPage: leadAttribution.landingPage,
    referrer: leadAttribution.referrer,
    leadStatus: leadAttribution.leadStatus,
    leadSource: leadAttribution.leadSource,
    preferredContactMethod: safeText(normalizedLead.preferredContactMethod) || null,
    preferredLanguage: safeText(normalizedLead.preferredLanguage) || null,
    nationality: safeText(normalizedLead.nationality) || null,
    budgetMin: Number(normalizedLead.budgetMin) || null,
    budgetMax: Number(normalizedLead.budgetMax) || null,
    budgetNotes: buildBudgetLabel(normalizedLead) || null,
    currency: safeText(normalizedLead.currency) || null,
    purpose: safeText(normalizedLead.purpose) || null,
    locationInterest: safeText(normalizedLead.locationInterest) || null,
    cityInterest: safeText(normalizedLead.cityInterest) || null,
    districtInterest: safeText(normalizedLead.districtInterest) || null,
    projectInterest: safeText(normalizedLead.projectInterest) || null,
    propertyTypeInterest: safeText(normalizedLead.propertyTypeInterest) || null,
    roomType: safeText(normalizedLead.roomType) || null,
    paymentPlan: safeText(normalizedLead.paymentPlan) || null,
    timeline: safeText(normalizedLead.timeline) || null,
    citizenshipInterest:
      normalizedLead.citizenshipInterest === true
        ? true
        : normalizedLead.citizenshipInterest === false
        ? false
        : null,
    consultationMode: safeText(normalizedLead.consultationMode) || null,
    aiSessionId: normalizedLead.aiSessionId || null,
    aiStage: safeText(normalizedLead.aiStage) || null,
    aiQualifiedAt: score?.qualified ? new Date() : null,
    leadScore: Number(score.score) || 0,
    leadTemperature: safeText(score.leadTemperature) || "cold",
    sourcePage: safeText(pageContext.url || pageContext.pathname || normalizedLead.sourcePage) || null,
    pageType: safeText(pageContext.pageType) || null,
    transcript,
    extractedAnswers: normalizedLead,
    recommendations,
    campaignData: leadAttribution,
    crmPayload,
    handoffSummary: whatsappSummary,
    submittedAt: leadAttribution.submittedAt,
  };

  const existingRecord = normalizedLead.aiSessionId
    ? await prisma.contactMessage.findFirst({
        where: { aiSessionId: normalizedLead.aiSessionId },
      })
    : null;

  const record = existingRecord
    ? await updateContactMessageInChunks(existingRecord.id, upsertData)
    : await prisma.contactMessage.create({
        data: upsertData,
      });

  if (score?.qualified) {
    await uploadQualifiedLeadConversion({
      lead: {
        ...record,
        gclid: leadAttribution.gclid,
        gbraid: leadAttribution.gbraid,
        wbraid: leadAttribution.wbraid,
        submittedAt: leadAttribution.submittedAt,
      },
      transitionAt: new Date(),
    });
  }

  const emailResult = notifyByEmail
    ? await sendLeadNotificationEmail({
        ...emailPayload,
        replyTo: safeText(normalizedLead.email),
      })
    : { sent: false, reason: "email_not_requested" };

  return {
    record,
    crmPayload: {
      ...crmPayload,
      id: record.id,
    },
    whatsappSummary,
    emailPayload,
    emailResult,
  };
};
