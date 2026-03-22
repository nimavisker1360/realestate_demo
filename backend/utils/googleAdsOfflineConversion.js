import {
  normalizeLeadDateValue,
  normalizeLeadSource,
  normalizeLeadStatus,
  normalizeLeadString,
} from "./leadAttribution.js";

const DEFAULT_GOOGLE_ADS_API_VERSION = "v22";
const CLICK_IDENTIFIER_KEYS = ["gclid", "gbraid", "wbraid"];

const normalizeGoogleAdsCustomerId = (value) => {
  const normalized = normalizeLeadString(value);
  if (!normalized) return null;

  const digitsOnly = normalized.replace(/\D+/g, "");
  return digitsOnly || null;
};

const normalizeConversionAction = (value, customerId) => {
  const normalized = normalizeLeadString(value);
  if (!normalized) return null;

  if (normalized.startsWith("customers/")) {
    const resourceMatch = normalized.match(
      /^customers\/([^/]+)\/conversionActions\/([^/]+)$/i
    );
    if (!resourceMatch) {
      return normalized;
    }

    const normalizedCustomerId = resourceMatch[1].replace(/\D+/g, "");
    const normalizedActionId = resourceMatch[2].replace(/\D+/g, "");

    if (!normalizedCustomerId || !normalizedActionId) {
      return null;
    }

    return `customers/${normalizedCustomerId}/conversionActions/${normalizedActionId}`;
  }

  const actionId = normalized.replace(/\D+/g, "");
  if (!actionId || !customerId) {
    return null;
  }

  return `customers/${customerId}/conversionActions/${actionId}`;
};

const normalizeNumericConfig = (value) => {
  const normalized = normalizeLeadString(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const padDatePart = (value) => String(value).padStart(2, "0");

export const formatGoogleAdsDateTime = (value, fallback = null) => {
  const dateValue = normalizeLeadDateValue(value, null);
  if (!dateValue) return fallback;

  return (
    `${dateValue.getUTCFullYear()}-` +
    `${padDatePart(dateValue.getUTCMonth() + 1)}-` +
    `${padDatePart(dateValue.getUTCDate())} ` +
    `${padDatePart(dateValue.getUTCHours())}:` +
    `${padDatePart(dateValue.getUTCMinutes())}:` +
    `${padDatePart(dateValue.getUTCSeconds())}+00:00`
  );
};

const buildClickIdentifiers = (lead = {}) => ({
  gclid: normalizeLeadString(lead.gclid),
  gbraid: normalizeLeadString(lead.gbraid),
  wbraid: normalizeLeadString(lead.wbraid),
});

const selectClickIdentifier = (clickIdentifiers = {}) => {
  for (const key of CLICK_IDENTIFIER_KEYS) {
    const value = normalizeLeadString(clickIdentifiers[key]);
    if (value) {
      return { type: key, value };
    }
  }

  return null;
};

export const getGoogleAdsQualifiedLeadUploadConfig = () => {
  const customerId = normalizeGoogleAdsCustomerId(
    process.env.GOOGLE_ADS_CUSTOMER_ID
  );
  const rawConversionAction = normalizeLeadString(
    process.env.GOOGLE_ADS_QUALIFIED_LEAD_CONVERSION_ACTION
  );
  const conversionValue = normalizeNumericConfig(
    process.env.GOOGLE_ADS_QUALIFIED_LEAD_CONVERSION_VALUE
  );

  return {
    apiVersion:
      normalizeLeadString(process.env.GOOGLE_ADS_API_VERSION) ||
      DEFAULT_GOOGLE_ADS_API_VERSION,
    developerToken: normalizeLeadString(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
    clientId: normalizeLeadString(process.env.GOOGLE_ADS_CLIENT_ID),
    clientSecret: normalizeLeadString(process.env.GOOGLE_ADS_CLIENT_SECRET),
    refreshToken: normalizeLeadString(process.env.GOOGLE_ADS_REFRESH_TOKEN),
    customerId,
    loginCustomerId: normalizeGoogleAdsCustomerId(
      process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
    ),
    rawConversionAction,
    conversionAction: normalizeConversionAction(rawConversionAction, customerId),
    conversionValue,
    currencyCode:
      normalizeLeadString(process.env.GOOGLE_ADS_QUALIFIED_LEAD_CURRENCY_CODE)?.toUpperCase() ||
      null,
  };
};

export const buildQualifiedLeadConversionPayload = (lead = {}) => {
  const submittedAt = normalizeLeadDateValue(
    lead.submittedAt || lead.submitted_at || lead.createdAt || lead.created_at,
    null
  );
  const qualifiedAt = normalizeLeadDateValue(
    lead.qualifiedAt || lead.qualified_at,
    null
  );
  const googleAdsConfig = getGoogleAdsQualifiedLeadUploadConfig();
  const clickIdentifiers = buildClickIdentifiers(lead);
  const clickIdentifier = selectClickIdentifier(clickIdentifiers);
  const conversionDateTime = formatGoogleAdsDateTime(
    qualifiedAt || submittedAt,
    null
  );
  const orderId = normalizeLeadString(lead.id || lead._id);
  const clickConversion =
    googleAdsConfig.conversionAction &&
    conversionDateTime &&
    orderId &&
    clickIdentifier
      ? {
          conversionAction: googleAdsConfig.conversionAction,
          conversionDateTime,
          orderId,
          conversionEnvironment: "WEB",
          [clickIdentifier.type]: clickIdentifier.value,
          ...(googleAdsConfig.conversionValue !== null &&
          googleAdsConfig.currencyCode
            ? {
                conversionValue: googleAdsConfig.conversionValue,
                currencyCode: googleAdsConfig.currencyCode,
              }
            : {}),
        }
      : null;

  return {
    apiVersion: googleAdsConfig.apiVersion,
    customerId: googleAdsConfig.customerId,
    loginCustomerId: googleAdsConfig.loginCustomerId,
    conversionAction: googleAdsConfig.conversionAction,
    rawConversionAction: googleAdsConfig.rawConversionAction,
    conversionDateTime,
    orderId,
    clickIdentifier,
    clickIdentifiers,
    clickConversion,
    userIdentifiers: {
      email: normalizeLeadString(lead.email),
      phoneNumber: normalizeLeadString(lead.phone),
    },
    leadMetadata: {
      leadId: normalizeLeadString(lead.id || lead._id),
      leadStatus: normalizeLeadStatus(lead.leadStatus || lead.lead_status),
      leadSource: normalizeLeadSource(
        lead.leadSource || lead.lead_source || lead.source
      ),
      submittedAt: submittedAt?.toISOString() || null,
      landingPage: normalizeLeadString(
        lead.landingPage || lead.landing_page
      ),
      referrer: normalizeLeadString(lead.referrer),
      utmSource: normalizeLeadString(lead.utmSource || lead.utm_source),
      utmMedium: normalizeLeadString(lead.utmMedium || lead.utm_medium),
      utmCampaign: normalizeLeadString(
        lead.utmCampaign || lead.utm_campaign
      ),
      utmTerm: normalizeLeadString(lead.utmTerm || lead.utm_term),
      utmContent: normalizeLeadString(lead.utmContent || lead.utm_content),
    },
  };
};
