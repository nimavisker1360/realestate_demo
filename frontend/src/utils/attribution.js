const ATTRIBUTION_STORAGE_KEY = "__hbLeadAttribution";
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const ATTRIBUTION_KEYS = [
  "gclid",
  "gbraid",
  "wbraid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "landing_page",
  "referrer",
];

const EMPTY_ATTRIBUTION = Object.freeze(
  ATTRIBUTION_KEYS.reduce((accumulator, key) => {
    accumulator[key] = null;
    return accumulator;
  }, {})
);

const normalizeString = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const getBaseOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "https://demo.example";
};

const getCurrentLocationHref = () => {
  if (typeof window === "undefined" || !window.location?.href) {
    return "";
  }

  return String(window.location.href);
};

const getCurrentReferrer = () => {
  if (typeof document === "undefined" || !document.referrer) {
    return "";
  }

  return String(document.referrer);
};

const pickAttributionFields = (source = {}) =>
  ATTRIBUTION_KEYS.reduce((accumulator, key) => {
    accumulator[key] = normalizeString(source?.[key]);
    return accumulator;
  }, {});

const extractAttributionFromUrl = (urlValue = "") => {
  const normalizedUrl = normalizeString(urlValue);
  if (!normalizedUrl) {
    return { ...EMPTY_ATTRIBUTION };
  }

  try {
    const parsedUrl = new URL(normalizedUrl, getBaseOrigin());
    const searchParams = parsedUrl.searchParams;
    const landingPage = `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`;

    return {
      gclid: normalizeString(searchParams.get("gclid")),
      gbraid: normalizeString(searchParams.get("gbraid")),
      wbraid: normalizeString(searchParams.get("wbraid")),
      utm_source: normalizeString(searchParams.get("utm_source")),
      utm_medium: normalizeString(searchParams.get("utm_medium")),
      utm_campaign: normalizeString(searchParams.get("utm_campaign")),
      utm_term: normalizeString(searchParams.get("utm_term")),
      utm_content: normalizeString(searchParams.get("utm_content")),
      fbclid: normalizeString(searchParams.get("fbclid")),
      landing_page: normalizeString(landingPage),
      referrer: null,
    };
  } catch {
    return {
      ...EMPTY_ATTRIBUTION,
      landing_page: normalizedUrl,
    };
  }
};

const mergeAttributionData = (existing = EMPTY_ATTRIBUTION, incoming = EMPTY_ATTRIBUTION) =>
  ATTRIBUTION_KEYS.reduce((accumulator, key) => {
    const existingValue = normalizeString(existing?.[key]);
    const incomingValue = normalizeString(incoming?.[key]);

    accumulator[key] = existingValue || incomingValue || null;
    return accumulator;
  }, {});

const removeStoredAttribution = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
  } catch {
    // Ignore storage errors so attribution capture never blocks UX.
  }
};

const readStoredAttributionRecord = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    const rawValue = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object") {
      removeStoredAttribution();
      return null;
    }

    const expiresAt = Number(parsedValue.expiresAt) || 0;
    if (expiresAt <= Date.now()) {
      removeStoredAttribution();
      return null;
    }

    return {
      data: pickAttributionFields(parsedValue.data),
      capturedAt: Number(parsedValue.capturedAt) || Date.now(),
      expiresAt,
    };
  } catch {
    removeStoredAttribution();
    return null;
  }
};

const writeStoredAttributionRecord = (data, capturedAt = Date.now()) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    window.localStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify({
        data: pickAttributionFields(data),
        capturedAt,
        expiresAt: Date.now() + ATTRIBUTION_TTL_MS,
      })
    );
  } catch {
    // Ignore storage errors so attribution capture never blocks UX.
  }
};

const normalizeExtraFields = (extraFields = {}) =>
  Object.entries(extraFields || {}).reduce((accumulator, [key, value]) => {
    if (value === undefined) return accumulator;
    accumulator[key] = normalizeString(value);
    return accumulator;
  }, {});

export const captureAttributionParams = ({
  url = getCurrentLocationHref(),
  referrer = getCurrentReferrer(),
} = {}) => {
  const storedRecord = readStoredAttributionRecord();
  const incomingData = {
    ...extractAttributionFromUrl(url),
    referrer: normalizeString(referrer),
  };
  const mergedData = mergeAttributionData(storedRecord?.data, incomingData);

  writeStoredAttributionRecord(mergedData, storedRecord?.capturedAt || Date.now());
  return mergedData;
};

export const getStoredAttributionData = () => {
  const storedRecord = readStoredAttributionRecord();
  if (storedRecord?.data) {
    return storedRecord.data;
  }

  return {
    ...extractAttributionFromUrl(getCurrentLocationHref()),
    referrer: normalizeString(getCurrentReferrer()),
  };
};

export const buildLeadAttributionPayload = (extraFields = {}) => ({
  attribution: {
    ...captureAttributionParams(),
    ...normalizeExtraFields(extraFields),
  },
});
