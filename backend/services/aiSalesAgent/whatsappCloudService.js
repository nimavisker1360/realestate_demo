const GRAPH_API_BASE_URL = "https://graph.facebook.com";
const DEFAULT_GRAPH_API_VERSION = "v23.0";
const DEFAULT_PUBLIC_BASE_URL = "https://www.hbrealstate.com";
const DEFAULT_WHATSAPP_PHONE_NUMBER_ID = "969891392881690";
const DEFAULT_WHATSAPP_BUSINESS_ACCOUNT_ID = "1408242017206702";
const MAX_MEDIA_ITEMS = 3;

const localizedCopy = {
  en: {
    intro: "Hello {{name}}, here is your shortlisted property package from HB Real Estate.",
    option: "Option {{index}}: {{title}}{{price}}{{url}}",
  },
  tr: {
    intro: "Merhaba {{name}}, HB Real Estate tarafindan sizin icin hazirlanan kisa liste burada.",
    option: "Secenek {{index}}: {{title}}{{price}}{{url}}",
  },
  ru: {
    intro: "Zdravstvuyte, {{name}}. Vot vasha podborka obektov ot HB Real Estate.",
    option: "Variant {{index}}: {{title}}{{price}}{{url}}",
  },
};

const safeText = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const normalizeLocale = (value) => {
  const locale = safeText(value, "en").toLowerCase().slice(0, 2);
  return localizedCopy[locale] ? locale : "en";
};

const getWhatsAppCloudConfig = () => ({
  accessToken: safeText(process.env.WHATSAPP_ACCESS_TOKEN),
  phoneNumberId: safeText(
    process.env.WHATSAPP_PHONE_NUMBER_ID,
    DEFAULT_WHATSAPP_PHONE_NUMBER_ID
  ),
  businessAccountId: safeText(
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    DEFAULT_WHATSAPP_BUSINESS_ACCOUNT_ID
  ),
  apiVersion: safeText(
    process.env.WHATSAPP_CLOUD_API_VERSION,
    DEFAULT_GRAPH_API_VERSION
  ),
  defaultCountryCode: safeText(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE).replace(
    /\D/g,
    ""
  ),
  publicBaseUrl: safeText(
    process.env.CANONICAL_BASE_URL ||
      process.env.SITEMAP_BASE_URL ||
      process.env.SITE_URL,
    DEFAULT_PUBLIC_BASE_URL
  ),
});

export const hasWhatsAppCloudApiConfig = () => {
  const config = getWhatsAppCloudConfig();
  return Boolean(config.accessToken && config.phoneNumberId);
};

const normalizeRecipientPhone = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    const defaultCountryCode = getWhatsAppCloudConfig().defaultCountryCode;
    if (defaultCountryCode) {
      digits = `${defaultCountryCode}${digits.slice(1)}`;
    }
  }

  return digits.length >= 8 ? digits : "";
};

const toAbsoluteUrl = (value) => {
  const raw = safeText(value);
  if (!raw) return "";

  try {
    return new URL(raw).toString();
  } catch (_error) {
    try {
      return new URL(raw, getWhatsAppCloudConfig().publicBaseUrl).toString();
    } catch (_innerError) {
      return "";
    }
  }
};

const slugifyFilename = (value, fallback = "project-brochure") => {
  const normalized = safeText(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
};

const buildSummaryText = ({
  locale = "en",
  lead = {},
  recommendations = [],
} = {}) => {
  const selectedLocale = normalizeLocale(locale);
  const copy = localizedCopy[selectedLocale];
  const fullName = safeText(lead.fullName, "there");
  const introLine = copy.intro.replace("{{name}}", fullName);

  const optionLines = recommendations.slice(0, MAX_MEDIA_ITEMS).map((item, index) => {
    const title = safeText(item.title, "Project");
    const price =
      Number(item.price_usd) > 0 ? ` - $${Number(item.price_usd).toLocaleString()}` : "";
    const url = toAbsoluteUrl(item.detail_url || item.detailUrl);
    return copy.option
      .replace("{{index}}", String(index + 1))
      .replace("{{title}}", title)
      .replace("{{price}}", price)
      .replace("{{url}}", url ? ` - ${url}` : "");
  });

  return [introLine, ...optionLines].filter(Boolean).join("\n");
};

const buildMediaQueue = (recommendations = []) =>
  recommendations.slice(0, MAX_MEDIA_ITEMS).flatMap((item, index) => {
    const title = safeText(item.title, `Project ${index + 1}`);
    const brochureUrl = toAbsoluteUrl(
      item.brochure_url ||
        item.brochureUrl ||
        item.document_url ||
        item.documentUrl ||
        item.pdf ||
        item.pdfUrl
    );
    const imageUrl = toAbsoluteUrl(item.image_url || item.imageUrl);

    if (brochureUrl) {
      return [
        {
          type: "document",
          title,
          payload: {
            messaging_product: "whatsapp",
            type: "document",
            document: {
              link: brochureUrl,
              filename: `${slugifyFilename(title)}.pdf`,
            },
          },
        },
      ];
    }

    if (imageUrl) {
      return [
        {
          type: "image",
          title,
          payload: {
            messaging_product: "whatsapp",
            type: "image",
            image: {
              link: imageUrl,
              caption: safeText(title),
            },
          },
        },
      ];
    }

    return [];
  });

const sendGraphMessage = async ({
  accessToken,
  phoneNumberId,
  apiVersion,
  to,
  payload,
} = {}) => {
  const response = await fetch(
    `${GRAPH_API_BASE_URL}/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        to,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      safeText(data?.error?.message) ||
      safeText(data?.message) ||
      `whatsapp_http_${response.status}`;
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return {
    messageId: safeText(data?.messages?.[0]?.id),
    waId: safeText(data?.contacts?.[0]?.wa_id),
    raw: data,
  };
};

export const sendLeadPackageToWhatsApp = async ({
  lead = {},
  recommendations = [],
  locale = "en",
} = {}) => {
  const config = getWhatsAppCloudConfig();
  if (!config.accessToken || !config.phoneNumberId) {
    return {
      attempted: false,
      sent: false,
      reason: "cloud_api_not_configured",
      messages: [],
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
    };
  }

  const to = normalizeRecipientPhone(lead.phone);
  if (!to) {
    return {
      attempted: false,
      sent: false,
      reason: "missing_recipient_phone",
      messages: [],
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
    };
  }

  const results = [];
  const summaryText = buildSummaryText({
    locale,
    lead,
    recommendations,
  });

  try {
    const summaryResult = await sendGraphMessage({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
      apiVersion: config.apiVersion,
      to,
      payload: {
        messaging_product: "whatsapp",
        type: "text",
        text: {
          preview_url: true,
          body: summaryText,
        },
      },
    });

    results.push({
      type: "text",
      success: true,
      messageId: summaryResult.messageId,
    });
  } catch (error) {
    console.error("WhatsApp Cloud API text send failed:", error?.details || error);
    return {
      attempted: true,
      sent: false,
      reason: safeText(error?.message, "whatsapp_send_failed"),
      messages: results,
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
    };
  }

  const mediaQueue = buildMediaQueue(recommendations);
  for (const mediaItem of mediaQueue) {
    try {
      const mediaResult = await sendGraphMessage({
        accessToken: config.accessToken,
        phoneNumberId: config.phoneNumberId,
        apiVersion: config.apiVersion,
        to,
        payload: mediaItem.payload,
      });

      results.push({
        type: mediaItem.type,
        title: mediaItem.title,
        success: true,
        messageId: mediaResult.messageId,
      });
    } catch (error) {
      console.error("WhatsApp Cloud API media send failed:", error?.details || error);
      results.push({
        type: mediaItem.type,
        title: mediaItem.title,
        success: false,
        reason: safeText(error?.message, "whatsapp_media_send_failed"),
      });
    }
  }

  return {
    attempted: true,
    sent: results.some((item) => item.success),
    mediaSent: results.filter((item) => item.type !== "text" && item.success).length,
    reason: results.some((item) => item.success) ? "" : "whatsapp_send_failed",
    messages: results,
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
  };
};
