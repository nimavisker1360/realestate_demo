import OpenAI from "openai";
import { toFile } from "openai";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../config/prismaConfig.js";
import { extractLeadAttribution } from "../utils/leadAttribution.js";

let openaiClient = null;

const FALLBACK_MESSAGES = {
  en: {
    noData: "I don't have that information in the system right now.",
    noMatch: "No matching records were found in the current system data.",
    found: "I found matching records in the system.",
    leadPrompt:
      "To proceed, please share your name, country, WhatsApp or email, and budget range.",
  },
  tr: {
    noData: "Bu bilgi su anda sistemde mevcut degil.",
    noMatch: "Mevcut sistem verisinde eslesen bir kayit bulunamadi.",
    found: "Sistemde eslesen kayitlar bulundu.",
    leadPrompt:
      "Ilerlemek icin lutfen adinizi, ulkenizi, WhatsApp veya e-posta bilginizi ve butce araliginizi paylasin.",
  },
  ru: {
    noData: "Seychas v sisteme net etoy informatsii.",
    noMatch: "V tekushchikh dannykh sistemy net podkhodyashchikh zapisey.",
    found: "V sisteme naydeny podkhodyashchie dannye.",
    leadPrompt:
      "Dlya prodolzheniya ukazhite, pozhaluysta, imya, stranu, WhatsApp ili email i byudzhetnyy diapazon.",
  },
};

const TOOL_NAMES = {
  searchProperties: "searchProperties",
  getPropertyById: "getPropertyById",
  searchConsultants: "searchConsultants",
  searchBlogs: "searchBlogs",
  createLead: "createLead",
};

const PROJECT_PROPERTY_TYPES = new Set(["local-project", "international-project"]);
const SUPPORTED_BUDGET_CURRENCIES = new Set(["USD", "TRY", "EUR"]);

const ISTANBUL_EUROPEAN_DISTRICTS = [
  "Arnavutköy", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy",
  "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beylikdüzü", "Beyoğlu",
  "Büyükçekmece", "Çatalca", "Esenler", "Esenyurt", "Eyüpsultan",
  "Fatih", "Gaziosmanpaşa", "Güngören", "Kağıthane", "Küçükçekmece",
  "Sarıyer", "Silivri", "Sultangazi", "Şişli", "Zeytinburnu",
];

const ISTANBUL_ASIAN_DISTRICTS = [
  "Adalar", "Ataşehir", "Beykoz", "Çekmeköy", "Kadıköy",
  "Kartal", "Maltepe", "Pendik", "Sancaktepe", "Sultanbeyli",
  "Şile", "Tuzla", "Ümraniye", "Üsküdar",
];

function resolveIstanbulSideDistricts(text = "") {
  const normalized = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  const isEuropean =
    containsAnyPhrase(normalized, [
      "avrupa yakasi", "avrupa",
      "european side", "europe side", "europe part", "european part",
      "european", "europe",
    ]) ||
    /\b(европейская сторона|европейская часть|европейск)\b/u.test(raw);
  const isAsian =
    containsAnyPhrase(normalized, [
      "anadolu yakasi", "anadolu",
      "asian side", "asia side", "asia part", "asian part",
      "asian", "asia",
    ]) ||
    /\b(азиатская сторона|азиатская часть|азиатск)\b/u.test(raw);
  if (isEuropean) return ISTANBUL_EUROPEAN_DISTRICTS;
  if (isAsian) return ISTANBUL_ASIAN_DISTRICTS;
  return null;
}

const readPositiveEnvNumber = (name, fallback) => {
  const parsed = Number(process.env[name]);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

// Exchange assumptions for chat budget filtering (override via backend/.env).
// ASSISTANT_TRY_PER_USD: how many TRY for 1 USD.
// ASSISTANT_USD_PER_EUR: how many USD for 1 EUR.
// ASSISTANT_USD_PER_GBP: how many USD for 1 GBP.
const ASSISTANT_TRY_PER_USD = readPositiveEnvNumber("ASSISTANT_TRY_PER_USD", 36);
const ASSISTANT_USD_PER_EUR = readPositiveEnvNumber("ASSISTANT_USD_PER_EUR", 1.08);
const ASSISTANT_USD_PER_GBP = readPositiveEnvNumber("ASSISTANT_USD_PER_GBP", 1.27);

function toFoldedText(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAnyPhrase(text, phrases = []) {
  const normalized = String(text || "");
  return phrases.some((phrase) => normalized.includes(phrase));
}

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set in environment variables. Please add it to backend/.env."
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function mapTranscriptionLanguage(language = "") {
  const normalized = normalizeString(language).toLowerCase();
  if (normalized.startsWith("tr")) return "tr";
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("en")) return "en";
  return "";
}

function getTranscriptionPrompt(language = "en") {
  if (language === "tr") {
    return "Gayrimenkul konusmasi. Dogru yazim kullan: Istanbul, Bahcesehir, Kozapark, Basaksehir, Esenyurt, Beylikduzu, 1+1, 2+1, USD, EUR, TRY, TL, tapu, taksit, proje, daire, villa.";
  }
  if (language === "ru") {
    return "Tema: nedvizhimost v Turcii. Sokhranyay tochnye nazvaniya: Istanbul, Bahcesehir, Kozapark, Basaksehir, Esenyurt, Beylikduzu, 1+1, 2+1, USD, EUR, TRY, tapu, rassrochka, proekt, kvartira, villa.";
  }
  return "Real-estate conversation. Keep spelling accurate for: Istanbul, Bahcesehir, Kozapark, Basaksehir, Esenyurt, Beylikduzu, 1+1, 2+1, USD, EUR, TRY, title deed, installment, project, apartment, villa.";
}

function mimeTypeToExtension(mimeType = "") {
  const normalized = normalizeString(mimeType).toLowerCase();
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("mp4")) return "mp4";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("m4a")) return "m4a";
  return "webm";
}

function decodeBase64Audio(value = "") {
  const raw = normalizeString(value);
  if (!raw) return Buffer.alloc(0);
  const base64Part = raw.includes(",") ? raw.split(",").pop() : raw;
  return Buffer.from(base64Part || "", "base64");
}

async function createTranscriptionWithFallback(openai, payload) {
  const preferred = process.env.REAL_ESTATE_STT_MODEL || "gpt-4o-transcribe";
  const candidates = [preferred, "gpt-4o-mini-transcribe", "whisper-1"];
  let lastError = null;

  for (const model of candidates) {
    try {
      return await openai.audio.transcriptions.create({
        ...payload,
        model,
      });
    } catch (error) {
      lastError = error;
      const msg = String(error?.message || "").toLowerCase();
      const modelRelated =
        msg.includes("model") || msg.includes("not found") || msg.includes("does not exist");
      if (!modelRelated || model === candidates[candidates.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError;
}

function detectLanguage(text = "") {
  const raw = String(text || "");
  if (!raw) return "en";
  if (/[\u0400-\u04FF]/.test(raw)) return "ru";

  const normalized = toFoldedText(raw);
  if (
    /\b(kvartira|nedvizhimost|rassrochka|stambul|proekt|kupit|byudzhet)\b/.test(normalized)
  ) {
    return "ru";
  }

  const turkishHint =
    /[\u00E7\u011F\u0131\u00F6\u015F\u00FC\u00C7\u011E\u0130\u00D6\u015E\u00DC]/.test(raw) ||
    /\b(merhaba|istanbul|ev|daire|yatirim|taksit|fiyat|odeme|satilik|kredi|butce|emlak|proje)\b/.test(
      normalized
    );

  if (turkishHint) return "tr";
  return "en";
}

function safeJsonParse(value, fallback = null) {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function normalizeNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return fallback;

    const cleaned = raw
      .replace(/[^\d.,\s-]/g, "")
      .replace(/\u00A0/g, " ")
      .trim();
    if (!cleaned) return fallback;

    const compact = cleaned.replace(/\s+/g, "");
    const hasDot = compact.includes(".");
    const hasComma = compact.includes(",");
    let normalized = compact;

    if (hasDot && hasComma) {
      const lastDot = compact.lastIndexOf(".");
      const lastComma = compact.lastIndexOf(",");
      const decimalSeparator = lastDot > lastComma ? "." : ",";
      const thousandSeparator = decimalSeparator === "." ? "," : ".";
      normalized = compact.split(thousandSeparator).join("");
      if (decimalSeparator === ",") {
        normalized = normalized.replace(/,/g, ".");
      }
    } else if (hasDot || hasComma) {
      const separator = hasDot ? "." : ",";
      const chunks = compact.split(separator);
      const looksLikeGroupedThousands =
        chunks.length > 2 || (chunks.length === 2 && chunks[1].length === 3 && chunks[0].length <= 3);

      if (looksLikeGroupedThousands) {
        normalized = chunks.join("");
      } else if (separator === ",") {
        normalized = compact.replace(/,/g, ".");
      }
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : fallback;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(v)) return true;
    if (["false", "0", "no", "n"].includes(v)) return false;
  }
  return fallback;
}

function normalizeCurrencyCode(value) {
  const code = normalizeString(value).toUpperCase();
  return SUPPORTED_BUDGET_CURRENCIES.has(code) ? code : "";
}

function normalizeRoomToken(value = "") {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return "";
  const match = normalized.match(/(\d+)\s*\+\s*(\d+)/);
  if (!match) return "";
  return `${match[1]}+${match[2]}`;
}

function normalizePropertyScope(value = "") {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return "all";

  if (
    [
      "project",
      "projects",
      "proje",
      "projeler",
      "local-project",
      "international-project",
      "project-only",
      "only-projects",
    ].includes(normalized)
  ) {
    return "projects";
  }

  if (
    [
      "listing",
      "listings",
      "ilan",
      "ilanlar",
      "sale",
      "rent",
      "resale",
      "only-listings",
    ].includes(normalized)
  ) {
    return "listings";
  }

  return "all";
}

function extractFloorPlanItems(property = {}) {
  return Array.isArray(property?.dairePlanlari)
    ? property.dairePlanlari.filter((item) => item && typeof item === "object")
    : [];
}

function hasPositiveNumber(value) {
  const n = normalizeNumber(value, NaN);
  return Number.isFinite(n) && n > 0;
}

function collectFloorPlanPrices(property = {}, roomFilter = "") {
  const plans = extractFloorPlanItems(property);
  const targetRoom = normalizeRoomToken(roomFilter);
  const prices = [];

  for (const plan of plans) {
    const planRoom = normalizeRoomToken(plan?.tip || plan?.rooms || plan?.room);
    if (targetRoom && planRoom && planRoom !== targetRoom) continue;
    if (targetRoom && !planRoom) continue;

    if (hasPositiveNumber(plan?.fiyatUSD)) {
      prices.push({ value: normalizeNumber(plan.fiyatUSD, 0), currency: "USD" });
    }
    if (hasPositiveNumber(plan?.fiyatEUR)) {
      prices.push({ value: normalizeNumber(plan.fiyatEUR, 0), currency: "EUR" });
    }
    if (hasPositiveNumber(plan?.fiyatTRY)) {
      prices.push({ value: normalizeNumber(plan.fiyatTRY, 0), currency: "TRY" });
    }

    const legacyPrice = normalizeNumber(plan?.fiyat, NaN);
    if (Number.isFinite(legacyPrice) && legacyPrice > 0) {
      const sourceCurrency = normalizeCurrencyCode(plan?.currency) || normalizeCurrencyCode(property?.currency);
      if (sourceCurrency) {
        prices.push({ value: legacyPrice, currency: sourceCurrency });
      }
    }
  }

  return prices;
}

function getPropertySpecialOffers(property = {}) {
  const offers = [];
  const nestedOffers = Array.isArray(property?.projeHakkinda?.specialOffers)
    ? property.projeHakkinda.specialOffers
    : [];

  for (const offer of nestedOffers) {
    if (offer && typeof offer === "object") {
      offers.push(offer);
    }
  }

  const legacyOffer = property?.projeHakkinda?.specialOffer;
  if (legacyOffer && typeof legacyOffer === "object") {
    offers.push(legacyOffer);
  }

  return offers;
}

function hasSpecialOfferData(specialOffer) {
  const downPayment =
    specialOffer?.downPaymentAmount ?? specialOffer?.downPaymentPercent;

  return Boolean(
    specialOffer &&
      (specialOffer.enabled ||
        normalizeString(specialOffer.title) ||
        normalizeString(specialOffer.roomType) ||
        normalizeNumber(specialOffer.areaM2, 0) > 0 ||
        normalizeNumber(specialOffer.priceGBP, 0) > 0 ||
        normalizeNumber(specialOffer.priceUSD, 0) > 0 ||
        normalizeNumber(downPayment, 0) > 0 ||
        normalizeNumber(specialOffer.installmentMonths, 0) > 0 ||
        normalizeString(specialOffer.locationLabel) ||
        normalizeNumber(specialOffer.locationMinutes, 0) > 0)
  );
}

function collectSpecialOfferPrices(property = {}, roomFilter = "") {
  const targetRoom = normalizeRoomToken(roomFilter);
  const prices = [];

  for (const offer of getPropertySpecialOffers(property)) {
    if (!hasSpecialOfferData(offer)) continue;

    const offerRoom = normalizeRoomToken(offer?.roomType);
    if (targetRoom && (!offerRoom || offerRoom !== targetRoom)) continue;

    if (hasPositiveNumber(offer?.priceGBP)) {
      prices.push({
        value: normalizeNumber(offer.priceGBP, 0),
        currency: "GBP",
      });
    } else if (hasPositiveNumber(offer?.priceUSD)) {
      prices.push({
        value: normalizeNumber(offer.priceUSD, 0),
        currency: "USD",
      });
    }
  }

  return prices;
}

function summarizeSpecialOffers(property = {}) {
  const offers = getPropertySpecialOffers(property).filter((offer) =>
    hasSpecialOfferData(offer)
  );

  let specialOfferInstallmentMonths = 0;
  for (const offer of offers) {
    specialOfferInstallmentMonths = Math.max(
      specialOfferInstallmentMonths,
      normalizeNumber(offer?.installmentMonths, 0)
    );
  }

  return {
    hasSpecialOffer: offers.length > 0,
    specialOfferInstallmentMonths,
  };
}

function propertyMatchesRoomFilter(property = {}, roomFilter = "") {
  const targetRoom = normalizeRoomToken(roomFilter);
  if (!targetRoom) return true;

  const directRoom = normalizeRoomToken(property?.rooms);
  if (directRoom && directRoom === targetRoom) return true;

  const plans = extractFloorPlanItems(property);
  return plans.some((plan) => normalizeRoomToken(plan?.tip || plan?.rooms || plan?.room) === targetRoom);
}

function collectComparablePrices(property = {}, budgetCurrency = "USD", roomFilter = "") {
  const values = [];
  const normalizedBudgetCurrency = normalizeCurrencyCode(budgetCurrency) || "USD";
  const targetRoom = normalizeRoomToken(roomFilter);

  const directPrice = normalizeNumber(property?.price, NaN);
  const directCurrency = normalizeCurrencyCode(property?.currency);
  const directRoom = normalizeRoomToken(property?.rooms);
  const includeDirect =
    !targetRoom || !directRoom || directRoom === targetRoom;

  if (includeDirect && Number.isFinite(directPrice) && directPrice > 0 && directCurrency) {
    const converted = convertPrice(directPrice, directCurrency, normalizedBudgetCurrency);
    if (Number.isFinite(converted)) {
      values.push(converted);
    }
  }

  const specialOfferPrices = collectSpecialOfferPrices(property, targetRoom);
  for (const item of specialOfferPrices) {
    const converted = convertPrice(item.value, item.currency, normalizedBudgetCurrency);
    if (Number.isFinite(converted)) {
      values.push(converted);
    }
  }

  const planPrices = collectFloorPlanPrices(property, targetRoom);
  for (const item of planPrices) {
    const converted = convertPrice(item.value, item.currency, normalizedBudgetCurrency);
    if (Number.isFinite(converted)) {
      values.push(converted);
    }
  }

  return values;
}

function convertPrice(value, fromCurrency, toCurrency) {
  const amount = normalizeNumber(value, NaN);
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (!Number.isFinite(amount) || !from || !to) return NaN;
  if (from === to) return amount;

  let usdValue = NaN;
  if (from === "USD") usdValue = amount;
  if (from === "TRY") usdValue = amount / ASSISTANT_TRY_PER_USD;
  if (from === "EUR") usdValue = amount * ASSISTANT_USD_PER_EUR;
  if (from === "GBP") usdValue = amount * ASSISTANT_USD_PER_GBP;
  if (!Number.isFinite(usdValue)) return NaN;

  if (to === "USD") return usdValue;
  if (to === "TRY") return usdValue * ASSISTANT_TRY_PER_USD;
  if (to === "EUR") return usdValue / ASSISTANT_USD_PER_EUR;
  if (to === "GBP") return usdValue / ASSISTANT_USD_PER_GBP;
  return NaN;
}

function extractDistrict(property) {
  if (property?.addressDetails && typeof property.addressDetails === "object") {
    const district = property.addressDetails.district;
    if (typeof district === "string" && district.trim()) return district.trim();
  }
  return "";
}

function extractSizeM2(property) {
  const area = property?.area;
  if (typeof area === "number" && Number.isFinite(area)) return area;
  if (!area || typeof area !== "object") return 0;

  const net = normalizeNumber(area.net, NaN);
  const gross = normalizeNumber(area.gross, NaN);
  if (Number.isFinite(net)) return net;
  if (Number.isFinite(gross)) return gross;
  return 0;
}

function toPriceFields(property) {
  const price = normalizeNumber(property?.price, 0);
  const currency = normalizeString(property?.currency).toUpperCase();
  let asUsd = convertPrice(price, currency, "USD");
  let asTry = convertPrice(price, currency, "TRY");

  if ((!Number.isFinite(asUsd) || asUsd <= 0) && (!Number.isFinite(asTry) || asTry <= 0)) {
    const specialOfferPrices = collectSpecialOfferPrices(property);
    if (specialOfferPrices.length > 0) {
      const usdValues = specialOfferPrices
        .map((item) => convertPrice(item.value, item.currency, "USD"))
        .filter((v) => Number.isFinite(v) && v > 0);
      const tryValues = specialOfferPrices
        .map((item) => convertPrice(item.value, item.currency, "TRY"))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (usdValues.length > 0) asUsd = Math.min(...usdValues);
      if (tryValues.length > 0) asTry = Math.min(...tryValues);
    }
  }

  if ((!Number.isFinite(asUsd) || asUsd <= 0) && (!Number.isFinite(asTry) || asTry <= 0)) {
    const planPrices = collectFloorPlanPrices(property);
    if (planPrices.length > 0) {
      const usdValues = planPrices
        .map((item) => convertPrice(item.value, item.currency, "USD"))
        .filter((v) => Number.isFinite(v) && v > 0);
      const tryValues = planPrices
        .map((item) => convertPrice(item.value, item.currency, "TRY"))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (usdValues.length > 0) asUsd = Math.min(...usdValues);
      if (tryValues.length > 0) asTry = Math.min(...tryValues);
    }
  }

  return {
    price_usd: Number.isFinite(asUsd) ? Math.round(asUsd) : 0,
    price_try: Number.isFinite(asTry) ? Math.round(asTry) : 0,
  };
}

function normalizeDateLike(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") return value;
  return "";
}

function collectFeatures(property) {
  const merged = [
    ...(Array.isArray(property?.interiorFeatures) ? property.interiorFeatures : []),
    ...(Array.isArray(property?.exteriorFeatures) ? property.exteriorFeatures : []),
    ...(Array.isArray(property?.muhitFeatures) ? property.muhitFeatures : []),
    ...(Array.isArray(property?.manzaraFeatures) ? property.manzaraFeatures : []),
    ...(Array.isArray(property?.genelOzellikler) ? property.genelOzellikler : []),
    ...(Array.isArray(property?.konumFeatures) ? property.konumFeatures : []),
  ];

  const seen = new Set();
  const result = [];
  for (const item of merged) {
    const value = normalizeString(item);
    if (!value) continue;
    if (seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    result.push(value);
    if (result.length >= 8) break;
  }
  return result;
}

function normalizePropertyType(value) {
  const normalized = normalizeString(value).toLowerCase();
  return normalized;
}

function buildDetailUrl(id, propertyType) {
  if (!id) return "";
  if (PROJECT_PROPERTY_TYPES.has(normalizePropertyType(propertyType))) {
    return `/projects/${id}`;
  }
  return `/listing/${id}`;
}

function normalizePropertyRecord(property) {
  const id = property?._id?.toString?.() || property?.id || "";
  const district = extractDistrict(property);
  const { price_usd, price_try } = toPriceFields(property);
  const { hasSpecialOffer, specialOfferInstallmentMonths } =
    summarizeSpecialOffers(property);
  const propertyType = normalizePropertyType(property?.propertyType);
  const paymentPlanRaw =
    normalizeString(property?.paymentPlan) ||
    normalizeString(property?.kampanya) ||
    "";
  const imageUrl =
    normalizeString(property?.image) ||
    (Array.isArray(property?.images) ? normalizeString(property.images[0]) : "");
  const brochureUrl =
    normalizeString(property?.brochureUrl) ||
    normalizeString(property?.brochure_url) ||
    normalizeString(property?.brochure) ||
    normalizeString(property?.pdfUrl) ||
    normalizeString(property?.pdf) ||
    normalizeString(property?.documentUrl) ||
    normalizeString(property?.document_url);
  const fallbackPlanRoom = extractFloorPlanItems(property)
    .map((plan) => normalizeRoomToken(plan?.tip || plan?.rooms || plan?.room))
    .find(Boolean);

  return {
    id,
    title: normalizeString(property?.title),
    city: normalizeString(property?.city),
    country: normalizeString(property?.country),
    district,
    price_usd,
    price_try,
    rooms: normalizeString(property?.rooms) || fallbackPlanRoom,
    size_m2: normalizeNumber(extractSizeM2(property), 0),
    delivery_date: normalizeDateLike(property?.deliveryDate || property?.listingDate),
    payment_plan: paymentPlanRaw,
    tapu_status: normalizeString(property?.deedStatus),
    features: collectFeatures(property),
    image_url: imageUrl,
    brochure_url: brochureUrl,
    detail_url: buildDetailUrl(id, propertyType),
    property_type: propertyType,
    has_special_offer: hasSpecialOffer,
    special_offer_installment_months: specialOfferInstallmentMonths,
  };
}

function getLocalizedConsultantField(consultant, field, language = "en") {
  const lang = normalizeString(language).toLowerCase();
  const localizedKey = `${field}_${lang}`;
  const localizedValue = normalizeString(consultant?.[localizedKey]);
  if (localizedValue) return localizedValue;
  return normalizeString(consultant?.[field]);
}

function normalizeConsultantRecord(consultant, language = "en") {
  const id = consultant?._id?.toString?.() || consultant?.id || "";
  const title = getLocalizedConsultantField(consultant, "title", language);
  const specialty = getLocalizedConsultantField(consultant, "specialty", language);
  const bio = getLocalizedConsultantField(consultant, "bio", language);

  return {
    id: normalizeString(id),
    name: normalizeString(consultant?.name),
    title,
    specialty,
    experience: normalizeString(consultant?.experience),
    languages: Array.isArray(consultant?.languages)
      ? consultant.languages.map((x) => normalizeString(x)).filter(Boolean)
      : [],
    rating: normalizeNumber(consultant?.rating, 0),
    reviews: normalizeNumber(consultant?.reviews, 0),
    deals: normalizeNumber(consultant?.deals, 0),
    phone: normalizeString(consultant?.phone),
    whatsapp: normalizeString(consultant?.whatsapp),
    email: normalizeString(consultant?.email),
    image_url: normalizeString(consultant?.image),
    bio,
    available: Boolean(consultant?.available),
    linkedin: normalizeString(consultant?.linkedin),
    profile_url: "/consultants",
  };
}

function getLocalizedBlogField(blog, field, language = "en") {
  const lang = normalizeString(language).toLowerCase();
  const localizedKey = `${field}_${lang}`;
  const localizedValue = normalizeString(blog?.[localizedKey]);
  if (localizedValue) return localizedValue;
  return normalizeString(blog?.[field]);
}

function slugifyBlogValue(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isObjectIdString(value = "") {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function resolveAssistantBlogSlug(blog = {}) {
  const existingSlug = normalizeString(blog?.slug);
  if (existingSlug && !isObjectIdString(existingSlug)) return existingSlug;

  const titleSource =
    normalizeString(blog?.title_en) ||
    normalizeString(blog?.title) ||
    normalizeString(blog?.title_tr) ||
    normalizeString(blog?.title_ru) ||
    "blog";
  const baseSlug = slugifyBlogValue(titleSource) || "blog";
  const id = normalizeString(blog?._id?.toString?.() || blog?.id).toLowerCase();
  return id ? `${baseSlug}-${id}` : baseSlug;
}

function normalizeBlogRecord(blog, language = "en") {
  const id = blog?._id?.toString?.() || blog?.id || "";
  const title = getLocalizedBlogField(blog, "title", language);
  const summary =
    getLocalizedBlogField(blog, "summary", language) ||
    getLocalizedBlogField(blog, "metaDescription", language);
  const category = getLocalizedBlogField(blog, "category", language);
  const imageUrl =
    normalizeString(blog?.image) ||
    (Array.isArray(blog?.images) ? normalizeString(blog.images[0]) : "");
  const slug = resolveAssistantBlogSlug(blog);

  return {
    id: normalizeString(id),
    slug,
    title,
    summary,
    category,
    country: normalizeString(blog?.country),
    image_url: imageUrl,
    blog_url: slug ? `/blog/${slug}` : "",
    published_at: normalizeDateLike(blog?.createdAt),
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDeliveryDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function normalizeSearchArgs(args = {}) {
  const mapped = {
    budgetMin: args?.budgetMin ?? args?.budget_min,
    budgetMax: args?.budgetMax ?? args?.budget_max,
    budgetExact: args?.budgetExact ?? args?.budget_exact,
    budgetFlexPercent:
      args?.budgetFlexPercent ?? args?.budget_flex_percent ?? args?.budgetTolerancePercent,
    exactPrice:
      args?.exactPrice ?? args?.exact_price ?? args?.strictPriceMatch ?? args?.strict_price_match,
    budgetCurrency:
      args?.budgetCurrency ?? args?.budget_currency ?? args?.currency,
    propertyScope:
      args?.propertyScope ??
      args?.property_scope ??
      args?.scope ??
      args?.search_scope ??
      args?.propertyType ??
      args?.property_type,
    rooms: args?.rooms,
    city: args?.city,
    district: args?.district,
    districts: Array.isArray(args?.districts) ? args.districts : [],
    cities: Array.isArray(args?.cities) ? args.cities : [],
    country: args?.country,
    countries: Array.isArray(args?.countries) ? args.countries : [],
    neighborhood:
      args?.neighborhood ??
      args?.neighbourhood ??
      args?.location ??
      args?.location_query,
    deliveryDate: args?.deliveryDate ?? args?.delivery_date,
    installmentPlan: args?.installmentPlan ?? args?.installment_plan,
    gyo: args?.gyo,
    keywords: Array.isArray(args?.keywords) ? args.keywords : [],
    limit: args?.limit,
  };
  return mapped;
}

function normalizeConsultantSearchArgs(args = {}) {
  return {
    name: args?.name,
    specialty: args?.specialty,
    language: args?.language ?? args?.spoken_language,
    available: args?.available,
    keywords: Array.isArray(args?.keywords) ? args.keywords : [],
    limit: args?.limit,
  };
}

function normalizeBlogSearchArgs(args = {}) {
  return {
    query: args?.query,
    country: args?.country,
    category: args?.category,
    keywords: Array.isArray(args?.keywords) ? args.keywords : [],
    limit: args?.limit,
  };
}

function inferLocationTokensFromText(text = "") {
  const normalized = toFoldedText(text).replace(/[^0-9a-z\u0400-\u04ff\s-]/gi, " ");

  const stopwords = new Set([
    "i",
    "me",
    "my",
    "want",
    "with",
    "for",
    "in",
    "the",
    "and",
    "or",
    "to",
    "a",
    "an",
    "under",
    "over",
    "budget",
    "price",
    "project",
    "facility",
    "facilities",
    "property",
    "properties",
    "apartment",
    "apartments",
    "flat",
    "home",
    "house",
    "listing",
    "listings",
    "resale",
    "room",
    "rooms",
    "buy",
    "sale",
    "between",
    "from",
    "max",
    "min",
    "exact",
    "payment",
    "plan",
    "installment",
    "usd",
    "eur",
    "euro",
    "try",
    "tl",
    "dollar",
    "merhaba",
    "istanbul",
    "daire",
    "ev",
    "fiyat",
    "butce",
    "butce",
    "ve",
    "ile",
    "icin",
    "icin",
    "satilik",
    "satÄ±lÄ±k",
    "proje",
    "ilce",
    "mahalle",
    "sehir",
    "oda",
    "odali",
    "konut",
    "yatirim",
    "sosyal",
    "donati",
    "stambul",
    "kvartira",
    "nedvizhimost",
    "rassrochka",
    "proekt",
    "rayon",
    "gorod",
    "do",
    "ot",
    "v",
    "donatÄ±",
    "\u0445\u043e\u0447\u0443",
    "\u043a\u0443\u043f\u0438\u0442\u044c",
    "\u0431\u044e\u0434\u0436\u0435\u0442",
    "\u0446\u0435\u043d\u0430",
  ]);

  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !stopwords.has(token))
    .slice(0, 6);
}

function inferBlogKeywordsFromText(text = "") {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[^0-9a-z\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\s-]/gi, " ");

  const stopwords = new Set([
    "what",
    "which",
    "where",
    "tell",
    "about",
    "show",
    "find",
    "blog",
    "article",
    "guide",
    "law",
    "legal",
    "tax",
    "and",
    "the",
    "for",
    "with",
    "turkey",
    "turkish",
    "istanbul",
    "nedir",
    "hakkinda",
    "blog",
    "makale",
    "rehber",
    "vergi",
    "kanun",
    "yasa",
  ]);

  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !stopwords.has(token))
    .slice(0, 8);
}

function toAsciiSearchForm(value = "") {
  return toFoldedText(value);
}

function expandKeywordVariants(rawKeyword = "") {
  const keyword = normalizeString(rawKeyword);
  if (!keyword) return [];

  const variants = new Set();
  const lower = keyword.toLowerCase();
  const ascii = toAsciiSearchForm(lower);

  variants.add(keyword);
  variants.add(lower);
  if (ascii) variants.add(ascii);

  const normalized = ascii || lower;
  const isFacilityLike =
    /(facility|facilit|amenit|social|sosyal|donat|ozellik|tesis)/i.test(normalized);
  if (isFacilityLike) {
    [
      "facility",
      "facilities",
      "amenity",
      "amenities",
      "social",
      "sosyal",
      "donati",
      "donat",
    ].forEach((v) => variants.add(v));
  }

  const isProjectLike = /(project|proje)/i.test(normalized);
  if (isProjectLike) {
    ["project", "proje"].forEach((v) => variants.add(v));
  }

  return Array.from(variants).filter(Boolean);
}

export async function searchProperties(rawArgs = {}) {
  const args = normalizeSearchArgs(rawArgs);
  const db = await getMongoDb();

  const baseAndConditions = [];
  let budgetMin = normalizeNumber(args.budgetMin, NaN);
  let budgetMax = normalizeNumber(args.budgetMax, NaN);
  const budgetExact = normalizeNumber(args.budgetExact, NaN);
  const requestedExactPrice = normalizeBoolean(args.exactPrice, false) || Number.isFinite(budgetExact);
  const rawFlexPercent = normalizeNumber(args.budgetFlexPercent, NaN);
  const defaultBudgetFlexPercent = readPositiveEnvNumber("ASSISTANT_BUDGET_FLEX_PERCENT", 15);
  const budgetFlexPercent = Number.isFinite(rawFlexPercent)
    ? Math.max(0, Math.min(rawFlexPercent, 40))
    : Math.max(0, Math.min(defaultBudgetFlexPercent, 40));
  const budgetCurrency = normalizeCurrencyCode(args.budgetCurrency) || "USD";
  const exactPriceTarget = Number.isFinite(budgetExact)
    ? budgetExact
    : Number.isFinite(budgetMin) && !Number.isFinite(budgetMax)
    ? budgetMin
    : Number.isFinite(budgetMax) && !Number.isFinite(budgetMin)
    ? budgetMax
    : Number.isFinite(budgetMin) &&
      Number.isFinite(budgetMax) &&
      Math.abs(budgetMin - budgetMax) <= 1
    ? budgetMin
    : NaN;

  if (requestedExactPrice && Number.isFinite(exactPriceTarget)) {
    budgetMin = exactPriceTarget;
    budgetMax = exactPriceTarget;
  }

  if (!requestedExactPrice && budgetFlexPercent > 0) {
    const flexRatio = budgetFlexPercent / 100;
    const hasEqualBounds =
      Number.isFinite(budgetMin) &&
      Number.isFinite(budgetMax) &&
      Math.abs(budgetMin - budgetMax) <= 1;
    const hasExplicitRange =
      Number.isFinite(budgetMin) &&
      Number.isFinite(budgetMax) &&
      !hasEqualBounds;

    if (hasEqualBounds) {
      const center = (budgetMin + budgetMax) / 2;
      budgetMin = Math.max(0, center * (1 - flexRatio));
      budgetMax = center * (1 + flexRatio);
    } else if (hasExplicitRange) {
      // Both bounds are explicitly set by the user — do NOT expand the range.
    } else if (Number.isFinite(budgetMax) && !Number.isFinite(budgetMin)) {
      budgetMax = budgetMax * (1 + flexRatio);
    } else if (Number.isFinite(budgetMin) && !Number.isFinite(budgetMax)) {
      // Only lower bound set ("above X") — never go below the stated minimum.
    }
  }

  const hasBudgetFilter =
    Number.isFinite(budgetMin) || Number.isFinite(budgetMax) || Number.isFinite(exactPriceTarget);
  const exactPriceEnabled = requestedExactPrice && Number.isFinite(exactPriceTarget);
  const roomFilter = normalizeRoomToken(args.rooms);
  const propertyScope = normalizePropertyScope(args.propertyScope);
  const cityValue = normalizeString(args.city);
  const districtValue = normalizeString(args.district);
  const countryValue = normalizeString(args.country);
  const countriesArray = (Array.isArray(args.countries) ? args.countries : [])
    .map((c) => normalizeString(c))
    .filter(Boolean);
  let districtsArray = (Array.isArray(args.districts) ? args.districts : [])
    .map((d) => normalizeString(d))
    .filter(Boolean);
  const neighborhoodValue = normalizeString(args.neighborhood);
  const broadDistrictAlias = isBroadDistrictAlias(districtValue);

  if (broadDistrictAlias && districtsArray.length === 0) {
    const sideDistricts = resolveIstanbulSideDistricts(districtValue);
    if (sideDistricts) {
      districtsArray = sideDistricts;
    }
  }

  let districtCondition = null;
  let neighborhoodCondition = null;

  // Budget filtering is applied after fetch so mixed listing currencies (USD/TRY/EUR)
  // can be normalized to one budget currency reliably.

  if (propertyScope === "projects") {
    baseAndConditions.push({
      propertyType: { $in: Array.from(PROJECT_PROPERTY_TYPES) },
    });
  } else if (propertyScope === "listings") {
    baseAndConditions.push({
      $or: [
        { propertyType: { $exists: false } },
        { propertyType: { $nin: Array.from(PROJECT_PROPERTY_TYPES) } },
      ],
    });
  }

  if (cityValue) {
    baseAndConditions.push({
      city: { $regex: escapeRegex(cityValue), $options: "i" },
    });
  }

  const citiesArray = (Array.isArray(args?.cities) ? args.cities : [])
    .map((c) => normalizeString(c))
    .filter(Boolean);

  if (countriesArray.length > 0 || citiesArray.length > 0) {
    const regionOrConditions = [
      ...countriesArray.map((c) => ({ country: { $regex: escapeRegex(c), $options: "i" } })),
      ...citiesArray.map((c) => ({ city: { $regex: escapeRegex(c), $options: "i" } })),
    ];
    if (regionOrConditions.length > 0) {
      baseAndConditions.push({ $or: regionOrConditions });
    }
  } else if (countryValue) {
    baseAndConditions.push({
      country: { $regex: escapeRegex(countryValue), $options: "i" },
    });
  }

  if (districtsArray.length > 0) {
    const districtOrConditions = districtsArray.flatMap((d) => {
      const pattern = escapeRegex(d);
      return [
        { "addressDetails.district": { $regex: pattern, $options: "i" } },
        { address: { $regex: pattern, $options: "i" } },
      ];
    });
    districtCondition = { $or: districtOrConditions };
    baseAndConditions.push(districtCondition);
  } else if (districtValue && !broadDistrictAlias) {
    const districtPattern = escapeRegex(districtValue);
    districtCondition = {
      $or: [
        { "addressDetails.district": { $regex: districtPattern, $options: "i" } },
        { address: { $regex: districtPattern, $options: "i" } },
      ],
    };
    baseAndConditions.push(districtCondition);
  }

  if (neighborhoodValue) {
    const neighborhoodPattern = escapeRegex(neighborhoodValue);
    neighborhoodCondition = {
      $or: [
        {
          "addressDetails.neighborhood": {
            $regex: neighborhoodPattern,
            $options: "i",
          },
        },
        { siteName: { $regex: neighborhoodPattern, $options: "i" } },
        { projectName: { $regex: neighborhoodPattern, $options: "i" } },
        { title: { $regex: neighborhoodPattern, $options: "i" } },
        { address: { $regex: neighborhoodPattern, $options: "i" } },
      ],
    };
    baseAndConditions.push(neighborhoodCondition);
  }

  if (typeof args.installmentPlan === "boolean" && args.installmentPlan) {
    baseAndConditions.push({
      $or: [
        { kampanya: { $regex: "taksit|installment|payment", $options: "i" } },
        { paymentPlan: { $regex: "taksit|installment|payment", $options: "i" } },
        { "projeHakkinda.specialOffers": { $elemMatch: { installmentMonths: { $gt: 0 } } } },
        { "projeHakkinda.specialOffer.installmentMonths": { $gt: 0 } },
      ],
    });
  }

  if (args.gyo === true) {
    baseAndConditions.push({ gyo: true });
  }

  const rawKeywords = [
    ...(Array.isArray(args.keywords) ? args.keywords : []),
    ...(districtValue && broadDistrictAlias ? [districtValue] : []),
  ]
    .map((k) => normalizeString(k))
    .filter(Boolean);
  const expandedKeywords = Array.from(
    new Set(rawKeywords.flatMap((keyword) => expandKeywordVariants(keyword)))
  );
  const keywordConditions = [];

  if (expandedKeywords.length > 0) {
    for (const keyword of expandedKeywords) {
      const pattern = escapeRegex(keyword);
      keywordConditions.push(
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { city: { $regex: pattern, $options: "i" } },
        { address: { $regex: pattern, $options: "i" } },
        { projectName: { $regex: pattern, $options: "i" } },
        { siteName: { $regex: pattern, $options: "i" } },
        { "addressDetails.neighborhood": { $regex: pattern, $options: "i" } },
        { "addressDetails.district": { $regex: pattern, $options: "i" } },
        { propertyType: { $regex: pattern, $options: "i" } },
        { muhit: { $regex: pattern, $options: "i" } },
        { interiorFeatures: { $elemMatch: { $regex: pattern, $options: "i" } } },
        { exteriorFeatures: { $elemMatch: { $regex: pattern, $options: "i" } } },
        { muhitFeatures: { $elemMatch: { $regex: pattern, $options: "i" } } },
        { manzaraFeatures: { $elemMatch: { $regex: pattern, $options: "i" } } },
        { genelOzellikler: { $elemMatch: { $regex: pattern, $options: "i" } } },
        { konumFeatures: { $elemMatch: { $regex: pattern, $options: "i" } } }
      );
    }
  }

  const buildQuery = (baseConditions, useKeywordConditions) => {
    const andConditions = [...baseConditions];
    if (useKeywordConditions && keywordConditions.length > 0) {
      andConditions.push({ $or: keywordConditions });
    }
    return andConditions.length > 0 ? { $and: andConditions } : {};
  };
  const fetchLimit = Math.min(Math.max(normalizeNumber(args.limit, 5), 1), 20);
  const prefetchLimit =
    exactPriceEnabled ? 1200 : hasBudgetFilter || roomFilter || propertyScope === "projects" ? 500 : 80;

  let docs = await db
    .collection("Residency")
    .find(buildQuery(baseAndConditions, true))
    .sort({ createdAt: -1 })
    .limit(prefetchLimit)
    .toArray();

  // Retry with base filters if keyword matching is too strict for mixed languages.
  if (docs.length === 0 && keywordConditions.length > 0) {
    docs = await db
      .collection("Residency")
      .find(buildQuery(baseAndConditions, false))
      .sort({ createdAt: -1 })
      .limit(prefetchLimit)
      .toArray();
  }

  const hasTightLocationFilter = Boolean(districtCondition || neighborhoodCondition);
  if (docs.length === 0 && hasTightLocationFilter) {
    const relaxedBaseConditions = baseAndConditions.filter(
      (condition) => condition !== districtCondition && condition !== neighborhoodCondition
    );

    docs = await db
      .collection("Residency")
      .find(buildQuery(relaxedBaseConditions, true))
      .sort({ createdAt: -1 })
      .limit(prefetchLimit)
      .toArray();

    if (docs.length === 0 && keywordConditions.length > 0) {
      docs = await db
        .collection("Residency")
        .find(buildQuery(relaxedBaseConditions, false))
        .sort({ createdAt: -1 })
        .limit(prefetchLimit)
        .toArray();
    }
  }

  const budgetFiltered = hasBudgetFilter
    ? docs.filter((doc) => {
        const comparablePrices = collectComparablePrices(doc, budgetCurrency, roomFilter);
        if (comparablePrices.length === 0) return false;

        if (exactPriceEnabled) {
          const tolerance = budgetCurrency === "TRY" ? 1 : 0.5;
          return comparablePrices.some((value) => Math.abs(value - exactPriceTarget) <= tolerance);
        }

        return comparablePrices.some((value) => {
          if (Number.isFinite(budgetMin) && value < budgetMin) return false;
          if (Number.isFinite(budgetMax) && value > budgetMax) return false;
          return true;
        });
      })
    : docs;

  const roomFiltered = roomFilter
    ? budgetFiltered.filter((doc) => propertyMatchesRoomFilter(doc, roomFilter))
    : budgetFiltered;

  const deliveryDate = parseDeliveryDate(args.deliveryDate);
  const filtered = deliveryDate
    ? roomFiltered.filter((doc) => {
        const d = parseDeliveryDate(doc?.deliveryDate || doc?.listingDate);
        if (!d) return false;
        return d.getTime() <= deliveryDate.getTime();
      })
    : roomFiltered;

  const results = [];
  for (const doc of filtered) {
    if (results.length >= fetchLimit) break;
    const record = normalizePropertyRecord(doc);
    if (hasBudgetFilter) {
      const comparablePrices = collectComparablePrices(doc, budgetCurrency, roomFilter);
      const matchingPrices = comparablePrices.filter((v) => {
        if (Number.isFinite(budgetMin) && v < budgetMin) return false;
        if (Number.isFinite(budgetMax) && v > budgetMax) return false;
        return true;
      });
      if (matchingPrices.length === 0) continue;
      const bestPrice = Math.min(...matchingPrices);
      const budgetCur = budgetCurrency || "USD";
      record.price_usd = Math.round(budgetCur === "USD" ? bestPrice : convertPrice(bestPrice, budgetCur, "USD"));
      record.price_try = Math.round(budgetCur === "TRY" ? bestPrice : convertPrice(bestPrice, budgetCur, "TRY"));
    }
    results.push(record);
  }
  return results;
}

async function searchConsultants(rawArgs = {}, language = "en") {
  const args = normalizeConsultantSearchArgs(rawArgs);
  const db = await getMongoDb();

  const andConditions = [];

  if (typeof args.available === "boolean") {
    andConditions.push({ available: args.available });
  }

  if (normalizeString(args.name)) {
    const pattern = escapeRegex(normalizeString(args.name));
    andConditions.push({
      $or: [
        { name: { $regex: pattern, $options: "i" } },
        { title: { $regex: pattern, $options: "i" } },
        { title_en: { $regex: pattern, $options: "i" } },
        { title_tr: { $regex: pattern, $options: "i" } },
      ],
    });
  }

  if (normalizeString(args.specialty)) {
    const pattern = escapeRegex(normalizeString(args.specialty));
    andConditions.push({
      $or: [
        { specialty: { $regex: pattern, $options: "i" } },
        { specialty_en: { $regex: pattern, $options: "i" } },
        { specialty_tr: { $regex: pattern, $options: "i" } },
        { bio: { $regex: pattern, $options: "i" } },
        { bio_en: { $regex: pattern, $options: "i" } },
        { bio_tr: { $regex: pattern, $options: "i" } },
      ],
    });
  }

  if (normalizeString(args.language)) {
    const pattern = escapeRegex(normalizeString(args.language));
    andConditions.push({
      languages: { $elemMatch: { $regex: pattern, $options: "i" } },
    });
  }

  const keywords = (Array.isArray(args.keywords) ? args.keywords : [])
    .map((k) => normalizeString(k))
    .filter(Boolean)
    .slice(0, 6);
  if (keywords.length > 0) {
    const keywordConditions = [];
    for (const keyword of keywords) {
      const pattern = escapeRegex(keyword);
      keywordConditions.push(
        { name: { $regex: pattern, $options: "i" } },
        { title: { $regex: pattern, $options: "i" } },
        { title_en: { $regex: pattern, $options: "i" } },
        { title_tr: { $regex: pattern, $options: "i" } },
        { specialty: { $regex: pattern, $options: "i" } },
        { specialty_en: { $regex: pattern, $options: "i" } },
        { specialty_tr: { $regex: pattern, $options: "i" } },
        { bio: { $regex: pattern, $options: "i" } },
        { bio_en: { $regex: pattern, $options: "i" } },
        { bio_tr: { $regex: pattern, $options: "i" } },
        { languages: { $elemMatch: { $regex: pattern, $options: "i" } } }
      );
    }
    andConditions.push({ $or: keywordConditions });
  }

  const query = andConditions.length > 0 ? { $and: andConditions } : {};
  const limit = Math.min(Math.max(normalizeNumber(args.limit, 4), 1), 10);

  const docs = await db
    .collection("Consultant")
    .find(query)
    .sort({ available: -1, rating: -1, reviews: -1, order: 1, createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((item) => normalizeConsultantRecord(item, language));
}

export async function searchBlogs(rawArgs = {}, language = "en") {
  const args = normalizeBlogSearchArgs(rawArgs);
  const db = await getMongoDb();
  const andConditions = [{ published: true }];

  if (normalizeString(args.country)) {
    const pattern = escapeRegex(normalizeString(args.country));
    andConditions.push({ country: { $regex: pattern, $options: "i" } });
  }

  if (normalizeString(args.category)) {
    const pattern = escapeRegex(normalizeString(args.category));
    andConditions.push({
      $or: [
        { category: { $regex: pattern, $options: "i" } },
        { category_en: { $regex: pattern, $options: "i" } },
        { category_tr: { $regex: pattern, $options: "i" } },
        { category_ru: { $regex: pattern, $options: "i" } },
      ],
    });
  }

  const explicitKeywords = (Array.isArray(args.keywords) ? args.keywords : [])
    .map((k) => normalizeString(k))
    .filter(Boolean)
    .slice(0, 8);
  const queryKeywords = [
    ...inferBlogKeywordsFromText(args.query),
    normalizeString(args.query),
  ].filter(Boolean);
  const mergedKeywords = Array.from(new Set([...explicitKeywords, ...queryKeywords]));

  if (mergedKeywords.length > 0) {
    const keywordConditions = [];

    for (const rawKeyword of mergedKeywords) {
      const variants = expandKeywordVariants(rawKeyword);
      for (const variant of variants) {
        const pattern = escapeRegex(variant);
        keywordConditions.push(
          { title: { $regex: pattern, $options: "i" } },
          { title_en: { $regex: pattern, $options: "i" } },
          { title_tr: { $regex: pattern, $options: "i" } },
          { title_ru: { $regex: pattern, $options: "i" } },
          { summary: { $regex: pattern, $options: "i" } },
          { summary_en: { $regex: pattern, $options: "i" } },
          { summary_tr: { $regex: pattern, $options: "i" } },
          { summary_ru: { $regex: pattern, $options: "i" } },
          { content: { $regex: pattern, $options: "i" } },
          { content_en: { $regex: pattern, $options: "i" } },
          { content_tr: { $regex: pattern, $options: "i" } },
          { content_ru: { $regex: pattern, $options: "i" } },
          { metaDescription: { $regex: pattern, $options: "i" } },
          { metaDescription_en: { $regex: pattern, $options: "i" } },
          { metaDescription_tr: { $regex: pattern, $options: "i" } },
          { metaDescription_ru: { $regex: pattern, $options: "i" } },
          { category: { $regex: pattern, $options: "i" } },
          { category_en: { $regex: pattern, $options: "i" } },
          { category_tr: { $regex: pattern, $options: "i" } },
          { category_ru: { $regex: pattern, $options: "i" } },
          { country: { $regex: pattern, $options: "i" } }
        );
      }
    }

    andConditions.push({ $or: keywordConditions });
  }

  const query = andConditions.length > 0 ? { $and: andConditions } : {};
  const limit = Math.min(Math.max(normalizeNumber(args.limit, 3), 1), 24);

  const docs = await db
    .collection("Blog")
    .find(query)
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((item) => normalizeBlogRecord(item, language));
}

async function getPropertyById(id) {
  if (!ObjectId.isValid(id)) return null;
  const db = await getMongoDb();
  const property = await db.collection("Residency").findOne({ _id: new ObjectId(id) });
  if (!property) return null;
  return normalizePropertyRecord(property);
}

async function createLead(data = {}, attribution = {}) {
  const db = await getMongoDb();
  const leadAttribution = extractLeadAttribution(
    { attribution },
    { defaultLeadSource: "ai_assistant" }
  );

  const lead = {
    name: normalizeString(data.name),
    country: normalizeString(data.country),
    whatsapp_or_email: normalizeString(data.whatsapp_or_email || data.whatsappOrEmail),
    budget_range: normalizeString(data.budget_range || data.budgetRange),
    note: normalizeString(data.note),
    source: "ai_assistant",
    gclid: leadAttribution.gclid,
    gbraid: leadAttribution.gbraid,
    wbraid: leadAttribution.wbraid,
    utm_source: leadAttribution.utmSource,
    utm_medium: leadAttribution.utmMedium,
    utm_campaign: leadAttribution.utmCampaign,
    utm_term: leadAttribution.utmTerm,
    utm_content: leadAttribution.utmContent,
    fbclid: leadAttribution.fbclid,
    landing_page: leadAttribution.landingPage,
    referrer: leadAttribution.referrer,
    lead_status: leadAttribution.leadStatus,
    lead_source: leadAttribution.leadSource,
    submitted_at: leadAttribution.submittedAt,
    createdAt: new Date(),
  };

  const insertResult = await db.collection("AiLead").insertOne(lead);
  return {
    id: insertResult.insertedId.toString(),
    ...lead,
    createdAt: lead.createdAt.toISOString(),
  };
}

export async function transcribeAssistantAudio({
  audio_base64,
  mime_type,
  language,
} = {}) {
  const base64Audio = normalizeString(audio_base64);
  if (!base64Audio) {
    throw new Error("audio_base64 is required");
  }

  const audioBuffer = decodeBase64Audio(base64Audio);
  if (!audioBuffer.length) {
    throw new Error("audio payload is empty");
  }

  const maxBytes = 15 * 1024 * 1024;
  if (audioBuffer.length > maxBytes) {
    throw new Error("audio payload is too large");
  }

  const contentType = normalizeString(mime_type) || "audio/webm";
  const extension = mimeTypeToExtension(contentType);
  const file = await toFile(audioBuffer, `voice-input.${extension}`, {
    type: contentType,
  });

  const transcriptionLanguage = mapTranscriptionLanguage(language);
  const promptLanguage = transcriptionLanguage || detectLanguage(language || "");
  const openai = getOpenAIClient();
  const response = await createTranscriptionWithFallback(openai, {
    file,
    language: transcriptionLanguage || undefined,
    prompt: getTranscriptionPrompt(promptLanguage || "en"),
    response_format: "json",
    temperature: 0,
  });

  const text = normalizeString(response?.text);
  return { text };
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: typeof item.content === "string" ? item.content : JSON.stringify(item.content || {}),
    }));
}

function getSystemPrompt(language) {
  const noData = FALLBACK_MESSAGES[language]?.noData || FALLBACK_MESSAGES.en.noData;

  return `You are a multilingual AI real estate assistant integrated with MongoDB property and blog databases.

Supported languages: English (EN), Turkish (TR), Russian (RU).
Language rules:
- Detect user language from the latest user message and respond fully in that language.
- If user changes language, follow it immediately.
- Never mix languages in one reply.

Data rules:
- You MUST use available tools for all factual property or lead information.
- Never fabricate prices, features, delivery dates, payment plans, or legal eligibility.
- If data is unavailable, clearly say: "${noData}"

Intents to handle:
- Property search
- Property details
- Consultant search / advisor recommendation
- Blog content questions (tax, legal, market insights, guides)
- Payment plan inquiry
- Investment/citizenship eligibility
- Location questions
- Ready-to-buy signals

Behavior rules:
- Extract filters where possible (budget, rooms, city/district/neighborhood/site name, delivery date, installment, feature keywords).
- Property search must cover all property inventory records (listing and project types together).
- For short property queries like "istanbul 350.000 usd 2+1", always call searchProperties at least once before final reply.
- If user asks exact/specific price, pass "budget_exact" and set "exact_price": true.
- For rough budgets (e.g., only a number like 400000 USD without under/over), you may pass "budget_flex_percent" (10-20) to allow around-range matches.

Budget range rules (CRITICAL – follow strictly):
- When user specifies a price RANGE (e.g., "between 500000 and 800000", "500k-800k", "from X to Y", "X ile Y arası", "от X до Y"), you MUST pass BOTH "budget_min" AND "budget_max". Never omit "budget_min" when a lower bound is stated.
- When user says "under X" / "below X" / "altında" / "ниже", pass only "budget_max".
- When user says "above X" / "over X" / "üstünde" / "выше", pass only "budget_min".
- When user gives an explicit range with both bounds, set "budget_flex_percent" to 0 so results stay strictly within the stated range.
- NEVER return properties outside the user's stated price range. Price accuracy is critical for user trust.

Citizenship / investment eligibility rules:
- When user asks about citizenship, investment visa, residency-by-investment, "vatandaşlık", "yatırımla vatandaşlık", "гражданство за инвестиции", or similar:
  1. Explain that Turkish citizenship by investment requires a minimum property purchase of $400,000 USD.
  2. ALWAYS call searchProperties with "budget_min": 400000, "budget_currency": "USD" to show eligible properties.
  3. If user also mentions a city or district, include those filters too.
  4. In your reply, clearly state the $400,000 minimum requirement and show the matching properties.

Istanbul side filtering rules:
- When user mentions "European side" / "Avrupa Yakası" / "европейская сторона" / "europe part", pass "district": "Avrupa Yakası" or "European side". The backend will automatically expand this to all European-side districts.
- When user mentions "Asian side" / "Anadolu Yakası" / "азиатская сторона" / "asia part", pass "district": "Anadolu Yakası" or "Asian side". The backend will automatically expand this to all Asian-side districts.
- Do NOT show properties from the other side of Istanbul when user specifically asks for one side.

- If user says "in projects" or equivalent, pass "property_scope": "projects". If user asks only listings, pass "property_scope": "listings".
- For consultant intent, call searchConsultants and return consultant profiles in "consultants".
- For blog/legal/tax content requests, call searchBlogs and return matching posts in "blogs".
- If user asks for property search, price, rooms, budget, payment plan, or location, do NOT call searchBlogs and keep "blogs" as [].
- Detect budget currency among USD, TRY, EUR and pass it as "budget_currency" in search tool calls.
- If required details are missing, ask maximum one short clarification question using "next_question".
- If user shows buying intent, include a short "lead_prompt" asking for name, country, WhatsApp/email, and budget range.
- Keep tone concise, professional, investor-oriented, trustworthy, with clear numbers.

Output rules:
- Return ONLY valid JSON.
- Use exactly this top-level shape:
{
  "reply": "string",
  "results": [
    {
      "id": "property_id",
      "title": "...",
      "city": "...",
      "district": "...",
      "price_usd": 0,
      "price_try": 0,
      "rooms": "2+1",
      "size_m2": 0,
      "delivery_date": "...",
      "payment_plan": "...",
      "tapu_status": "...",
      "features": ["...", "..."],
      "image_url": "...",
      "detail_url": "...",
      "property_type": "..."
    }
  ],
  "consultants": [
    {
      "id": "consultant_id",
      "name": "...",
      "title": "...",
      "specialty": "...",
      "experience": "...",
      "languages": ["..."],
      "rating": 0,
      "reviews": 0,
      "phone": "...",
      "whatsapp": "...",
      "email": "...",
      "image_url": "...",
      "bio": "...",
      "available": true,
      "profile_url": "..."
    }
  ],
  "blogs": [
    {
      "id": "blog_id",
      "title": "...",
      "summary": "...",
      "category": "...",
      "country": "...",
      "image_url": "...",
      "blog_url": "...",
      "published_at": "..."
    }
  ],
  "next_question": "...",
  "lead_prompt": "..."
}
- If no matches: "results" must be [] and "consultants" must be [] and "blogs" must be [] and reply must politely explain no match.
- Keep data fields grounded in tool outputs only.`;
}

function hasBuyingIntent(text = "") {
  const normalized = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(i want to buy|how can i proceed|book|reserve|buy now|ready to buy)\b/.test(normalized) ||
    /\b(satin almak istiyorum|nasil ilerleyebilirim|hemen almak)\b/.test(normalized) ||
    /\b(hochu kupit|kak prodolzhit|gotov kupit)\b/.test(normalized) ||
    /\b(\u0445\u043e\u0447\u0443 \u043a\u0443\u043f\u0438\u0442\u044c|\u043a\u0430\u043a \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c|\u0433\u043e\u0442\u043e\u0432 \u043a\u0443\u043f\u0438\u0442\u044c)\b/u.test(
      raw
    )
  );
}

function hasConsultantIntent(text = "") {
  const normalized = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(consultant|advisor|agent|broker|expert|team)\b/.test(normalized) ||
    /\b(meslek|uzman|danisman|emlakci|satis temsilcisi)\b/.test(normalized) ||
    /\b(konsultant|agent)\b/.test(normalized) ||
    /\b(\u043a\u043e\u043d\u0441\u0443\u043b\u044c\u0442\u0430\u043d\u0442|\u0431\u0440\u043e\u043a\u0435\u0440|\u0430\u0433\u0435\u043d\u0442|\u044d\u043a\u0441\u043f\u0435\u0440\u0442)\b/u.test(
      raw
    )
  );
}

function hasBlogIntent(text = "") {
  const normalized = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(blog|article|news)\b/.test(normalized) ||
    /\b(tax|taxes|taxation|legal|law|laws|regulation|regulations|citizenship law)\b/.test(
      normalized
    ) ||
    /\b(blog|makale|rehber|haber|yazi|yazilar)\b/.test(normalized) ||
    /\b(vergi|vergiler|vergilendirme|kanun|kanunlar|yasa|mevzuat)\b/.test(normalized) ||
    /\b(\u0431\u043b\u043e\u0433|\u0441\u0442\u0430\u0442\u044c\u044f|\u043d\u043e\u0432\u043e\u0441\u0442\u044c|\u0433\u0430\u0439\u0434|\u043d\u0430\u043b\u043e\u0433|\u043d\u0430\u043b\u043e\u0433\u0438|\u0437\u0430\u043a\u043e\u043d|\u0437\u0430\u043a\u043e\u043d\u044b|\u043f\u0440\u0430\u0432\u043e|\u0440\u0435\u0433\u043b\u0430\u043c\u0435\u043d\u0442)\b/u.test(
      raw
    )
  );
}

function inferConsultantKeywordsFromText(text = "") {
  return toFoldedText(text)
    .replace(/[^0-9a-z\u00c0-\u024f\u0400-\u04ff\u0600-\u06ff\s-]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !/^\d+$/.test(token))
    .filter(
      (token) =>
        ![
          "consultant",
          "advisor",
          "agent",
          "broker",
          "team",
          "danisman",
          "konsultant",
        ].includes(token)
    )
    .slice(0, 5);
}

function normalizeResultItem(item = {}) {
  const normalizedId = normalizeString(item.id);
  const normalizedPropertyType = normalizePropertyType(item.property_type);
  const normalizedDetailUrl =
    normalizeString(item.detail_url) || buildDetailUrl(normalizedId, normalizedPropertyType);

  return {
    id: normalizedId,
    title: normalizeString(item.title),
    city: normalizeString(item.city),
    district: normalizeString(item.district),
    price_usd: normalizeNumber(item.price_usd, 0),
    price_try: normalizeNumber(item.price_try, 0),
    rooms: normalizeString(item.rooms),
    size_m2: normalizeNumber(item.size_m2, 0),
    delivery_date: normalizeString(item.delivery_date),
    payment_plan: normalizeString(item.payment_plan),
    tapu_status: normalizeString(item.tapu_status),
    features: Array.isArray(item.features)
      ? item.features.map((x) => normalizeString(x)).filter(Boolean)
      : [],
    image_url: normalizeString(item.image_url),
    detail_url: normalizedDetailUrl,
    property_type: normalizedPropertyType,
  };
}

function normalizeConsultantItem(item = {}) {
  return {
    id: normalizeString(item.id),
    name: normalizeString(item.name),
    title: normalizeString(item.title),
    specialty: normalizeString(item.specialty),
    experience: normalizeString(item.experience),
    languages: Array.isArray(item.languages)
      ? item.languages.map((x) => normalizeString(x)).filter(Boolean)
      : [],
    rating: normalizeNumber(item.rating, 0),
    reviews: normalizeNumber(item.reviews, 0),
    deals: normalizeNumber(item.deals, 0),
    phone: normalizeString(item.phone),
    whatsapp: normalizeString(item.whatsapp),
    email: normalizeString(item.email),
    image_url: normalizeString(item.image_url),
    bio: normalizeString(item.bio),
    available: Boolean(item.available),
    linkedin: normalizeString(item.linkedin),
    profile_url: normalizeString(item.profile_url) || "/consultants",
  };
}

function normalizeBlogItem(item = {}) {
  return {
    id: normalizeString(item.id),
    slug: normalizeString(item.slug),
    title: normalizeString(item.title),
    summary: normalizeString(item.summary),
    category: normalizeString(item.category),
    country: normalizeString(item.country),
    image_url: normalizeString(item.image_url),
    blog_url: normalizeString(item.blog_url),
    published_at: normalizeString(item.published_at),
  };
}

async function enrichAssistantResults(results = []) {
  const enriched = await Promise.all(
    results.map(async (item) => {
      if (!item?.id) return item;

      const needsEnrichment =
        !normalizeString(item.image_url) ||
        !normalizeString(item.detail_url) ||
        !normalizeString(item.property_type);

      if (!needsEnrichment) return item;

      try {
        const property = await getPropertyById(item.id);
        if (!property) return item;

        return {
          ...item,
          image_url: normalizeString(item.image_url) || property.image_url,
          detail_url: normalizeString(item.detail_url) || property.detail_url,
          property_type:
            normalizeString(item.property_type) || normalizePropertyType(property.property_type),
        };
      } catch {
        return item;
      }
    })
  );

  return enriched;
}

function normalizeAssistantPayload(payload) {
  const normalized = {
    reply: normalizeString(payload?.reply),
    results: Array.isArray(payload?.results) ? payload.results.map(normalizeResultItem) : [],
    consultants: Array.isArray(payload?.consultants)
      ? payload.consultants.map(normalizeConsultantItem)
      : [],
    blogs: Array.isArray(payload?.blogs) ? payload.blogs.map(normalizeBlogItem) : [],
  };

  const nextQuestion = normalizeString(payload?.next_question);
  const leadPrompt = normalizeString(payload?.lead_prompt);

  if (nextQuestion) normalized.next_question = nextQuestion;
  if (leadPrompt) normalized.lead_prompt = leadPrompt;

  return normalized;
}

const tools = [
  {
    type: "function",
    function: {
      name: TOOL_NAMES.searchProperties,
      description: "Search properties by filters in the database.",
      parameters: {
        type: "object",
        properties: {
          budget_min: { type: "number", description: "Minimum budget (lower bound). MUST be set when user states a price range like 'between X and Y'." },
          budget_max: { type: "number", description: "Maximum budget (upper bound). MUST be set when user states a price range like 'between X and Y'." },
          budget_exact: { type: "number", description: "Exact target price. Use only when user asks for a specific price." },
          budget_flex_percent: { type: "number", description: "Flex tolerance percent (0-40). Set to 0 for explicit ranges with both min and max." },
          exact_price: { type: "boolean" },
          budget_currency: { type: "string", enum: ["USD", "TRY", "EUR"] },
          property_scope: { type: "string", enum: ["all", "projects", "listings"] },
          rooms: { type: "string" },
          city: { type: "string" },
          district: { type: "string", description: "District name OR side of Istanbul. For European side pass 'Avrupa Yakası' or 'European side'. For Asian side pass 'Anadolu Yakası' or 'Asian side'." },
          districts: { type: "array", items: { type: "string" }, description: "Array of specific district names to filter by." },
          neighborhood: { type: "string" },
          delivery_date: { type: "string" },
          installment_plan: { type: "boolean" },
          keywords: {
            type: "array",
            items: { type: "string" },
          },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.getPropertyById,
      description: "Get one property by id.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.searchConsultants,
      description: "Search real estate consultants by specialty, language, availability or name.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          specialty: { type: "string" },
          language: { type: "string" },
          available: { type: "boolean" },
          keywords: {
            type: "array",
            items: { type: "string" },
          },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.searchBlogs,
      description:
        "Search published blog posts by topic, tax/legal keywords, market insights, category or country.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          country: { type: "string" },
          category: { type: "string" },
          keywords: {
            type: "array",
            items: { type: "string" },
          },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: TOOL_NAMES.createLead,
      description: "Create a lead when user shares contact and budget details.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          country: { type: "string" },
          whatsapp_or_email: { type: "string" },
          budget_range: { type: "string" },
          note: { type: "string" },
        },
        required: ["name", "country", "whatsapp_or_email", "budget_range"],
        additionalProperties: false,
      },
    },
  },
];

async function createChatCompletionWithFallback(openai, basePayload) {
  const preferred = process.env.REAL_ESTATE_ASSISTANT_MODEL || "gpt-5.3-codex";
  const candidates = [preferred, "gpt-4o-mini"];
  let lastError = null;

  for (const model of candidates) {
    try {
      return await openai.chat.completions.create({
        ...basePayload,
        model,
      });
    } catch (error) {
      lastError = error;
      const msg = String(error?.message || "").toLowerCase();
      const modelRelated =
        msg.includes("model") || msg.includes("not found") || msg.includes("does not exist");
      if (!modelRelated || model === candidates[candidates.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError;
}

function detectBudgetCurrencyFromText(text = "") {
  const folded = toFoldedText(text);
  const raw = String(text || "").toLowerCase();

  if (/\$|\busd\b|\bdollar\b|\bdolar\b/.test(folded)) return "USD";
  if (/\u20ac|\beur\b|\beuro\b/.test(folded)) return "EUR";
  if (/\u20ba|\btry\b|\btl\b|\blira\b|\bturkish lira\b/.test(folded)) return "TRY";

  if (/\b\u0434\u043e\u043b\u043b\u0430\u0440\b/u.test(raw)) return "USD";
  if (/\b\u0435\u0432\u0440\u043e\b/u.test(raw)) return "EUR";
  if (/\b\u043b\u0438\u0440\u0430\b/u.test(raw)) return "TRY";

  return "";
}

function hasUpperBudgetCue(text = "") {
  const folded = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(under|below|less than|at most|max|maximum|up to|no more than)\b/.test(folded) ||
    /\b(alti|altinda|en cok|maksimum|en fazla|kadar)\b/.test(folded) ||
    /\b(\u0434\u043e|\u043d\u0438\u0436\u0435|\u043c\u0435\u043d\u044c\u0448\u0435|\u043c\u0430\u043a\u0441\u0438\u043c\u0443\u043c|\u043d\u0435 \u0431\u043e\u043b\u0435\u0435)\b/u.test(
      raw
    )
  );
}

function hasLowerBudgetCue(text = "") {
  const folded = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(over|above|more than|at least|min|minimum|from)\b/.test(folded) ||
    /\b(ustu|uzeri|uzerinde|en az|minimum)\b/.test(folded) ||
    /\b(\u043e\u0442|\u0432\u044b\u0448\u0435|\u0431\u043e\u043b\u044c\u0448\u0435|\u043a\u0430\u043a \u043c\u0438\u043d\u0438\u043c\u0443\u043c)\b/u.test(
      raw
    )
  );
}

function hasBetweenBudgetCue(text = "") {
  const folded = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(between|range)\b/.test(folded) ||
    /\b(arasi|araliginda|aralik)\b/.test(folded) ||
    /\b(\u043c\u0435\u0436\u0434\u0443|\u0434\u0438\u0430\u043f\u0430\u0437\u043e\u043d)\b/u.test(raw)
  );
}

function extractBudgetCandidates(text = "") {
  const raw = String(text || "");
  const pattern = /\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;
  const matches = raw.match(pattern) || [];

  return matches
    .map((token) => normalizeNumber(token, NaN))
    .filter((value) => Number.isFinite(value) && value >= 1000)
    .slice(0, 6);
}

function extractBudgetConstraintsFromText(
  text = "",
  {
    inferredBudgetCurrency = "",
    exactPriceIntent = false,
    strictBudgetIntent = false,
  } = {}
) {
  const values = extractBudgetCandidates(text);
  const currency = detectBudgetCurrencyFromText(text) || inferredBudgetCurrency;
  const constraints = currency ? { budget_currency: currency } : {};

  if (values.length === 0) return constraints;

  const ordered = [...values].sort((a, b) => a - b);
  if (hasBetweenBudgetCue(text) && ordered.length >= 2) {
    constraints.budget_min = ordered[0];
    constraints.budget_max = ordered[1];
    return constraints;
  }

  const target = ordered[ordered.length - 1];
  if (exactPriceIntent) {
    constraints.exact_price = true;
    constraints.budget_exact = target;
    constraints.budget_min = target;
    constraints.budget_max = target;
    return constraints;
  }

  if (hasUpperBudgetCue(text)) {
    constraints.budget_max = target;
    return constraints;
  }

  if (hasLowerBudgetCue(text)) {
    constraints.budget_min = target;
    return constraints;
  }

  constraints.budget_min = target;
  constraints.budget_max = target;
  if (!strictBudgetIntent) {
    constraints.budget_flex_percent = 15;
  }
  return constraints;
}

function detectCityFromText(text = "") {
  const folded = toFoldedText(text);
  const raw = String(text || "").toLowerCase();

  const cityRules = [
    {
      city: "Istanbul",
      latin: ["istanbul", "stambul"],
      cyrillic: /\b\u0441\u0442\u0430\u043c\u0431\u0443\u043b/u,
    },
    {
      city: "Ankara",
      latin: ["ankara"],
      cyrillic: /\b\u0430\u043d\u043a\u0430\u0440\u0430/u,
    },
    {
      city: "Izmir",
      latin: ["izmir", "izmeer"],
      cyrillic: /\b\u0438\u0437\u043c\u0438\u0440/u,
    },
    {
      city: "Antalya",
      latin: ["antalya"],
      cyrillic: /\b\u0430\u043d\u0442\u0430\u043b\u044c\u044f/u,
    },
    {
      city: "Bursa",
      latin: ["bursa"],
      cyrillic: /\b\u0431\u0443\u0440\u0441\u0430/u,
    },
  ];

  for (const rule of cityRules) {
    if (rule.latin.some((token) => folded.includes(token))) return rule.city;
    if (rule.cyrillic.test(raw)) return rule.city;
  }

  return "";
}

function hasInstallmentIntent(text = "") {
  const folded = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(installment|payment plan|monthly payment|mortgage)\b/.test(folded) ||
    /\b(taksit|odeme plani|kampanya)\b/.test(folded) ||
    /\b(\u0440\u0430\u0441\u0441\u0440\u043e\u0447|\u0438\u043f\u043e\u0442\u0435\u043a)\b/u.test(raw)
  );
}

function hasPropertyIntent(text = "") {
  const folded = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  const hasRoomPattern = /\b\d+\s*\+\s*\d+\b/.test(raw);
  const hasBudget = extractBudgetCandidates(text).length > 0 || Boolean(detectBudgetCurrencyFromText(text));
  const hasLatinPropertyTerm =
    /\b(property|properties|real estate|apartment|apartments|flat|villa|house|home|listing|listings|project|projects|resale|buy|sale)\b/.test(
      folded
    ) ||
    /\b(emlak|daire|konut|villa|ev|satilik|satin almak|proje|projeler|yatirim|oda)\b/.test(folded);
  const hasCyrillicPropertyTerm =
    /\b(\u043d\u0435\u0434\u0432\u0438\u0436|\u043a\u0432\u0430\u0440\u0442\u0438\u0440|\u0432\u0438\u043b\u043b|\u0434\u043e\u043c|\u043f\u0440\u043e\u0435\u043a\u0442|\u043a\u0443\u043f\u0438\u0442|\u043f\u0440\u043e\u0434\u0430\u0436|\u0440\u0430\u0441\u0441\u0440\u043e\u0447)\w*/u.test(
      raw
    );

  if (hasRoomPattern) return true;
  if (hasInstallmentIntent(text)) return true;
  if (hasLatinPropertyTerm || hasCyrillicPropertyTerm) return true;
  if (hasBudget && (detectCityFromText(text) || inferLocationTokensFromText(text).length > 0)) return true;
  return false;
}

function isBroadDistrictAlias(value = "") {
  const normalized = toFoldedText(value);
  const raw = String(value || "").toLowerCase();
  return (
    containsAnyPhrase(normalized, [
      "avrupa yakasi",
      "avrupa",
      "anadolu yakasi",
      "anadolu",
      "european side",
      "asian side",
      "europe side",
      "asia side",
      "europe part",
      "asia part",
      "european part",
      "asian part",
    ]) ||
    /\b(европейская сторона|азиатская сторона|европейская часть|азиатская часть)\b/u.test(
      raw
    )
  );
}

function buildPropertyFallbackSearchArgs({
  userMessage = "",
  inferredBudgetCurrency = "",
  inferredPropertyScope = "all",
  exactPriceIntent = false,
  strictBudgetIntent = false,
} = {}) {
  const room = normalizeRoomToken(userMessage);
  const city = detectCityFromText(userMessage);
  const locationKeywords = inferLocationTokensFromText(userMessage);
  const budgetArgs = extractBudgetConstraintsFromText(userMessage, {
    inferredBudgetCurrency,
    exactPriceIntent,
    strictBudgetIntent,
  });

  const args = {
    limit: 6,
    ...budgetArgs,
  };

  if (inferredPropertyScope !== "all") {
    args.property_scope = inferredPropertyScope;
  }
  if (room) {
    args.rooms = room;
  }
  if (city) {
    args.city = city;
  }
  if (hasInstallmentIntent(userMessage)) {
    args.installment_plan = true;
  }
  if (locationKeywords.length > 0) {
    args.keywords = locationKeywords;
  }

  const sideDistricts = resolveIstanbulSideDistricts(userMessage);
  if (sideDistricts) {
    args.districts = sideDistricts;
    if (!args.city) args.city = "istanbul";
  }

  return args;
}

function detectPropertyScopeFromText(text = "") {
  const value = toFoldedText(text);
  const raw = String(text || "").toLowerCase();

  if (
    /\b(in projects|project only|only projects|projects)\b/.test(value) ||
    /\b(proje|projeler|sadece proje|yalniz proje|projelerde)\b/.test(value) ||
    /\b(\u0432 \u043f\u0440\u043e\u0435\u043a\u0442\u0430\u0445|\u043f\u0440\u043e\u0435\u043a\u0442\u044b|\u0442\u043e\u043b\u044c\u043a\u043e \u043f\u0440\u043e\u0435\u043a\u0442\u044b)\b/u.test(
      raw
    )
  ) {
    return "projects";
  }

  if (
    /\b(listing|listings|resale|only listings|only resale)\b/.test(value) ||
    /\b(ilan|ilanlar|sadece ilan|yalniz ilan)\b/.test(value) ||
    /\b(\u043b\u0438\u0441\u0442\u0438\u043d\u0433|\u043b\u0438\u0441\u0442\u0438\u043d\u0433\u0438|\u043f\u0435\u0440\u0435\u043f\u0440\u043e\u0434\u0430\u0436\u0430|\u0442\u043e\u043b\u044c\u043a\u043e \u043b\u0438\u0441\u0442\u0438\u043d\u0433)\b/u.test(
      raw
    )
  ) {
    return "listings";
  }

  return "all";
}

function hasExactPriceIntent(text = "") {
  const value = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(exact|exactly|precise|specific|same price|equal to)\b/.test(value) ||
    /\b(tam|tam olarak|net fiyat|birebir|ayni fiyat)\b/.test(value) ||
    /\b(\u0442\u043e\u0447\u043d\u043e|\u0440\u043e\u0432\u043d\u043e|\u0438\u043c\u0435\u043d\u043d\u043e)\b/u.test(raw)
  );
}

function hasCitizenshipIntent(text = "") {
  const value = toFoldedText(text);
  const raw = String(text || "").toLowerCase();
  return (
    /\b(citizenship|citizen|investment visa|residency by investment|golden visa)\b/.test(value) ||
    /\b(vatandaslik|yatirimla vatandaslik|turk vatandasligi)\b/.test(value) ||
    /\b(гражданство|инвестици|вид на жительство)\b/u.test(raw)
  );
}

function hasStrictBudgetIntent(text = "") {
  return hasUpperBudgetCue(text) || hasLowerBudgetCue(text) || hasBetweenBudgetCue(text) || hasCitizenshipIntent(text);
}

export async function runRealEstateAssistant({
  message,
  history = [],
  attribution = {},
}) {
  const userMessage = normalizeString(message);
  if (!userMessage) {
    throw new Error("message is required");
  }

  const language = detectLanguage(userMessage);
  const consultantIntent = hasConsultantIntent(userMessage);
  const blogIntent = hasBlogIntent(userMessage);
  const safeHistory = normalizeHistory(history);
  const fallback = FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.en;
  const inferredBudgetCurrency = detectBudgetCurrencyFromText(userMessage);
  const inferredPropertyScope = detectPropertyScopeFromText(userMessage);
  const exactPriceIntent = hasExactPriceIntent(userMessage);
  const strictBudgetIntent = hasStrictBudgetIntent(userMessage);
  const propertyIntent = hasPropertyIntent(userMessage) && !blogIntent && !consultantIntent;

  const openai = getOpenAIClient();
  const messages = [
    { role: "system", content: getSystemPrompt(language) },
    ...safeHistory,
    { role: "user", content: userMessage },
  ];

  let usedTool = false;

  for (let step = 0; step < 6; step += 1) {
    const completion = await createChatCompletionWithFallback(openai, {
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const assistantMessage = completion?.choices?.[0]?.message;
    if (!assistantMessage) break;

    const toolCalls = Array.isArray(assistantMessage.tool_calls)
      ? assistantMessage.tool_calls
      : [];

    if (toolCalls.length === 0) {
      const parsed = safeJsonParse(assistantMessage.content, {});
      const normalized = normalizeAssistantPayload(parsed);
      normalized.results = await enrichAssistantResults(normalized.results);

      if (!blogIntent) {
        normalized.blogs = [];
      }

      if (!usedTool && normalized.results.length > 0) {
        normalized.results = [];
      }
      if (!usedTool && normalized.consultants.length > 0) {
        normalized.consultants = [];
      }
      if (!usedTool && normalized.blogs.length > 0) {
        normalized.blogs = [];
      }

      if (consultantIntent && normalized.consultants.length === 0) {
        const consultantFallback = await searchConsultants(
          {
            keywords: inferConsultantKeywordsFromText(userMessage),
            limit: 4,
          },
          language
        );
        if (consultantFallback.length > 0) {
          normalized.consultants = consultantFallback;
        }
      }
      if (blogIntent && normalized.blogs.length === 0) {
        const blogFallback = await searchBlogs(
          {
            query: userMessage,
            keywords: inferBlogKeywordsFromText(userMessage),
            limit: 3,
          },
          language
        );
        if (blogFallback.length > 0) {
          normalized.blogs = blogFallback;
        }
      }

      if (propertyIntent && normalized.results.length === 0) {
        const propertyFallback = await searchProperties(
          buildPropertyFallbackSearchArgs({
            userMessage,
            inferredBudgetCurrency,
            inferredPropertyScope,
            exactPriceIntent,
            strictBudgetIntent,
          })
        );
        if (propertyFallback.length > 0) {
          normalized.results = propertyFallback;
          if (!normalized.reply || normalized.reply === fallback.noMatch || normalized.reply === fallback.noData) {
            normalized.reply = fallback.found;
          }
        }
      }

      if (!normalized.reply) {
        normalized.reply =
          normalized.results.length > 0 ||
          normalized.consultants.length > 0 ||
          normalized.blogs.length > 0
          ? fallback.found
          : fallback.noMatch;
      }
      if (hasBuyingIntent(userMessage) && !normalized.lead_prompt) {
        normalized.lead_prompt = fallback.leadPrompt;
      }
      return normalized;
    }

    usedTool = true;
    messages.push(assistantMessage);

    for (const call of toolCalls) {
      const name = call?.function?.name;
      const args = safeJsonParse(call?.function?.arguments, {}) || {};
      let toolOutput;

      if (name === TOOL_NAMES.searchProperties) {
        const hasBudget =
          args?.budget_min !== undefined ||
          args?.budget_max !== undefined ||
          args?.budget_exact !== undefined ||
          args?.budgetMin !== undefined ||
          args?.budgetMax !== undefined ||
          args?.budgetExact !== undefined;

        let searchArgs =
          hasBudget && inferredBudgetCurrency && !args?.budget_currency && !args?.budgetCurrency
            ? { ...args, budget_currency: inferredBudgetCurrency }
            : args;

        if (
          inferredPropertyScope !== "all" &&
          !normalizeString(searchArgs?.property_scope) &&
          !normalizeString(searchArgs?.propertyScope)
        ) {
          searchArgs = {
            ...searchArgs,
            property_scope: inferredPropertyScope,
          };
        }

        if (exactPriceIntent) {
          const exactCandidate = normalizeNumber(
            searchArgs?.budget_exact ?? searchArgs?.budgetExact,
            NaN
          );
          const minCandidate = normalizeNumber(
            searchArgs?.budget_min ?? searchArgs?.budgetMin,
            NaN
          );
          const maxCandidate = normalizeNumber(
            searchArgs?.budget_max ?? searchArgs?.budgetMax,
            NaN
          );
          const resolvedExact = Number.isFinite(exactCandidate)
            ? exactCandidate
            : Number.isFinite(minCandidate) && !Number.isFinite(maxCandidate)
            ? minCandidate
            : Number.isFinite(maxCandidate) && !Number.isFinite(minCandidate)
            ? maxCandidate
            : Number.isFinite(minCandidate) &&
              Number.isFinite(maxCandidate) &&
              Math.abs(minCandidate - maxCandidate) <= 1
            ? minCandidate
            : NaN;

          searchArgs = {
            ...searchArgs,
            exact_price: true,
          };
          if (Number.isFinite(resolvedExact)) {
            searchArgs.budget_exact = resolvedExact;
            searchArgs.budget_min = resolvedExact;
            searchArgs.budget_max = resolvedExact;
          }
        }

        const aiSentFlex =
          searchArgs?.budget_flex_percent !== undefined ||
          searchArgs?.budgetFlexPercent !== undefined;
        if (
          hasBudget &&
          !exactPriceIntent &&
          !strictBudgetIntent &&
          !aiSentFlex
        ) {
          searchArgs = {
            ...searchArgs,
            budget_flex_percent: 15,
          };
        }

        const hasExplicitLocation =
          normalizeString(searchArgs?.city) ||
          normalizeString(searchArgs?.district) ||
          normalizeString(searchArgs?.neighborhood);
        const existingKeywords = Array.isArray(searchArgs?.keywords)
          ? searchArgs.keywords.map((k) => normalizeString(k)).filter(Boolean)
          : [];

        // Single-term location queries like "kozapark" should still hit the DB.
        if (!hasExplicitLocation && existingKeywords.length === 0) {
          const inferredTokens = inferLocationTokensFromText(userMessage);
          if (inferredTokens.length > 0) {
            searchArgs = {
              ...searchArgs,
              keywords: inferredTokens,
            };
            if (inferredTokens.length === 1 && !normalizeString(searchArgs.neighborhood)) {
              searchArgs.neighborhood = inferredTokens[0];
            }
          }
        }

        if (
          !normalizeString(searchArgs?.district) &&
          !(Array.isArray(searchArgs?.districts) && searchArgs.districts.length > 0)
        ) {
          const userSideDistricts = resolveIstanbulSideDistricts(userMessage);
          if (userSideDistricts) {
            searchArgs = { ...searchArgs, districts: userSideDistricts };
            if (!normalizeString(searchArgs?.city)) {
              searchArgs.city = "istanbul";
            }
          }
        }

        toolOutput = await searchProperties(searchArgs);
        if (Array.isArray(toolOutput) && toolOutput.length === 0 && propertyIntent) {
          const explicitScope = normalizeString(searchArgs?.property_scope || searchArgs?.propertyScope);
          const fallbackArgs = buildPropertyFallbackSearchArgs({
            userMessage,
            inferredBudgetCurrency,
            inferredPropertyScope: explicitScope
              ? normalizePropertyScope(explicitScope)
              : inferredPropertyScope,
            exactPriceIntent,
            strictBudgetIntent,
          });

          const preferredRooms = normalizeString(searchArgs?.rooms);
          if (preferredRooms) {
            fallbackArgs.rooms = preferredRooms;
          }

          const preferredLimit = normalizeNumber(searchArgs?.limit, NaN);
          if (Number.isFinite(preferredLimit)) {
            fallbackArgs.limit = preferredLimit;
          }

          const fallbackResults = await searchProperties(fallbackArgs);
          if (Array.isArray(fallbackResults) && fallbackResults.length > 0) {
            toolOutput = fallbackResults;
          }
        }
      } else if (name === TOOL_NAMES.getPropertyById) {
        toolOutput = await getPropertyById(args.id);
      } else if (name === TOOL_NAMES.searchConsultants) {
        toolOutput = await searchConsultants(args, language);
      } else if (name === TOOL_NAMES.searchBlogs) {
        toolOutput = blogIntent ? await searchBlogs(args, language) : [];
      } else if (name === TOOL_NAMES.createLead) {
        toolOutput = await createLead(args, attribution);
      } else {
        toolOutput = { error: "Unknown tool" };
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(toolOutput),
      });
    }
  }

  const response = {
    reply: fallback.noData,
    results: [],
    consultants: [],
    blogs: [],
  };
  if (consultantIntent) {
    response.consultants = await searchConsultants({ limit: 4 }, language);
    response.reply =
      response.consultants.length > 0 ? fallback.found : fallback.noMatch;
  }
  if (blogIntent) {
    response.blogs = await searchBlogs(
      {
        query: userMessage,
        keywords: inferBlogKeywordsFromText(userMessage),
        limit: 3,
      },
      language
    );
    if (!response.consultants.length) {
      response.reply = response.blogs.length > 0 ? fallback.found : fallback.noMatch;
    }
  }
  if (propertyIntent) {
    response.results = await searchProperties(
      buildPropertyFallbackSearchArgs({
        userMessage,
        inferredBudgetCurrency,
        inferredPropertyScope,
        exactPriceIntent,
        strictBudgetIntent,
      })
    );
    response.reply = response.results.length > 0 ? fallback.found : fallback.noMatch;
  }
  if (hasBuyingIntent(userMessage)) {
    response.lead_prompt = fallback.leadPrompt;
  }
  return response;
}


