import { normalizeAiLocale } from "../../constants/aiSalesAgent.js";

const EMAIL_REGEX = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/;
const ROOM_REGEX = /\b(\d+)\s*\+\s*(\d+)\b/;
const MAX_TEXT_LENGTH = 1600;
const MAX_REASONABLE_BUDGET_VALUE = 500000000;
const SINGLE_BUDGET_TARGET_FLEX_PERCENT = 15;
const PHONE_MIN_DIGITS = 10;
const GROUPED_THOUSANDS_REGEX = /^\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?$/;
const PHONE_FORMATTING_HINT_REGEX = /[()+\-\s]/;
const BUDGET_CONTEXT_HINT_REGEX =
  /[$€₺]|usd|eur|try|tl|dollar|dolar|euro|lira|budget|price|cost|under|below|upto|up to|from|over|above|max|min|butce|fiyat|bedel|odeme|payment|k|m|mn|bin|milyon|million|دلار|یورو|لیر|بودجه|قیمت|پرداخت|میلیون|هزار|حداکثر|حداقل|زیر|بالا|بین/iu;

const PURPOSE_RULES = [
  { value: "investment", patterns: ["investment", "invest", "yatirim", "инвест"] },
  { value: "living", patterns: ["living", "live", "oturum", "yasamak", "прожив", "жить"] },
  {
    value: "citizenship",
    patterns: ["citizenship", "passport", "vatandaslik", "граждан", "паспорт"],
  },
  {
    value: "rental_income",
    patterns: ["rental income", "rent", "kira", "аренд", "сдач"],
  },
];

const PROPERTY_TYPE_RULES = [
  { value: "apartment", patterns: ["apartment", "flat", "daire", "квартир"] },
  { value: "villa", patterns: ["villa", "вилла"] },
  { value: "office", patterns: ["office", "ofis", "офис"] },
  { value: "commercial", patterns: ["commercial", "shop", "ticari", "коммерч"] },
  { value: "townhouse", patterns: ["townhouse", "таунхаус"] },
  { value: "penthouse", patterns: ["penthouse", "пентхаус"] },
  { value: "land", patterns: ["land", "plot", "arsa", "земл"] },
];

const PAYMENT_PLAN_RULES = [
  { value: "installment", patterns: ["installment", "payment plan", "rassroch", "taksit"] },
  { value: "flexible", patterns: ["flexible", "esnek", "gibkiy", "flexible payment"] },
  { value: "cash", patterns: ["cash", "pesin", "налич", "full payment"] },
];

const CONTACT_METHOD_RULES = [
  { value: "whatsapp", patterns: ["whatsapp", "whats app"] },
  { value: "phone", patterns: ["phone", "call", "telefon", "звон"] },
  { value: "email", patterns: ["email", "e-mail", "mail", "eposta", "posta", "почт"] },
];

const CONSULTATION_MODE_RULES = [
  { value: "visit", patterns: ["visit", "viewing", "showing", "ziyaret", "gosteri", "показ", "визит"] },
  { value: "online", patterns: ["online", "zoom", "video call", "gorusme", "онлайн", "видео"] },
];

const TIMELINE_RULES = [
  {
    value: "just_researching",
    patterns: ["just researching", "researching", "arastiriyorum", "izuchayu", "poka izuchayu"],
  },
  {
    value: "immediate",
    patterns: ["immediate", "asap", "right away", "hemen", "acil", "сразу", "срочно"],
  },
  {
    value: "within_1_month",
    patterns: ["1 month", "one month", "bir ay", "1 ay", "месяц"],
  },
  {
    value: "within_3_months",
    patterns: ["3 months", "three months", "3 ay", "uc ay", "3 месяца"],
  },
  {
    value: "within_6_plus_months",
    patterns: ["6 months", "6+ months", "after 6", "6 ay", "6 месяцев"],
  },
];

const DELIVERY_STATUS_RULES = [
  { value: "ready", patterns: ["ready to move", "ready", "teslime hazir", "gotov k vseleniyu", "hazir"] },
  { value: "under_construction", patterns: ["under construction", "off-plan", "off plan", "insaat halinde", "insaat", "stroyashchiy"] },
  { value: "no_preference", patterns: ["no preference", "fark etmez", "bez predpochteni"] },
];

const DOWN_PAYMENT_RULES = [
  { value: "50%+", patterns: ["50%", "50 percent", "yarisi", "polovina"] },
  { value: "30%", patterns: ["30%", "30 percent", "yuzde 30"] },
  { value: "20%", patterns: ["20%", "20 percent", "yuzde 20"] },
  { value: "need_guidance", patterns: ["need guidance", "guidance", "yonlendirme", "konsultats"] },
];

const BUYER_PROFILE_RULES = [
  { value: "large_family", patterns: ["large family", "big family", "kalabalik aile", "bolshaya semya"] },
  { value: "family", patterns: ["family with children", "family", "cocuklu aile", "aile", "semya s detmi", "semya"] },
  { value: "couple", patterns: ["couple", "cift", "para"] },
  { value: "single", patterns: ["single", "alone", "bekar", "tek", "odin"] },
];

const AMENITY_RULES = [
  { value: "near_metro", patterns: ["near metro", "metro", "metroya yakin", "ryadom s metro"] },
  { value: "parking", patterns: ["parking", "otopark", "parkovka"] },
  { value: "security", patterns: ["security", "guvenlik", "bezopasnost", "7/24", "24/7"] },
  { value: "family_concept", patterns: ["family concept", "aile konsepti", "semeyniy kontsept"] },
  { value: "pool_gym", patterns: ["pool", "gym", "swimming", "havuz", "spor", "basseyn", "sportzal"] },
  { value: "sea_view", patterns: ["sea view", "ocean view", "deniz manzara", "vid na more"] },
  { value: "title_deed_ready", patterns: ["title deed", "tapu", "deed ready"] },
];

const LEAD_INTENT_RULES = [
  { value: "price_list", patterns: ["price list", "fiyat listesi", "prayis", "all prices"] },
  { value: "payment_plan", patterns: ["payment plan", "odeme plani", "plan oplaty", "taksit plani"] },
  { value: "consultation", patterns: ["consultation", "consult", "gorusme", "danisman", "konsultats"] },
  { value: "send_details", patterns: ["send details", "send to email", "detaylari gonder", "otpravte detali", "send all"] },
];

const PREFERRED_AREA_RULES = [
  {
    value: "european_side",
    patterns: [
      "european side",
      "europe side",
      "avrupa yakasi",
      "avrupa",
      "evropeyskaya",
      "سمت اروپایی",
      "طرف اروپایی",
      "اروپایی",
    ],
  },
  {
    value: "asian_side",
    patterns: [
      "asian side",
      "asia side",
      "anadolu yakasi",
      "anadolu",
      "aziatskaya",
      "سمت آسیایی",
      "طرف آسیایی",
      "آسیایی",
      "آنادولو",
    ],
  },
  { value: "central_istanbul", patterns: ["central istanbul", "center", "merkez istanbul", "merkez", "tsentr stambula", "tsentr"] },
  { value: "cyprus", patterns: ["cyprus", "kibris", "kipr", "قبرس"] },
  { value: "greece", patterns: ["greece", "yunanistan", "gretsiya", "یونان"] },
  { value: "dubai", patterns: ["dubai", "dubay", "dubay", "دبی"] },
  { value: "georgia", patterns: ["georgia", "gurcistan", "gruziya", "گرجستان"] },
  { value: "near_metro", patterns: ["near metro", "close to metro", "metroya yakin", "ryadom s metro"] },
  { value: "no_preference", patterns: ["no preference", "no area preference", "fark etmez", "bolge tercihi yok", "bez predpochteni"] },
];

const CITIZENSHIP_NEED_RULES = [
  { value: "maybe", patterns: ["maybe", "possibly", "belki", "olabilir", "acigim", "vozmozhno", "otkryt"] },
];

const PREFERRED_LANGUAGE_RULES = [
  { value: "en", patterns: ["english", "ingilizce", "angliyskiy"] },
  { value: "tr", patterns: ["turkish", "turkce", "turetskiy"] },
  { value: "ru", patterns: ["russian", "rusca", "russkiy"] },
  { value: "ar", patterns: ["arabic", "arapca", "arabskiy"] },
];

const FALLBACK_PREFERENCE_RULES = [
  { value: "above_budget", patterns: ["above budget", "slightly above", "butce ustunde", "vyshe byudzheta"] },
  { value: "nearby_areas", patterns: ["nearby area", "nearby", "yakin bolge", "sosednie rayon"] },
  { value: "both", patterns: ["both", "ikisi de", "oba variant"] },
  { value: "keep_exact", patterns: ["keep exact", "exact filter", "ayni filtre", "tochnye filtr"] },
];

const CITY_HINTS = [
  "istanbul",
  "ankara",
  "izmir",
  "antalya",
  "bursa",
  "kyrenia",
  "dubai",
  "cyprus",
  "greece",
  "georgia",
];

const NAME_PATTERNS = [
  /\bmy name is\s+([a-z][a-z\s'-]{1,50})/i,
  /\bi am\s+([a-z][a-z\s'-]{1,50})/i,
  /\bthis is\s+([a-z][a-z\s'-]{1,50})/i,
  /\badim\s+([a-z][a-z\s'-]{1,50})/i,
  /\bismim\s+([a-z][a-z\s'-]{1,50})/i,
  /\bben\s+([a-z][a-z\s'-]{1,50})/i,
  /\bmenya zovut\s+([a-zа-яё][a-zа-яё\s'-]{1,50})/iu,
  /\bya\s+([a-zа-яё][a-zа-яё\s'-]{1,50})/iu,
];

const NATIONALITY_PATTERNS = [
  /\bfrom\s+([a-z][a-z\s'-]{1,40})/i,
  /\bnationality\s+is\s+([a-z][a-z\s'-]{1,40})/i,
  /\buyrugum\s+([a-z][a-z\s'-]{1,40})/i,
  /\bvatandasiyim\s+([a-z][a-z\s'-]{1,40})/i,
  /\bgrazhdanstvo\s+([a-zа-яё][a-zа-яё\s'-]{1,40})/iu,
  /\biz\s+([a-zа-яё][a-zа-яё\s'-]{1,40})/iu,
];

const LOCATION_PATTERNS = [
  /\bin\s+([a-z][a-z0-9\s'-]{2,60})/i,
  /\barea\s+([a-z][a-z0-9\s'-]{2,60})/i,
  /\bbolge\s+([a-z][a-z0-9\s'-]{2,60})/i,
  /\blokasyon\s+([a-z][a-z0-9\s'-]{2,60})/i,
  /\brayon\s+([a-zа-яё0-9\s'-]{2,60})/iu,
];

const STANDALONE_LOCATION_REJECT_PHRASES = new Set([
  "hi",
  "hello",
  "merhaba",
  "selam",
  "yes",
  "no",
  "ok",
  "okay",
  "tamam",
  "thanks",
  "thank you",
  "no thanks",
]);

const LOCATION_ALIASES = [
  { canonical: "Istanbul", type: "city", city: "Istanbul", aliases: ["istanbul", "stambul"] },
  { canonical: "Ankara", type: "city", city: "Ankara", aliases: ["ankara"] },
  { canonical: "Izmir", type: "city", city: "Izmir", aliases: ["izmir"] },
  { canonical: "Antalya", type: "city", city: "Antalya", aliases: ["antalya"] },
  { canonical: "Dubai", type: "city", city: "Dubai", aliases: ["dubai"] },
  { canonical: "Kyrenia", type: "city", city: "Kyrenia", aliases: ["kyrenia", "girne"] },
  { canonical: "Bahcesehir", type: "district", city: "Istanbul", aliases: ["bahcesehir", "bahcesehir", "bahçesehir"] },
  { canonical: "Basaksehir", type: "district", city: "Istanbul", aliases: ["basaksehir", "başakşehir", "basak sehir", "basaksehir"] },
  { canonical: "Beylikduzu", type: "district", city: "Istanbul", aliases: ["beylikduzu", "beylikdüzü", "beylik duzu"] },
  { canonical: "Esenyurt", type: "district", city: "Istanbul", aliases: ["esenyurt"] },
  { canonical: "Sisli", type: "district", city: "Istanbul", aliases: ["sisli", "şişli"] },
  { canonical: "Besiktas", type: "district", city: "Istanbul", aliases: ["besiktas", "beşiktaş"] },
  { canonical: "Kadikoy", type: "district", city: "Istanbul", aliases: ["kadikoy", "kadıköy"] },
  { canonical: "Atasehir", type: "district", city: "Istanbul", aliases: ["atasehir", "ataşehir"] },
  { canonical: "Uskudar", type: "district", city: "Istanbul", aliases: ["uskudar", "üsküdar"] },
  { canonical: "Maslak", type: "district", city: "Istanbul", aliases: ["maslak"] },
  { canonical: "Zeytinburnu", type: "district", city: "Istanbul", aliases: ["zeytinburnu"] },
  { canonical: "Kartal", type: "district", city: "Istanbul", aliases: ["kartal"] },
  { canonical: "Pendik", type: "district", city: "Istanbul", aliases: ["pendik"] },
];

const normalizeDigits = (value) =>
  String(value || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizeLocaleText = (value) =>
  String(value || "")
    .replace(/\u00c3\u00a7|[\u00e7\u00c7]/g, "c")
    .replace(/\u00c4\u009f|[\u011f\u011e]/g, "g")
    .replace(/\u00c3\u00b6|[\u00f6\u00d6]/g, "o")
    .replace(/\u00c5\u009f|[\u015f\u015e]/g, "s")
    .replace(/\u00c3\u00bc|[\u00fc\u00dc]/g, "u")
    .replace(/\u00c4\u00b1|\u00c4\u00b0|[\u0131\u0130]/g, "i");

const normalizePersianSearchTerms = (value) =>
  String(value || "")
    .replace(
      /\u0633\u0645\u062a\s+\u0622\u0633\u06cc\u0627\u06cc\u06cc|\u0637\u0631\u0641\s+\u0622\u0633\u06cc\u0627\u06cc\u06cc|\u0622\u0633\u06cc\u0627\u06cc\u06cc/gu,
      " asian side "
    )
    .replace(
      /\u0633\u0645\u062a\s+\u0627\u0631\u0648\u067e\u0627\u06cc\u06cc|\u0637\u0631\u0641\s+\u0627\u0631\u0648\u067e\u0627\u06cc\u06cc|\u0627\u0631\u0648\u067e\u0627\u06cc\u06cc/gu,
      " european side "
    )
    .replace(/\u0622\u0646\u0627\u062f\u0648\u0644\u0648/gu, " anadolu ")
    .replace(/\u062f\u0644\u0627\u0631/gu, " dollar ")
    .replace(/\u06cc\u0648\u0631\u0648/gu, " euro ")
    .replace(/\u0644\u06cc\u0631/gu, " lira ")
    .replace(/\u0645\u06cc\u0644\u06cc\u0648\u0646/gu, " million ")
    .replace(/\u0647\u0632\u0627\u0631/gu, " bin ")
    .replace(/\u0628\u0648\u062f\u062c\u0647/gu, " budget ")
    .replace(/\u0642\u06cc\u0645\u062a/gu, " price ")
    .replace(/\u0628\u06cc\u0646/gu, " between ")
    .replace(/\u062d\u062f\u0627\u06a9\u062b\u0631/gu, " max ")
    .replace(/\u062d\u062f\u0627\u0642\u0644/gu, " min ")
    .replace(/\u0632\u06cc\u0631/gu, " under ")
    .replace(
      /\u0628\u0627\u0644\u0627\u062a\u0631\s+\u0627\u0632|\u0628\u06cc\u0634\u062a\u0631\s+\u0627\u0632|\u0628\u0627\u0644\u0627\u06cc/gu,
      " above "
    )
    .replace(/\u06a9\u0645\u062a\u0631\s+\u0627\u0632/gu, " below ")
    .replace(/\u067e\u0631\u062f\u0627\u062e\u062a/gu, " payment ");

const sanitizeText = (value) =>
  normalizeDigits(normalizeLocaleText(normalizePersianSearchTerms(value)))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);

const toFolded = (value) =>
  sanitizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i");

const findLocationAlias = (text = "") => {
  const folded = toFolded(text);
  if (!folded) return null;

  return (
    LOCATION_ALIASES.find((entry) =>
      entry.aliases.some((alias) => folded.includes(toFolded(alias)))
    ) || null
  );
};

const detectCurrencyEnhanced = (text) => {
  const normalized = sanitizeText(text);
  const raw = normalized;
  const folded = toFolded(normalized);

  if (
    /\$/.test(normalized) ||
    /\busd\b|\bdollar\b|\bdolar\b|\bدلار\b/u.test(folded)
  ) {
    return "USD";
  }
  if (/€|\beur\b|\beuro\b|\bیورو\b/u.test(raw) || /\beur\b|\beuro\b|\bیورو\b/u.test(folded)) {
    return "EUR";
  }
  if (/₺|\btry\b|\btl\b|\blira\b|\bلیر\b/u.test(raw) || /\btry\b|\btl\b|\blira\b|\bلیر\b/u.test(folded)) {
    return "TRY";
  }

  return "";
};

const capitalizeWords = (value) =>
  sanitizeText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const cleanExtractedName = (value) =>
  capitalizeWords(
    String(value || "")
      .split(/\b(?:and|ve|ile|whatsapp|phone|email|e-mail)\b/i)[0]
      .split(/[,.!?:;]/)[0]
  );

const detectCurrencyForLead = (text) => {
  const raw = String(text || "");
  const folded = toFolded(text);

  if (/\bدلار\b/u.test(raw) || /\bدلار\b/u.test(folded)) return "USD";
  if (/\bیورو\b/u.test(raw) || /\bیورو\b/u.test(folded)) return "EUR";
  if (/\bلیر\b/u.test(raw) || /\bلیر\b/u.test(folded)) return "TRY";

  return detectCurrencyEnhanced(text) || detectCurrency(text);
};

const isLikelyPhoneCandidate = (candidate = "", context = "") => {
  const normalized = String(candidate || "").trim();
  if (!normalized) return false;

  const digitsOnly = normalized.replace(/\D/g, "");
  if (digitsOnly.length < PHONE_MIN_DIGITS) return false;

  const compactContext = String(context || "").replace(/\s+/g, "");
  if (BUDGET_CONTEXT_HINT_REGEX.test(compactContext)) return false;

  if (GROUPED_THOUSANDS_REGEX.test(normalized) && !normalized.startsWith("+")) {
    return false;
  }

  if (
    !PHONE_FORMATTING_HINT_REGEX.test(normalized) &&
    digitsOnly.length < PHONE_MIN_DIGITS + 1
  ) {
    return false;
  }

  return true;
};

const findLikelyPhoneMatch = (text) => {
  const source = sanitizeText(text);
  const matches = source.matchAll(new RegExp(PHONE_REGEX.source, "g"));

  for (const match of matches) {
    const candidate = match?.[1] || match?.[0] || "";
    const start = Number(match?.index) || 0;
    const end = start + candidate.length;
    const context = source.slice(Math.max(0, start - 8), Math.min(source.length, end + 8));
    if (isLikelyPhoneCandidate(candidate, context)) {
      return candidate;
    }
  }

  return "";
};

const stripLikelyPhoneNumbers = (text) => {
  const source = sanitizeText(text);
  return source.replace(new RegExp(PHONE_REGEX.source, "g"), (match, captured, offset) => {
    const candidate = captured || match;
    const start = Number(offset) || 0;
    const end = start + candidate.length;
    const context = source.slice(Math.max(0, start - 8), Math.min(source.length, end + 8));
    return isLikelyPhoneCandidate(candidate, context) ? " " : match;
  });
};

const extractNameFallback = (text) => {
  const candidate = stripLikelyPhoneNumbers(text)
    .replace(EMAIL_REGEX, " ")
    .replace(
      /\b(?:my name is|i am|this is|adim|ismim|ben|whatsapp|phone|email|e-mail|number|numara|contact|call me|reach me)\b/giu,
      " "
    )
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = candidate
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 3);

  if (words.length === 0 || words.length > 3) {
    return "";
  }

  return capitalizeWords(words.join(" "));
};

const parseNumericToken = (token) => {
  const normalized = String(token || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  if (!normalized) return NaN;

  let multiplier = 1;
  let value = normalized;

  if (/(k|bin|هزار)$/u.test(value)) {
    multiplier = 1000;
    value = value.replace(/(k|bin|هزار)$/gu, "");
  } else if (/(m|mn|milyon|million|میلیون)$/u.test(value)) {
    multiplier = 1000000;
    value = value.replace(/(m|mn|milyon|million|میلیون)$/gu, "");
  }

  const cleaned = value.replace(/[^\d.,]/g, "");
  if (!cleaned) return NaN;

  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  let normalizedNumber = cleaned;

  if (commaCount > 0 && dotCount > 0) {
    const decimalSeparator = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";
    normalizedNumber = cleaned.split(thousandSeparator).join("");
    if (decimalSeparator === ",") {
      normalizedNumber = normalizedNumber.replace(/,/g, ".");
    }
  } else if (commaCount > 1 || dotCount > 1) {
    normalizedNumber = cleaned.replace(/[.,]/g, "");
  } else if (commaCount === 1 && dotCount === 0) {
    const parts = cleaned.split(",");
    normalizedNumber = parts[1]?.length === 3 ? parts.join("") : cleaned.replace(",", ".");
  } else if (dotCount === 1 && commaCount === 0) {
    const parts = cleaned.split(".");
    normalizedNumber = parts[1]?.length === 3 ? parts.join("") : cleaned;
  }

  const parsed = Number(normalizedNumber);
  return Number.isFinite(parsed) ? parsed * multiplier : NaN;
};

const detectCurrency = (text) => {
  const folded = toFolded(text);
  if (/(^|[\s(])\$/.test(String(text || "")) || /\busd\b|\bdollar\b|\bdolar\b|доллар/u.test(folded)) {
    return "USD";
  }
  if (/€|\beur\b|\beuro\b|евро/u.test(String(text || ""))) {
    return "EUR";
  }
  if (/₺|\btry\b|\btl\b|\blira\b|лира/u.test(String(text || ""))) {
    return "TRY";
  }
  return "";
};

const hasAnyPattern = (text, patterns = []) =>
  patterns.some((pattern) => toFolded(text).includes(pattern));

const extractRuleValue = (text, rules = []) => {
  const folded = toFolded(text);
  const matchedRule = rules.find((rule) =>
    rule.patterns.some((pattern) => folded.includes(pattern))
  );
  return matchedRule?.value || "";
};

const extractName = (text) => {
  const sanitized = sanitizeText(text);
  for (const pattern of NAME_PATTERNS) {
    const match = sanitized.match(pattern);
    if (match?.[1]) {
      return cleanExtractedName(match[1]);
    }
  }

  if (findLikelyPhoneMatch(sanitized) || EMAIL_REGEX.test(sanitized)) {
    return extractNameFallback(sanitized);
  }

  return "";
};

const normalizePhone = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return hasPlus ? `+${digits}` : digits;
};

const extractPhone = (text) => normalizePhone(findLikelyPhoneMatch(text));

const extractEmail = (text) => sanitizeText(text).match(EMAIL_REGEX)?.[1] || "";

const extractNationality = (text) => {
  for (const pattern of NATIONALITY_PATTERNS) {
    const match = sanitizeText(text).match(pattern);
    if (match?.[1]) return capitalizeWords(match[1]);
  }
  return "";
};

const extractRoomType = (text) => {
  const match = sanitizeText(text).match(ROOM_REGEX);
  return match ? `${match[1]}+${match[2]}` : "";
};

const extractBudget = (text) => {
  const rawText = stripLikelyPhoneNumbers(text);
  const currency = detectCurrencyEnhanced(rawText) || detectCurrency(rawText);
  const candidates = Array.from(
    rawText.matchAll(
      /\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d+)?(?:\s?(?:k|m|mn|bin|milyon|million|هزار|میلیون))?|\d+(?:[.,]\d+)?(?:\s?(?:k|m|mn|bin|milyon|million|هزار|میلیون))?/giu
    )
  )
    .map((match) => parseNumericToken(match[0]))
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value >= 1000 &&
        value <= MAX_REASONABLE_BUDGET_VALUE
    )
    .slice(0, 4);

  if (candidates.length === 0) {
    return { currency };
  }

  const folded = toFolded(rawText);
  const hasPersianBudgetCue =
    /بودجه|قیمت|زیر|بالا|بین|حداکثر|حداقل|پرداخت/u.test(rawText) ||
    /بودجه|قیمت|زیر|بالا|بین|حداکثر|حداقل|پرداخت/u.test(folded);
  const hasMagnitudeCue =
    /\b(?:k|m|mn|bin|milyon|million)\b|هزار|میلیون/iu.test(rawText);
  const hasBudgetCue =
    Boolean(currency) ||
    /\bbudget\b|\bprice\b|\bcost\b|\bunder\b|\bbelow\b|\bup to\b|\bfrom\b|\bover\b|\babove\b|\bbetween\b|\brange\b|\bmax\b|\bmin\b|\bbutce\b|\bfiyat\b|\bbedel\b|\balti\b|\bustu\b|\barasi\b|\baraliginda\b|\bodeme\b|\bpayment\b|[$€₺]/u.test(
      rawText
    ) ||
    /\bbudget\b|\bprice\b|\bcost\b|\bunder\b|\bbelow\b|\bup to\b|\bfrom\b|\bover\b|\babove\b|\bbetween\b|\brange\b|\bmax\b|\bmin\b|\bbutce\b|\bfiyat\b|\bbedel\b|\balti\b|\bustu\b|\barasi\b|\baraliginda\b|\bpayment\b/u.test(
      folded
    );

  if (
    candidates.length === 1 &&
    candidates[0] >= 1900 &&
    candidates[0] <= 2100 &&
    !(hasBudgetCue || hasPersianBudgetCue)
  ) {
    return { currency };
  }

  if (!(hasBudgetCue || hasPersianBudgetCue) && !currency && !hasMagnitudeCue) {
    return { currency };
  }

  const sorted = [...candidates].sort((a, b) => a - b);
  const hasPersianBetweenCue = /بین/u.test(folded);
  const hasPersianUpperCue = /حداکثر|زیر|کمتر از|تا/u.test(folded);
  const hasPersianLowerCue = /حداقل|بالاتر از|بالای|بیشتر از/u.test(folded);
  const hasBetweenCue =
    /\bbetween\b|\brange\b|\barasi\b|\baraliginda\b|между/u.test(folded);
  const hasUpperCue =
    /\bunder\b|\bbelow\b|\bmax\b|\bup to\b|\balti\b|\baltinda\b|\ben cok\b|до\b|максим/u.test(
      folded
    );
  const hasLowerCue =
    /\bover\b|\babove\b|\bfrom\b|\bmin\b|\ben az\b|\bustu\b|\buzeri\b|от\b|миним/u.test(
      folded
    );

  if ((hasBetweenCue || hasPersianBetweenCue || sorted.length > 1) && sorted.length > 1) {
    return {
      budgetMin: Math.round(sorted[0]),
      budgetMax: Math.round(sorted[1]),
      currency,
    };
  }

  if (hasLowerCue || hasPersianLowerCue) {
    return {
      budgetMin: Math.round(sorted[sorted.length - 1]),
      currency,
    };
  }

  if (hasUpperCue || hasPersianUpperCue) {
    return {
      budgetMax: Math.round(sorted[sorted.length - 1]),
      currency,
    };
  }

  if (sorted.length === 1) {
    const target = Math.round(sorted[0]);
    const flexAmount = target * (SINGLE_BUDGET_TARGET_FLEX_PERCENT / 100);
    return {
      budgetMin: Math.max(0, Math.round(target - flexAmount)),
      budgetMax: Math.round(target + flexAmount),
      currency,
    };
  }

  return {
    budgetMin: Math.round(sorted[0]),
    budgetMax: Math.round(sorted[sorted.length - 1]),
    currency,
  };
};

const extractLocationInterest = (text) => {
  const alias = findLocationAlias(text);
  if (alias) {
    return alias.canonical;
  }

  for (const pattern of LOCATION_PATTERNS) {
    const match = sanitizeText(text).match(pattern);
    if (match?.[1]) {
      const matchedAlias = findLocationAlias(match[1]);
      return matchedAlias?.canonical || capitalizeWords(match[1]);
    }
  }

  const folded = toFolded(text);
  const hintedCity = CITY_HINTS.find((city) => folded.includes(city));
  return hintedCity ? capitalizeWords(hintedCity) : "";
};

const extractCityInterest = (text) => {
  const alias = findLocationAlias(text);
  if (alias?.city) {
    return alias.city;
  }

  const folded = toFolded(text);
  const hintedCity = CITY_HINTS.find((city) => folded.includes(city));
  return hintedCity ? capitalizeWords(hintedCity) : "";
};

const extractStandaloneLocation = (text, pageContext = {}) => {
  const raw = sanitizeText(text);
  if (!raw) return "";

  const folded = toFolded(raw);
  if (STANDALONE_LOCATION_REJECT_PHRASES.has(folded)) {
    return "";
  }

  if (
    PHONE_REGEX.test(raw) ||
    EMAIL_REGEX.test(raw) ||
    ROOM_REGEX.test(raw) ||
    /\d/.test(raw) ||
    Boolean(detectCurrency(raw)) ||
    Boolean(extractRuleValue(raw, PURPOSE_RULES)) ||
    Boolean(extractRuleValue(raw, PROPERTY_TYPE_RULES)) ||
    Boolean(extractRuleValue(raw, PAYMENT_PLAN_RULES)) ||
    Boolean(extractRuleValue(raw, CONTACT_METHOD_RULES)) ||
    Boolean(extractRuleValue(raw, CONSULTATION_MODE_RULES)) ||
    Boolean(extractRuleValue(raw, TIMELINE_RULES)) ||
    extractCitizenshipInterest(raw, pageContext) !== null
  ) {
    return "";
  }

  const candidate = raw
    .replace(
      /\b(?:i want|looking for|interested in|prefer|need|show me|find me|area|district|location|city|project|bolge|bölge|lokasyon|ilce|ilçe|mahalle|sehir|şehir|rayon|gorod)\b/giu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!candidate || !/^[\p{L}\s'-]{3,60}$/u.test(candidate)) {
    return "";
  }

  const wordCount = candidate.split(/\s+/).filter(Boolean).length;
  if (wordCount > 4) {
    return "";
  }

  const alias = findLocationAlias(candidate);
  return alias?.canonical || capitalizeWords(candidate);
};

const extractDistrictInterest = (
  text,
  pageContext = {},
  locationInterest = "",
  cityInterest = ""
) => {
  const currentDistrict = sanitizeText(pageContext?.currentProject?.district);
  if (currentDistrict && toFolded(text).includes(toFolded(currentDistrict))) {
    return currentDistrict;
  }

  const alias = findLocationAlias(text);
  if (alias?.type === "district") {
    return alias.canonical;
  }

  const candidate = sanitizeText(locationInterest) || extractStandaloneLocation(text, pageContext);
  if (!candidate) return "";
  if (cityInterest && toFolded(candidate) === toFolded(cityInterest)) {
    return "";
  }

  return candidate;
};

const extractCitizenshipInterest = (text, pageContext = {}) => {
  const folded = toFolded(text);
  if (
    /\bno\b|\bnot\b|\bwithout\b|\bhayir\b|\byok\b|\bнет\b/u.test(folded) &&
    /\bcitizenship\b|\bpassport\b|\bvatandaslik\b|\bграждан/u.test(folded)
  ) {
    return false;
  }
  if (
    /\byes\b|\bevet\b|\bda\b/u.test(folded) &&
    /\bcitizenship\b|\bpassport\b|\bvatandaslik\b|\bграждан/u.test(folded)
  ) {
    return true;
  }
  if (pageContext?.pageType === "citizenship") return true;
  if (/\bcitizenship\b|\bpassport\b|\bvatandaslik\b|\bграждан/u.test(folded)) {
    return true;
  }
  return null;
};

const extractProjectInterest = (text, pageContext = {}) => {
  if (!pageContext?.currentProjectName) return "";
  const folded = toFolded(text);
  if (
    folded.includes("this project") ||
    folded.includes("this property") ||
    folded.includes(toFolded(pageContext.currentProjectName))
  ) {
    return sanitizeText(pageContext.currentProjectName);
  }
  return "";
};

const detectHighIntent = (text) =>
  /\b(book|reserve|visit|viewing|consult|call me|contact me|hemen|ziyaret|gorusme|показ|консультац)/iu.test(
    sanitizeText(text)
  );

const normalizeAmenities = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeText(v)).filter(Boolean).slice(0, 7);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((v) => sanitizeText(v)).filter(Boolean).slice(0, 7);
  }
  return [];
};

export const normalizeLeadPayload = (value = {}) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const budgetMin = Number(value.budgetMin);
  const budgetMax = Number(value.budgetMax);

  return {
    fullName: sanitizeText(value.fullName || value.name),
    email: sanitizeText(value.email),
    phone: normalizePhone(value.phone),
    preferredContactMethod: sanitizeText(value.preferredContactMethod),
    preferredLanguage: sanitizeText(value.preferredLanguage),
    nationality: sanitizeText(value.nationality),
    budgetMin: Number.isFinite(budgetMin) ? budgetMin : null,
    budgetMax: Number.isFinite(budgetMax) ? budgetMax : null,
    currency: sanitizeText(value.currency).toUpperCase().slice(0, 3),
    purpose: sanitizeText(value.purpose),
    preferredArea: sanitizeText(value.preferredArea),
    locationInterest: sanitizeText(value.locationInterest),
    cityInterest: sanitizeText(value.cityInterest),
    districtInterest: sanitizeText(value.districtInterest),
    projectInterest: sanitizeText(value.projectInterest),
    propertyTypeInterest: sanitizeText(value.propertyTypeInterest),
    roomType: sanitizeText(value.roomType),
    paymentPlan: sanitizeText(value.paymentPlan),
    downPaymentAbility: sanitizeText(value.downPaymentAbility),
    deliveryStatus: sanitizeText(value.deliveryStatus),
    citizenshipNeed: sanitizeText(value.citizenshipNeed),
    citizenshipInterest:
      value.citizenshipInterest === true
        ? true
        : value.citizenshipInterest === false
        ? false
        : null,
    buyerProfile: sanitizeText(value.buyerProfile),
    amenitiesPriorities: normalizeAmenities(value.amenitiesPriorities),
    timeline: sanitizeText(value.timeline),
    fallbackPreference: sanitizeText(value.fallbackPreference),
    leadIntent: sanitizeText(value.leadIntent),
    selectedProjectId: sanitizeText(value.selectedProjectId),
    selectedProjectName: sanitizeText(value.selectedProjectName),
    consultationMode: sanitizeText(value.consultationMode),
    resourceTopic: sanitizeText(value.resourceTopic),
    resourceConsent:
      value.resourceConsent === true
        ? true
        : value.resourceConsent === false
        ? false
        : null,
    resourceOfferShown:
      value.resourceOfferShown === true
        ? true
        : value.resourceOfferShown === false
        ? false
        : null,
    notes: sanitizeText(value.notes || value.note),
    sourcePage: sanitizeText(value.sourcePage),
    aiStage: sanitizeText(value.aiStage),
    aiSessionId: sanitizeText(value.aiSessionId || value.sessionId),
  };
};

export const mergeLeadData = (...leadValues) =>
  leadValues.reduce((accumulator, currentValue) => {
    const normalized = normalizeLeadPayload(currentValue);
    Object.entries(normalized).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        if (value.length === 0) return;
        const existing = Array.isArray(accumulator[key]) ? accumulator[key] : [];
        const merged = [...new Set([...existing, ...value])];
        accumulator[key] = merged;
        return;
      }
      if (typeof value === "string" && !value.trim()) return;
      accumulator[key] = value;
    });
    return accumulator;
  }, {});

const extractAmenities = (text) => {
  const folded = toFolded(text);
  const matched = AMENITY_RULES.filter((rule) =>
    rule.patterns.some((pattern) => folded.includes(pattern))
  ).map((rule) => rule.value);
  return [...new Set(matched)].slice(0, 3);
};

export const extractLeadSignalUpdate = ({
  message,
  existingLead = {},
  pageContext = {},
  locale = "en",
} = {}) => {
  const rawMessage = sanitizeText(message);
  const normalizedLocale = normalizeAiLocale(locale);
  const budget = extractBudget(rawMessage);
  const fullName = extractName(rawMessage);
  const email = extractEmail(rawMessage);
  const phone = extractPhone(rawMessage);
  const propertyTypeInterest = extractRuleValue(rawMessage, PROPERTY_TYPE_RULES);
  const paymentPlan = extractRuleValue(rawMessage, PAYMENT_PLAN_RULES);
  const preferredContactMethod = extractRuleValue(rawMessage, CONTACT_METHOD_RULES);
  const consultationMode = extractRuleValue(rawMessage, CONSULTATION_MODE_RULES);
  const timeline = extractRuleValue(rawMessage, TIMELINE_RULES);
  const purpose = extractRuleValue(rawMessage, PURPOSE_RULES);
  const citizenshipInterest = extractCitizenshipInterest(rawMessage, pageContext);
  const projectInterest = extractProjectInterest(rawMessage, pageContext);
  const standaloneLocation = extractStandaloneLocation(rawMessage, pageContext);
  const matchedLocationAlias = findLocationAlias(rawMessage);
  let cityInterest = extractCityInterest(rawMessage);
  let locationInterest =
    extractLocationInterest(rawMessage) || cityInterest || standaloneLocation;
  const districtInterest = extractDistrictInterest(
    rawMessage,
    pageContext,
    locationInterest || standaloneLocation,
    cityInterest
  );
  if (
    !cityInterest &&
    districtInterest &&
    pageContext?.currentProject?.district &&
    toFolded(pageContext.currentProject.district) === toFolded(districtInterest)
  ) {
    cityInterest = sanitizeText(pageContext.currentProject.city);
  }
  if (!cityInterest && matchedLocationAlias?.city) {
    cityInterest = matchedLocationAlias.city;
  }
  if (!locationInterest && districtInterest) {
    locationInterest = districtInterest;
  }
  const nationality = extractNationality(rawMessage);
  const roomType = extractRoomType(rawMessage);

  const deliveryStatus = extractRuleValue(rawMessage, DELIVERY_STATUS_RULES);
  const downPaymentAbility = extractRuleValue(rawMessage, DOWN_PAYMENT_RULES);
  const buyerProfile = extractRuleValue(rawMessage, BUYER_PROFILE_RULES);
  const amenitiesFromMessage = extractAmenities(rawMessage);
  const leadIntent = extractRuleValue(rawMessage, LEAD_INTENT_RULES);
  const preferredArea = extractRuleValue(rawMessage, PREFERRED_AREA_RULES);
  const preferredLanguageFromMessage = extractRuleValue(rawMessage, PREFERRED_LANGUAGE_RULES);
  const fallbackPreference = extractRuleValue(rawMessage, FALLBACK_PREFERENCE_RULES);

  let citizenshipNeed = "";
  const citizenshipMaybe = extractRuleValue(rawMessage, CITIZENSHIP_NEED_RULES);
  if (citizenshipMaybe) {
    citizenshipNeed = "maybe";
  } else if (citizenshipInterest === true) {
    citizenshipNeed = "yes";
  } else if (citizenshipInterest === false) {
    citizenshipNeed = "no";
  }

  const nextLead = mergeLeadData(existingLead, {
    fullName,
    email,
    phone,
    preferredContactMethod,
    preferredLanguage: preferredLanguageFromMessage || normalizedLocale,
    nationality,
    ...budget,
    purpose,
    preferredArea: preferredArea || (locationInterest && !existingLead.preferredArea ? locationInterest : ""),
    locationInterest,
    cityInterest,
    districtInterest,
    projectInterest,
    propertyTypeInterest,
    roomType,
    paymentPlan,
    downPaymentAbility,
    deliveryStatus,
    citizenshipNeed,
    citizenshipInterest,
    buyerProfile,
    amenitiesPriorities: amenitiesFromMessage,
    timeline,
    fallbackPreference,
    leadIntent,
    consultationMode,
  });

  const updatedFields = Object.keys(nextLead).filter((key) => {
    const previousValue = normalizeLeadPayload(existingLead)[key];
    const nextValue = nextLead[key];
    return JSON.stringify(previousValue) !== JSON.stringify(nextValue);
  });

  return {
    lead: nextLead,
    updatedFields,
    highIntent: detectHighIntent(rawMessage),
    lastMessage: rawMessage,
  };
};

export const getMissingLeadFields = (lead = {}, pageContext = {}) => {
  const normalizedLead = normalizeLeadPayload(lead);
  const required = [];

  if (!normalizedLead.purpose) required.push("purpose");

  if (!normalizedLead.preferredArea) {
    required.push("preferred_area");
  }

  if (!normalizedLead.budgetMin && !normalizedLead.budgetMax) required.push("budget");

  if (!normalizedLead.paymentPlan) required.push("payment_plan");

  const needsDownPayment =
    (normalizedLead.paymentPlan === "installment" ||
      normalizedLead.paymentPlan === "flexible") &&
    !normalizedLead.downPaymentAbility;
  if (needsDownPayment) {
    required.push("down_payment");
  }

  if (!normalizedLead.propertyTypeInterest) required.push("property_type");

  if (normalizedLead.propertyTypeInterest !== "land" && !normalizedLead.roomType) {
    required.push("room_type");
  }

  if (!normalizedLead.deliveryStatus) required.push("delivery_status");

  const isForeignRegion = ["cyprus", "greece", "dubai", "georgia"].includes(
    String(normalizedLead.preferredArea || "").trim()
  );
  if (!isForeignRegion && !normalizedLead.citizenshipNeed) {
    required.push("citizenship_need");
  }

  if (normalizedLead.purpose === "living" && !normalizedLead.buyerProfile) {
    required.push("buyer_profile");
  }

  if (!normalizedLead.timeline) required.push("timeline");

  if (!normalizedLead.fullName) required.push("name");
  if (!normalizedLead.email) required.push("contact");

  return required;
};
