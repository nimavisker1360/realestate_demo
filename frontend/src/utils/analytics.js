const GOOGLE_ADS_WHATSAPP_SEND_TO = "AW-536343459/GSI2CNrpzYYcEKPn3_8B";
const GOOGLE_ADS_FORM_SUBMIT_SEND_TO = String(
  import.meta.env.VITE_GOOGLE_ADS_FORM_SUBMIT_SEND_TO || ""
).trim();
const WHATSAPP_EVENT_FLAG = "__hbWhatsAppConversionTracked";
const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com"]);
const trackedGoogleAdsConversionKeys = new Set();

export const isWhatsAppUrl = (value = "") => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return false;

  if (/^whatsapp:\/\//i.test(rawValue)) {
    return true;
  }

  const normalizedValue = rawValue.startsWith("//")
    ? `https:${rawValue}`
    : rawValue;

  try {
    const baseUrl =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://www.hbrealstate.com";
    const parsedUrl = new URL(normalizedValue, baseUrl);

    return (
      parsedUrl.protocol === "whatsapp:" ||
      WHATSAPP_HOSTS.has(parsedUrl.hostname.toLowerCase())
    );
  } catch {
    return /^(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com)\//i.test(rawValue);
  }
};

export const getWhatsAppTrackingUrl = (target) => {
  if (!target || typeof target.closest !== "function") return "";

  const trackedElement = target.closest('[data-whatsapp-url], a[href]');
  if (!trackedElement) return "";

  const candidateUrl =
    trackedElement.getAttribute("data-whatsapp-url") ||
    trackedElement.getAttribute("href") ||
    "";

  return isWhatsAppUrl(candidateUrl) ? candidateUrl : "";
};

export function trackWhatsAppConversion(event) {
  try {
    const nativeEvent = event?.nativeEvent || event;
    if (nativeEvent && typeof nativeEvent === "object") {
      if (nativeEvent[WHATSAPP_EVENT_FLAG]) return false;
      nativeEvent[WHATSAPP_EVENT_FLAG] = true;
    }

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: GOOGLE_ADS_WHATSAPP_SEND_TO,
      });
      return true;
    }
  } catch {
    // Fail silently so the WhatsApp CTA still works if tracking is unavailable.
  }

  return false;
}

export function trackGoogleAdsConversion(sendTo, dedupeKey) {
  try {
    const normalizedSendTo = String(sendTo || "").trim();
    if (!normalizedSendTo) return false;

    const normalizedDedupeKey = String(dedupeKey || "").trim();
    const trackingKey = normalizedDedupeKey
      ? `${normalizedSendTo}:${normalizedDedupeKey}`
      : "";

    if (trackingKey && trackedGoogleAdsConversionKeys.has(trackingKey)) {
      return false;
    }

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: normalizedSendTo,
      });

      if (trackingKey) {
        trackedGoogleAdsConversionKeys.add(trackingKey);
      }
      return true;
    }
  } catch {
    // Fail silently so form submits are unaffected if tracking is unavailable.
  }

  return false;
}

export function trackFormSubmitConversion(submissionId) {
  // Set VITE_GOOGLE_ADS_FORM_SUBMIT_SEND_TO to the real Google Ads form-submit send_to value.
  return trackGoogleAdsConversion(
    GOOGLE_ADS_FORM_SUBMIT_SEND_TO,
    submissionId
  );
}

export const trackWhatsAppConversionFromClick = (event) => {
  const whatsappUrl = getWhatsAppTrackingUrl(event?.target);
  if (!whatsappUrl) return false;
  return trackWhatsAppConversion(event);
};
