import { prisma } from "../config/prismaConfig.js";
import {
  buildQualifiedLeadConversionPayload,
  getGoogleAdsQualifiedLeadUploadConfig,
} from "../utils/googleAdsOfflineConversion.js";
import {
  normalizeLeadDateValue,
  normalizeLeadString,
} from "../utils/leadAttribution.js";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API_BASE_URL = "https://googleads.googleapis.com";
const MAX_STORED_ERROR_LENGTH = 300;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const DUPLICATE_ERROR_CODES = new Set([
  "CLICK_CONVERSION_ALREADY_EXISTS",
  "DUPLICATE_CLICK_CONVERSION_IN_REQUEST",
  "ORDER_ID_ALREADY_IN_USE",
]);

const truncateValue = (value, maxLength = MAX_STORED_ERROR_LENGTH) => {
  const normalized = normalizeLeadString(value);
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
};

const getLeadId = (lead = {}) => normalizeLeadString(lead.id || lead._id);

const getMissingConfigKeys = (config = {}) => {
  const missingKeys = [];

  if (!config.developerToken) {
    missingKeys.push("GOOGLE_ADS_DEVELOPER_TOKEN");
  }
  if (!config.clientId) {
    missingKeys.push("GOOGLE_ADS_CLIENT_ID");
  }
  if (!config.clientSecret) {
    missingKeys.push("GOOGLE_ADS_CLIENT_SECRET");
  }
  if (!config.refreshToken) {
    missingKeys.push("GOOGLE_ADS_REFRESH_TOKEN");
  }
  if (!config.customerId) {
    missingKeys.push("GOOGLE_ADS_CUSTOMER_ID");
  }
  if (!config.rawConversionAction || !config.conversionAction) {
    missingKeys.push("GOOGLE_ADS_QUALIFIED_LEAD_CONVERSION_ACTION");
  }

  return [...new Set(missingKeys)];
};

const extractErrorCodes = (value, codes = new Set()) => {
  if (!value) return [...codes];

  if (Array.isArray(value)) {
    for (const item of value) {
      extractErrorCodes(item, codes);
    }
    return [...codes];
  }

  if (typeof value === "object") {
    for (const nestedValue of Object.values(value)) {
      extractErrorCodes(nestedValue, codes);
    }
    return [...codes];
  }

  const normalized = normalizeLeadString(value);
  if (normalized) {
    codes.add(normalized);
  }

  return [...codes];
};

const extractGoogleAdsErrors = (value) => {
  const collectedErrors = [];

  const visit = (currentValue) => {
    if (!currentValue) return;

    if (Array.isArray(currentValue)) {
      for (const item of currentValue) {
        visit(item);
      }
      return;
    }

    if (typeof currentValue !== "object") {
      return;
    }

    const message = normalizeLeadString(currentValue.message);
    const codes = extractErrorCodes(currentValue.errorCode);
    if (message || codes.length > 0) {
      collectedErrors.push({ message, codes });
    }

    for (const nestedValue of Object.values(currentValue)) {
      visit(nestedValue);
    }
  };

  visit(value);

  return collectedErrors.filter((error, index, errors) => {
    const fingerprint = `${error.message || ""}|${error.codes.join(",")}`;
    return (
      errors.findIndex(
        (candidate) =>
          `${candidate.message || ""}|${candidate.codes.join(",")}` === fingerprint
      ) === index
    );
  });
};

const isDuplicateQualifiedUploadError = (errors = []) =>
  errors.some(({ message, codes }) => {
    if (codes.some((code) => DUPLICATE_ERROR_CODES.has(code))) {
      return true;
    }

    return /already exists|duplicate|order id.+in use/i.test(message || "");
  });

const buildStoredErrorMessage = (errors = [], fallbackMessage = null) => {
  const firstError = errors[0];
  const errorCode = firstError?.codes?.[0] || null;
  const errorMessage = firstError?.message || fallbackMessage;
  return truncateValue(
    [errorCode, errorMessage].filter(Boolean).join(": ") || fallbackMessage
  );
};

const parseResponseBody = async (response) => {
  const responseText = await response.text();
  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    return { rawText: responseText };
  }
};

const buildUploadEndpointUrl = ({ apiVersion, customerId }) =>
  `${GOOGLE_ADS_API_BASE_URL}/${apiVersion}/customers/${customerId}:uploadClickConversions`;

const getRequestTimeoutMs = () => {
  const configuredTimeout = Number(
    normalizeLeadString(process.env.GOOGLE_ADS_REQUEST_TIMEOUT_MS)
  );

  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_REQUEST_TIMEOUT_MS;
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getRequestTimeoutMs());

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const updateLeadUploadState = async (leadId, data = {}) => {
  const normalizedLeadId = normalizeLeadString(leadId);
  if (!normalizedLeadId) return;

  const updateData = {};

  if (Object.prototype.hasOwnProperty.call(data, "googleAdsQualifiedUploadedAt")) {
    updateData.googleAdsQualifiedUploadedAt =
      data.googleAdsQualifiedUploadedAt || null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "googleAdsQualifiedRequestId")) {
    updateData.googleAdsQualifiedRequestId = truncateValue(
      data.googleAdsQualifiedRequestId,
      120
    );
  }
  if (Object.prototype.hasOwnProperty.call(data, "googleAdsQualifiedJobId")) {
    updateData.googleAdsQualifiedJobId = truncateValue(
      data.googleAdsQualifiedJobId,
      120
    );
  }
  if (Object.prototype.hasOwnProperty.call(data, "googleAdsQualifiedUploadError")) {
    updateData.googleAdsQualifiedUploadError = truncateValue(
      data.googleAdsQualifiedUploadError
    );
  }

  if (Object.keys(updateData).length === 0) {
    return;
  }

  try {
    await prisma.contactMessage.update({
      where: { id: normalizedLeadId },
      data: updateData,
    });
  } catch (error) {
    console.error(
      `[Google Ads] Failed to persist qualified upload state for lead ${normalizedLeadId}: ${
        error?.message || "unknown persistence error"
      }`
    );
  }
};

const fetchGoogleAdsAccessToken = async (config) => {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is unavailable in the current Node runtime.");
  }

  const response = await fetchWithTimeout(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await parseResponseBody(response);
  if (!response.ok || !normalizeLeadString(data?.access_token)) {
    throw new Error(
      buildStoredErrorMessage(
        extractGoogleAdsErrors(data),
        `OAuth token request failed (${response.status})`
      ) || "OAuth token request failed"
    );
  }

  return data.access_token;
};

const buildRequestHeaders = (config, accessToken) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "developer-token": config.developerToken,
  };

  if (config.loginCustomerId) {
    headers["login-customer-id"] = config.loginCustomerId;
  }

  return headers;
};

export const uploadQualifiedLeadConversion = async ({
  lead,
  transitionAt = new Date(),
} = {}) => {
  const leadId = getLeadId(lead);
  const alreadyUploadedAt = normalizeLeadDateValue(
    lead?.googleAdsQualifiedUploadedAt || lead?.google_ads_qualified_uploaded_at,
    null
  );
  const payload = buildQualifiedLeadConversionPayload({
    ...lead,
    qualifiedAt: transitionAt,
  });
  const config = getGoogleAdsQualifiedLeadUploadConfig();

  if (!leadId) {
    return {
      uploaded: false,
      skipped: true,
      reason: "missing_lead_id",
      payload,
    };
  }

  if (alreadyUploadedAt) {
    return {
      uploaded: false,
      skipped: true,
      reason: "already_uploaded",
      payload,
    };
  }

  const missingConfigKeys = getMissingConfigKeys(config);
  if (missingConfigKeys.length > 0) {
    const errorMessage = truncateValue(
      `Missing Google Ads config: ${missingConfigKeys.join(", ")}`
    );

    console.error(
      `[Google Ads] Qualified lead upload skipped for lead ${leadId}: ${errorMessage}`
    );
    await updateLeadUploadState(leadId, {
      googleAdsQualifiedUploadError: errorMessage,
    });

    return {
      uploaded: false,
      skipped: true,
      reason: "missing_config",
      missingConfigKeys,
      payload,
    };
  }

  if (!payload.clickIdentifier || !payload.clickConversion) {
    const errorMessage = "Missing supported Google Ads click identifier.";

    console.error(
      `[Google Ads] Qualified lead upload skipped for lead ${leadId}: ${errorMessage}`
    );
    await updateLeadUploadState(leadId, {
      googleAdsQualifiedUploadError: errorMessage,
    });

    return {
      uploaded: false,
      skipped: true,
      reason: "missing_click_identifier",
      payload,
    };
  }

  try {
    const accessToken = await fetchGoogleAdsAccessToken(config);
    const response = await fetchWithTimeout(
      buildUploadEndpointUrl({
        apiVersion: config.apiVersion,
        customerId: config.customerId,
      }),
      {
        method: "POST",
        headers: buildRequestHeaders(config, accessToken),
        body: JSON.stringify({
          conversions: [payload.clickConversion],
          partialFailure: true,
          validateOnly: false,
        }),
      }
    );
    const requestId = normalizeLeadString(response.headers.get("request-id"));
    const responseBody = await parseResponseBody(response);
    const googleAdsErrors = extractGoogleAdsErrors(
      responseBody?.partialFailureError || responseBody?.error || responseBody
    );
    const duplicateError = isDuplicateQualifiedUploadError(googleAdsErrors);
    const jobId = truncateValue(responseBody?.jobId, 120);

    if (!response.ok) {
      const errorMessage =
        buildStoredErrorMessage(
          googleAdsErrors,
          `Upload request failed (${response.status})`
        ) || `Upload request failed (${response.status})`;

      console.error(
        `[Google Ads] Qualified lead upload failed for lead ${leadId}: ${errorMessage}`
      );
      await updateLeadUploadState(leadId, {
        googleAdsQualifiedRequestId: requestId,
        googleAdsQualifiedJobId: jobId,
        googleAdsQualifiedUploadError: errorMessage,
      });

      return {
        uploaded: false,
        skipped: false,
        reason: "request_failed",
        payload,
      };
    }

    if (googleAdsErrors.length > 0 && !duplicateError) {
      const errorMessage =
        buildStoredErrorMessage(googleAdsErrors, "Partial failure") ||
        "Partial failure";

      console.error(
        `[Google Ads] Qualified lead upload failed for lead ${leadId}: ${errorMessage}`
      );
      await updateLeadUploadState(leadId, {
        googleAdsQualifiedRequestId: requestId,
        googleAdsQualifiedJobId: jobId,
        googleAdsQualifiedUploadError: errorMessage,
      });

      return {
        uploaded: false,
        skipped: false,
        reason: "partial_failure",
        payload,
      };
    }

    if (duplicateError) {
      console.warn(
        `[Google Ads] Qualified lead upload for lead ${leadId} already exists. Treating duplicate response as success.`
      );
    }

    await updateLeadUploadState(leadId, {
      googleAdsQualifiedUploadedAt: transitionAt,
      googleAdsQualifiedRequestId: requestId,
      googleAdsQualifiedJobId: jobId,
      googleAdsQualifiedUploadError: null,
    });

    return {
      uploaded: true,
      skipped: false,
      reason: duplicateError ? "already_uploaded_in_google_ads" : "uploaded",
      payload,
    };
  } catch (error) {
    const errorMessage =
      truncateValue(error?.message) || "Unexpected Google Ads upload error";

    console.error(
      `[Google Ads] Qualified lead upload failed for lead ${leadId}: ${errorMessage}`
    );
    await updateLeadUploadState(leadId, {
      googleAdsQualifiedUploadError: errorMessage,
    });

    return {
      uploaded: false,
      skipped: false,
      reason: "unexpected_error",
      payload,
    };
  }
};
