export const LEAD_STATUS_VALUES = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
];

const LEAD_STATUS_SET = new Set(LEAD_STATUS_VALUES);

const ATTRIBUTION_FIELD_ALIASES = {
  gclid: ["gclid"],
  gbraid: ["gbraid"],
  wbraid: ["wbraid"],
  utmSource: ["utmSource", "utm_source"],
  utmMedium: ["utmMedium", "utm_medium"],
  utmCampaign: ["utmCampaign", "utm_campaign"],
  utmTerm: ["utmTerm", "utm_term"],
  utmContent: ["utmContent", "utm_content"],
  fbclid: ["fbclid"],
  landingPage: ["landingPage", "landing_page"],
  referrer: ["referrer"],
  leadStatus: ["leadStatus", "lead_status"],
  leadSource: ["leadSource", "lead_source", "source"],
  submittedAt: ["submittedAt", "submitted_at"],
};

const isRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeLeadString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const getFirstAliasValue = (source, aliases = []) => {
  if (!isRecord(source)) return undefined;

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(source, alias)) {
      return source[alias];
    }
  }

  return undefined;
};

export const normalizeLeadStatus = (value, fallback = null) => {
  const normalized = normalizeLeadString(value);
  if (!normalized) return fallback;

  const lowered = normalized.toLowerCase();
  return LEAD_STATUS_SET.has(lowered) ? lowered : fallback;
};

export const normalizeLeadSource = (value, fallback = null) => {
  const normalized = normalizeLeadString(value);
  if (!normalized) return fallback;

  return normalized.toLowerCase().replace(/\s+/g, "_");
};

export const normalizeLeadDateValue = (value, fallback = null) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const normalized = normalizeLeadString(value);
  if (!normalized) return fallback;

  const parsedDate = new Date(normalized);
  return Number.isNaN(parsedDate.getTime()) ? fallback : parsedDate;
};

export const extractLeadAttribution = (
  input,
  {
    defaultLeadStatus = "new",
    defaultLeadSource = "form",
    defaultSubmittedAt = new Date(),
  } = {}
) => {
  const requestBody = isRecord(input?.body) ? input.body : isRecord(input) ? input : {};
  const nestedAttribution = isRecord(requestBody.attribution)
    ? requestBody.attribution
    : {};
  const source = {
    ...requestBody,
    ...nestedAttribution,
  };

  return {
    gclid: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.gclid)
    ),
    gbraid: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.gbraid)
    ),
    wbraid: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.wbraid)
    ),
    utmSource: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.utmSource)
    ),
    utmMedium: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.utmMedium)
    ),
    utmCampaign: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.utmCampaign)
    ),
    utmTerm: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.utmTerm)
    ),
    utmContent: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.utmContent)
    ),
    fbclid: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.fbclid)
    ),
    landingPage: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.landingPage)
    ),
    referrer: normalizeLeadString(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.referrer)
    ),
    leadStatus: normalizeLeadStatus(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.leadStatus),
      defaultLeadStatus
    ),
    leadSource: normalizeLeadSource(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.leadSource),
      defaultLeadSource
    ),
    submittedAt: normalizeLeadDateValue(
      getFirstAliasValue(source, ATTRIBUTION_FIELD_ALIASES.submittedAt),
      defaultSubmittedAt
    ),
  };
};
