import { AI_AGENT_SCORING_THRESHOLDS } from "../../constants/aiSalesAgent.js";
import { getLocalizedAgentCopy } from "./copy.js";
import { searchProperties } from "../realEstateAssistant.js";

const ASSISTANT_TRY_PER_USD = (() => {
  const parsed = Number(process.env.ASSISTANT_TRY_PER_USD);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 36;
})();

const ASSISTANT_USD_PER_EUR = (() => {
  const parsed = Number(process.env.ASSISTANT_USD_PER_EUR);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.08;
})();
const MAX_FALLBACK_ABOVE_BUDGET_RATIO = 1.35;
const ISTANBUL_EUROPEAN_DISTRICTS = new Set([
  "arnavutkoy", "avcilar", "bagcilar", "bahcelievler", "bakirkoy",
  "basaksehir", "bayrampasa", "besiktas", "beylikduzu", "beyoglu",
  "buyukcekmece", "catalca", "esenler", "esenyurt", "eyupsultan", "eyup",
  "fatih", "gaziosmanpasa", "gungoren", "kagithane", "kucukcekmece",
  "sariyer", "silivri", "sultangazi", "sisli", "zeytinburnu",
  "bahcesehir", "maslak", "levent", "halkali", "kucukcekmece",
]);

const ISTANBUL_ASIAN_DISTRICTS = new Set([
  "adalar", "atasehir", "beykoz", "cekmekoy", "kadikoy",
  "kartal", "maltepe", "pendik", "sancaktepe", "sultanbeyli",
  "sile", "tuzla", "umraniye", "uskudar",
]);

const ISTANBUL_CENTRAL_DISTRICTS = new Set([
  "besiktas", "sisli", "beyoglu", "fatih", "kadikoy",
  "atasehir", "maslak", "levent", "kagithane", "uskudar",
]);

const districtMatchesSide = (district = "", side = "") => {
  if (!district || !side) return false;
  const folded = toFolded(district)
    .replace(/[^a-z]/g, "");
  if (side === "european_side") return ISTANBUL_EUROPEAN_DISTRICTS.has(folded);
  if (side === "asian_side") return ISTANBUL_ASIAN_DISTRICTS.has(folded);
  if (side === "central_istanbul") return ISTANBUL_CENTRAL_DISTRICTS.has(folded);
  return false;
};

const PREFERRED_AREA_LOCATION_MAP = {
  asian_side: { city: "Istanbul", district: "", keyword: "", districts: Array.from(ISTANBUL_ASIAN_DISTRICTS), countries: [] },
  european_side: { city: "Istanbul", district: "", keyword: "", districts: Array.from(ISTANBUL_EUROPEAN_DISTRICTS), countries: [] },
  central_istanbul: { city: "Istanbul", district: "", keyword: "", districts: Array.from(ISTANBUL_CENTRAL_DISTRICTS), countries: [] },
  cyprus: {
    city: "",
    district: "",
    keyword: "",
    districts: [],
    countries: ["Cyprus", "Northern Cyprus", "Kıbrıs", "Kibris"],
    cities: ["Kyrenia", "Girne", "Famagusta", "Gazimağusa", "Nicosia", "Lefkoşa", "Lefkosa", "Iskele", "Baf", "Paphos"],
  },
  greece: {
    city: "",
    district: "",
    keyword: "",
    districts: [],
    countries: ["Greece", "Yunanistan", "Gretsiya"],
    cities: ["Athens", "Atina", "Thessaloniki", "Crete", "Girit", "Rhodes", "Rodos", "Mykonos", "Santorini"],
  },
  dubai: {
    city: "Dubai",
    district: "",
    keyword: "",
    districts: [],
    countries: ["UAE", "Dubai", "United Arab Emirates", "Emirates"],
    cities: ["Dubai", "Abu Dhabi", "Sharjah"],
  },
  georgia: {
    city: "",
    district: "",
    keyword: "",
    districts: [],
    countries: ["Georgia", "Georgian", "Gürcistan", "Gruziya"],
    cities: ["Tbilisi", "Batumi", "Kutaisi", "Rustavi"],
  },
};

const getDistrictsForPreferredArea = (preferredArea = "") => {
  const loc = PREFERRED_AREA_LOCATION_MAP[safeText(preferredArea)];
  return loc?.districts || [];
};

const getCountriesForPreferredArea = (preferredArea = "") => {
  const loc = PREFERRED_AREA_LOCATION_MAP[safeText(preferredArea)];
  return loc?.countries || [];
};

const getCitiesForPreferredArea = (preferredArea = "") => {
  const loc = PREFERRED_AREA_LOCATION_MAP[safeText(preferredArea)];
  return loc?.cities || [];
};

const isCountryRegion = (preferredArea = "") =>
  ["cyprus", "greece", "dubai", "georgia"].includes(safeText(preferredArea));

const itemMatchesPreferredSide = (item = {}, preferredArea = "") => {
  if (!preferredArea) return true;
  const area = safeText(preferredArea);
  if (["asian_side", "european_side"].includes(area)) {
    const district = safeText(item?.district) || safeText(item?.addressDetails?.district) || "";
    return districtMatchesSide(district, preferredArea);
  }
  if (isCountryRegion(preferredArea)) {
    const countries = getCountriesForPreferredArea(preferredArea);
    const itemCountry = toFolded(safeText(item?.country || ""));
    const itemCity = toFolded(safeText(item?.city || ""));
    if (countries.length === 0) return true;
    return countries.some((c) => {
      const folded = toFolded(c);
      return itemCountry.includes(folded) || itemCity.includes(folded);
    });
  }
  return true;
};

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const safeText = (value) => String(value || "").trim();

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const toFolded = (value) =>
  safeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCurrencyCode = (value) => {
  const code = safeText(value).toUpperCase();
  return ["USD", "TRY", "EUR"].includes(code) ? code : "USD";
};

const dedupeKeywords = (values = []) => {
  const seen = new Set();
  const result = [];
  values.forEach((value) => {
    const normalized = safeText(value);
    if (!normalized) return;
    const key = toFolded(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
};

const matchesCitizenshipHeuristic = (item = {}) => {
  const searchable = toFolded(
    `${item?.title || ""} ${item?.payment_plan || ""} ${item?.tapu_status || ""}`
  );
  const priceUsd = Number(item?.price_usd) || 0;
  return (
    priceUsd >= AI_AGENT_SCORING_THRESHOLDS.citizenshipMinUsd ||
    searchable.includes("citizenship") ||
    searchable.includes("vatandas") ||
    searchable.includes("passport")
  );
};

const convertAmount = (amount, fromCurrency, toCurrency = "USD") => {
  const numericAmount = safeNumber(amount);
  const source = normalizeCurrencyCode(fromCurrency);
  const target = normalizeCurrencyCode(toCurrency);
  if (!Number.isFinite(numericAmount)) return NaN;
  if (source === target) return numericAmount;

  let usdAmount = NaN;
  if (source === "USD") usdAmount = numericAmount;
  if (source === "TRY") usdAmount = numericAmount / ASSISTANT_TRY_PER_USD;
  if (source === "EUR") usdAmount = numericAmount * ASSISTANT_USD_PER_EUR;
  if (!Number.isFinite(usdAmount)) return NaN;

  if (target === "USD") return usdAmount;
  if (target === "TRY") return usdAmount * ASSISTANT_TRY_PER_USD;
  if (target === "EUR") return usdAmount / ASSISTANT_USD_PER_EUR;
  return NaN;
};

const getLeadBudgetRangeUsd = (lead = {}) => {
  const currency = normalizeCurrencyCode(lead.currency);
  const budgetMinUsd = convertAmount(lead.budgetMin, currency, "USD");
  const budgetMaxUsd = convertAmount(lead.budgetMax, currency, "USD");
  return {
    budgetMinUsd: Number.isFinite(budgetMinUsd) ? budgetMinUsd : NaN,
    budgetMaxUsd: Number.isFinite(budgetMaxUsd) ? budgetMaxUsd : NaN,
  };
};

const getPreferredAreaLocation = (preferredArea = "") =>
  PREFERRED_AREA_LOCATION_MAP[safeText(preferredArea)] || null;

const normalizeFallbackPreference = (value = "") => {
  const normalized = safeText(value);
  return ["above_budget", "nearby_areas", "both", "keep_exact"].includes(normalized)
    ? normalized
    : "";
};

const getLocationPreference = (lead = {}, pageContext = {}) => {
  const currentProjectName = safeText(pageContext?.currentProjectName);
  const contextCity = safeText(pageContext?.currentProject?.city);
  const contextDistrict = safeText(pageContext?.currentProject?.district);
  const city = safeText(lead.cityInterest);
  const locationInterest = safeText(lead.locationInterest);
  const preferredAreaLocation = getPreferredAreaLocation(lead.preferredArea);
  const district =
    safeText(lead.districtInterest) ||
    (locationInterest && toFolded(locationInterest) !== toFolded(city)
      ? locationInterest
      : "") ||
    safeText(preferredAreaLocation?.district);
  const inferredCity =
    city ||
    safeText(preferredAreaLocation?.city) ||
    (district && contextDistrict && toFolded(district) === toFolded(contextDistrict)
      ? contextCity
      : "");

  return {
    project: safeText(lead.projectInterest) || currentProjectName,
    city: inferredCity,
    district,
    contextCity,
    contextDistrict,
    preferredAreaKeyword: safeText(preferredAreaLocation?.keyword),
  };
};

const buildSearchArgs = (
  lead = {},
  pageContext = {},
  limit = 4,
  {
    strictLocation = true,
    includeBudget = true,
    dropBudgetMin = false,
    budgetFlexPercent = 0,
  } = {}
) => {
  const locationPreference = getLocationPreference(lead, pageContext);
  const isCountryRegionSearch = isCountryRegion(lead.preferredArea);
  const keywords = dedupeKeywords(
    isCountryRegionSearch
      ? [
          lead.propertyTypeInterest,
          lead.purpose === "investment" ? "investment" : "",
          lead.purpose === "citizenship" || lead.citizenshipInterest ? "citizenship" : "",
          safeText(lead.preferredArea),
        ]
      : [
          locationPreference.project,
          strictLocation ? locationPreference.district : "",
          locationPreference.preferredAreaKeyword,
          lead.locationInterest,
          lead.projectInterest,
          lead.propertyTypeInterest,
          lead.purpose === "investment" ? "investment" : "",
          lead.purpose === "citizenship" || lead.citizenshipInterest ? "citizenship" : "",
          !strictLocation ? locationPreference.city : "",
          pageContext?.currentProjectName,
        ]
  );

  const args = {
    limit,
    budget_flex_percent: budgetFlexPercent,
  };

  if (includeBudget && Number.isFinite(Number(lead.budgetMin)) && !dropBudgetMin) {
    args.budget_min = Number(lead.budgetMin);
  }
  if (includeBudget && Number.isFinite(Number(lead.budgetMax))) {
    args.budget_max = Number(lead.budgetMax);
  }
  if (hasValue(lead.currency)) {
    args.budget_currency = normalizeCurrencyCode(lead.currency);
  }
  if (hasValue(lead.roomType)) {
    args.rooms = lead.roomType;
  }
  const preferredAreaDistricts = getDistrictsForPreferredArea(lead.preferredArea);
  const preferredAreaCountries = getCountriesForPreferredArea(lead.preferredArea);
  const loc = PREFERRED_AREA_LOCATION_MAP[safeText(lead.preferredArea)];

  const preferredAreaCities = getCitiesForPreferredArea(lead.preferredArea);
  if (preferredAreaCountries.length > 0 || preferredAreaCities.length > 0) {
    if (preferredAreaCountries.length > 0) args.countries = preferredAreaCountries;
    if (preferredAreaCities.length > 0) args.cities = preferredAreaCities;
    if (hasValue(loc?.city) && !preferredAreaCities.length) args.city = loc.city;
  } else if (preferredAreaDistricts.length > 0) {
    args.districts = preferredAreaDistricts;
    args.city = args.city || "Istanbul";
  } else if (hasValue(locationPreference.city)) {
    args.city = locationPreference.city;
  }
  if (
    !isCountryRegionSearch &&
    !args.city &&
    strictLocation &&
    hasValue(locationPreference.district)
  ) {
    args.district = locationPreference.district;
  }
  if (lead.paymentPlan === "installment" || lead.paymentPlan === "flexible") {
    args.installment_plan = true;
  }
  if (pageContext?.pageType === "project_detail") {
    args.property_scope = "projects";
  }
  if (
    lead.purpose === "citizenship" ||
    lead.citizenshipInterest === true ||
    lead.citizenshipNeed === "yes" ||
    lead.citizenshipNeed === "maybe"
  ) {
    args.gyo = true;
    args.property_scope = args.property_scope || "projects";
  }
  if (keywords.length > 0) {
    args.keywords = keywords.slice(0, 6);
  }

  return args;
};

const mergeUniqueResults = (...batches) => {
  const merged = new Map();
  batches.flat().forEach((item) => {
    const id = safeText(item?.id);
    if (!id || merged.has(id)) return;
    merged.set(id, item);
  });
  return Array.from(merged.values());
};

const getLocationMatchLabel = (item = {}, lead = {}, pageContext = {}) => {
  const locationPreference = getLocationPreference(lead, pageContext);
  const searchable = toFolded(
    `${item?.title || ""} ${item?.city || ""} ${item?.district || ""}`
  );

  if (
    hasValue(locationPreference.project) &&
    searchable.includes(toFolded(locationPreference.project))
  ) {
    return "exact_project";
  }

  if (
    hasValue(locationPreference.district) &&
    toFolded(item?.district) === toFolded(locationPreference.district)
  ) {
    return "exact_district";
  }

  if (
    hasValue(locationPreference.city) &&
    toFolded(item?.city) === toFolded(locationPreference.city)
  ) {
    return "same_city";
  }

  if (
    hasValue(locationPreference.contextDistrict) &&
    toFolded(item?.district) === toFolded(locationPreference.contextDistrict)
  ) {
    return "page_context_area";
  }

  return "other_area";
};

const getSpecialOfferInstallmentMonths = (item = {}) => {
  const months = safeNumber(item?.special_offer_installment_months);
  return Number.isFinite(months) && months > 0 ? months : 0;
};

const hasInstallmentSpecialOffer = (item = {}) =>
  item?.has_special_offer === true && getSpecialOfferInstallmentMonths(item) > 0;

const isInstallmentMatch = (item = {}) =>
  hasInstallmentSpecialOffer(item) ||
  /installment|payment|taksit|rassroch/i.test(safeText(item?.payment_plan));

const getBudgetFit = (item = {}, lead = {}) => {
  const priceUsd = safeNumber(item?.price_usd);
  const { budgetMinUsd, budgetMaxUsd } = getLeadBudgetRangeUsd(lead);
  const hasMin = Number.isFinite(budgetMinUsd) && budgetMinUsd > 0;
  const hasMax = Number.isFinite(budgetMaxUsd) && budgetMaxUsd > 0;
  const hasBudget = hasMin || hasMax;

  if (!hasBudget) {
    return {
      label: "no_budget_filter",
      gapUsd: 0,
      hasBudget: false,
    };
  }

  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return {
      label: "budget_unknown",
      gapUsd: 0,
      hasBudget: true,
    };
  }

  if (hasMin && hasMax) {
    if (priceUsd >= budgetMinUsd && priceUsd <= budgetMaxUsd) {
      return { label: "within_budget", gapUsd: 0, hasBudget: true };
    }
    if (priceUsd < budgetMinUsd) {
      return {
        label: "below_budget_range",
        gapUsd: Math.round(budgetMinUsd - priceUsd),
        hasBudget: true,
      };
    }
    return {
      label: "above_budget",
      gapUsd: Math.round(priceUsd - budgetMaxUsd),
      hasBudget: true,
    };
  }

  if (hasMax) {
    if (priceUsd <= budgetMaxUsd) {
      return { label: "within_budget", gapUsd: 0, hasBudget: true };
    }
    return {
      label: "above_budget",
      gapUsd: Math.round(priceUsd - budgetMaxUsd),
      hasBudget: true,
    };
  }

  if (priceUsd >= budgetMinUsd) {
    return { label: "within_budget", gapUsd: 0, hasBudget: true };
  }

  return {
    label: "below_budget_range",
    gapUsd: Math.round(budgetMinUsd - priceUsd),
    hasBudget: true,
  };
};

const buildRecommendationNote = (locationMatchLabel, budgetFit, locale = "en") => {
  const locationLabelMap = {
    exact_project: "same project context",
    exact_district: "same requested area",
    same_city: "same city alternative",
    page_context_area: "same page context area",
    other_area: "broader area alternative",
  };

  const parts = [locationLabelMap[locationMatchLabel] || "relevant alternative"];

  if (budgetFit.label === "within_budget") {
    parts.push("within stated budget");
  } else if (budgetFit.label === "below_budget_range") {
    parts.push("priced below the requested range");
  } else if (budgetFit.label === "above_budget") {
    const localized = getLocalizedAgentCopy(locale);
    parts.push(localized.aboveBudgetNote || "Prices in this range were not found; higher prices are being suggested.");
    parts.push(`around $${Number(budgetFit.gapUsd || 0).toLocaleString()} above budget`);
  } else if (budgetFit.label === "budget_unknown") {
    parts.push("price needs manual confirmation");
  }

  return parts.join(", ");
};

const matchesDeliveryPreference = (item = {}, lead = {}) => {
  const deliveryStatus = safeText(lead.deliveryStatus);
  if (!deliveryStatus || deliveryStatus === "no_preference") return true;
  const searchable = toFolded(
    `${item?.title || ""} ${item?.tapu_status || ""} ${item?.delivery_status || ""}`
  );
  if (deliveryStatus === "ready") {
    return (
      searchable.includes("ready") ||
      searchable.includes("hazir") ||
      searchable.includes("teslim") ||
      searchable.includes("gotov")
    );
  }
  if (deliveryStatus === "under_construction") {
    return (
      searchable.includes("construction") ||
      searchable.includes("insaat") ||
      searchable.includes("off-plan") ||
      searchable.includes("stroyashchiy")
    );
  }
  return true;
};

const matchesFamilyConcept = (item = {}) => {
  const searchable = toFolded(
    `${item?.title || ""} ${item?.description || ""} ${item?.features || ""}`
  );
  return (
    searchable.includes("family") ||
    searchable.includes("aile") ||
    searchable.includes("semey") ||
    searchable.includes("children") ||
    searchable.includes("cocuk") ||
    searchable.includes("playground")
  );
};

const matchesAmenity = (item = {}, amenityKey = "") => {
  const searchable = toFolded(
    `${item?.title || ""} ${item?.description || ""} ${item?.features || ""} ${item?.amenities || ""}`
  );
  const amenityPatterns = {
    near_metro: ["metro"],
    parking: ["parking", "otopark", "parkovka"],
    security: ["security", "guvenlik", "bezopasnost", "24/7"],
    family_concept: ["family", "aile", "semey"],
    pool_gym: ["pool", "gym", "havuz", "spor", "basseyn"],
    sea_view: ["sea view", "deniz", "more", "ocean"],
    title_deed_ready: ["title deed", "tapu"],
  };
  const patterns = amenityPatterns[amenityKey] || [];
  return patterns.some((pattern) => searchable.includes(pattern));
};

const buildMatchReasons = (
  item = {},
  lead = {},
  pageContext = {},
  locationMatchLabel = "other_area",
  budgetFit = {}
) => {
  const reasons = [];

  if (locationMatchLabel === "exact_project") reasons.push("project_match");
  if (locationMatchLabel === "exact_district") reasons.push("district_match");
  if (locationMatchLabel === "same_city") reasons.push("city_match");
  if (locationMatchLabel === "page_context_area") reasons.push("page_context_match");

  if (
    hasValue(lead.roomType) &&
    safeText(item?.rooms) &&
    safeText(item.rooms) === safeText(lead.roomType)
  ) {
    reasons.push("room_type_match");
  }

  if (
    hasValue(lead.propertyTypeInterest) &&
    toFolded(`${item?.title || ""} ${item?.property_type || ""}`).includes(
      toFolded(lead.propertyTypeInterest)
    )
  ) {
    reasons.push("property_type_match");
  }

  if (
    (lead.paymentPlan === "installment" || lead.paymentPlan === "flexible") &&
    isInstallmentMatch(item)
  ) {
    reasons.push("installment_match");
  }

  const citizenshipRelevant =
    lead.citizenshipInterest === true ||
    lead.citizenshipNeed === "yes" ||
    lead.citizenshipNeed === "maybe";
  if (citizenshipRelevant && matchesCitizenshipHeuristic(item)) {
    reasons.push("citizenship_fit");
  }

  if (lead.purpose === "investment") {
    reasons.push("investment_fit");
  }

  if (budgetFit.label === "within_budget") {
    reasons.push("within_budget");
  } else if (budgetFit.label === "below_budget_range") {
    reasons.push("below_budget_range");
  } else if (budgetFit.label === "above_budget") {
    reasons.push("above_budget");
  }

  if (
    hasValue(lead.deliveryStatus) &&
    lead.deliveryStatus !== "no_preference" &&
    matchesDeliveryPreference(item, lead)
  ) {
    reasons.push("delivery_match");
  }

  if (
    (lead.buyerProfile === "family" || lead.buyerProfile === "large_family") &&
    matchesFamilyConcept(item)
  ) {
    reasons.push("family_friendly");
  }

  const amenities = Array.isArray(lead.amenitiesPriorities)
    ? lead.amenitiesPriorities
    : [];
  for (const amenity of amenities) {
    if (matchesAmenity(item, amenity)) {
      if (amenity === "title_deed_ready") {
        reasons.push("title_deed_ready");
      } else if (amenity === "sea_view") {
        reasons.push("sea_view_match");
      } else {
        reasons.push("amenity_match");
      }
      break;
    }
  }

  const preferredArea = safeText(lead.preferredArea);
  if (
    preferredArea &&
    preferredArea !== "no_preference" &&
    preferredArea !== "near_metro"
  ) {
    const itemDistrict = safeText(item?.district);
    if (itemDistrict && districtMatchesSide(itemDistrict, preferredArea)) {
      reasons.push("preferred_side_match");
    }
  }

  return reasons;
};

const scoreRecommendation = (item = {}, lead = {}, pageContext = {}, locale = "en") => {
  const locationPreference = getLocationPreference(lead, pageContext);
  const locationMatchLabel = getLocationMatchLabel(item, lead, pageContext);
  const budgetFit = getBudgetFit(item, lead);
  const prefersInstallment =
    lead.paymentPlan === "installment" || lead.paymentPlan === "flexible";
  const { budgetMinUsd: leadBudgetMinUsd, budgetMaxUsd: leadBudgetMaxUsd } =
    getLeadBudgetRangeUsd(lead);
  const reasons = buildMatchReasons(
    item,
    lead,
    pageContext,
    locationMatchLabel,
    budgetFit
  );

  let score = 0;

  if (locationMatchLabel === "exact_project") score += 130;
  if (locationMatchLabel === "exact_district") score += 100;
  if (locationMatchLabel === "same_city") {
    score += hasValue(locationPreference.district) ? 48 : 68;
  }
  if (locationMatchLabel === "page_context_area") score += 36;
  if (locationMatchLabel === "other_area") {
    score += hasValue(locationPreference.district) || hasValue(locationPreference.city) ? -45 : 10;
  }

  if (budgetFit.label === "within_budget") score += 80;
  if (budgetFit.label === "below_budget_range") score -= 50;
  if (budgetFit.label === "budget_unknown") score -= 16;
  if (budgetFit.label === "above_budget") {
    const gapUsd = Number(budgetFit.gapUsd || 0);
    const budgetCeiling =
      (Number.isFinite(leadBudgetMaxUsd) && leadBudgetMaxUsd > 0 ? leadBudgetMaxUsd : 0) ||
      (Number.isFinite(leadBudgetMinUsd) && leadBudgetMinUsd > 0 ? leadBudgetMinUsd : 0);
    const gapPercent = budgetCeiling > 0 ? (gapUsd / budgetCeiling) * 100 : 0;
    score -= Math.min(160, 30 + Math.round(gapPercent * 2));
  }

  if (reasons.includes("room_type_match")) score += 26;
  if (reasons.includes("property_type_match")) score += 24;
  if (reasons.includes("installment_match")) score += 16;
  if (prefersInstallment && hasInstallmentSpecialOffer(item)) score += 18;
  if (reasons.includes("citizenship_fit")) score += 24;
  if (reasons.includes("investment_fit")) score += 8;
  if (reasons.includes("delivery_match")) score += 14;
  if (reasons.includes("family_friendly")) score += 12;
  if (reasons.includes("amenity_match")) score += 10;
  if (reasons.includes("title_deed_ready")) score += 12;
  if (reasons.includes("sea_view_match")) score += 10;
  if (reasons.includes("preferred_side_match")) score += 60;

  return {
    score,
    reasons,
    locationMatchLabel,
    budgetFitLabel: budgetFit.label,
    budgetGapUsd: budgetFit.gapUsd,
    recommendationNote: buildRecommendationNote(locationMatchLabel, budgetFit, locale),
  };
};

const isBudgetFriendly = (item = {}) =>
  ["within_budget", "no_budget_filter"].includes(item.budgetFitLabel);

const selectBestRecommendations = (scored = [], lead = {}, pageContext = {}, limit = 4) => {
  const locationPreference = getLocationPreference(lead, pageContext);
  const fallbackPreference = normalizeFallbackPreference(lead.fallbackPreference);
  const prefersInstallment =
    lead.paymentPlan === "installment" || lead.paymentPlan === "flexible";
  const { budgetMinUsd, budgetMaxUsd } = getLeadBudgetRangeUsd(lead);
  const leadHasBudget =
    (Number.isFinite(budgetMinUsd) && budgetMinUsd > 0) ||
    (Number.isFinite(budgetMaxUsd) && budgetMaxUsd > 0);

  const fallbackBudgetCeilingUsd = leadHasBudget
    ? (Number.isFinite(budgetMaxUsd) && budgetMaxUsd > 0 ? budgetMaxUsd : budgetMinUsd) *
      MAX_FALLBACK_ABOVE_BUDGET_RATIO
    : Infinity;

  const isWithinFallbackBudgetCeiling = (item) => {
    if (!leadHasBudget) return true;
    const priceUsd = safeNumber(item?.price_usd);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) return false;
    return priceUsd <= fallbackBudgetCeilingUsd;
  };

  const isStrictLocationMatch = (item) => {
    if (["exact_project", "exact_district"].includes(item?.locationMatchLabel)) {
      return true;
    }
    if (!hasValue(locationPreference.district) && hasValue(locationPreference.city)) {
      return item?.locationMatchLabel === "same_city";
    }
    return !hasValue(locationPreference.district) && !hasValue(locationPreference.city);
  };

  const allowNearbyAreas = ["", "nearby_areas", "both"].includes(fallbackPreference);
  const allowAboveBudget = ["", "above_budget", "both"].includes(fallbackPreference);
  const keepExact = fallbackPreference === "keep_exact";

  const budgetEligible = leadHasBudget
    ? scored.filter((item) => {
        if (item?.budgetFitLabel === "below_budget_range") return false;
        const isNearbyAllowed = allowNearbyAreas || isStrictLocationMatch(item);
        if (!isNearbyAllowed) return false;
        if (keepExact) {
          return item?.budgetFitLabel === "within_budget" && isStrictLocationMatch(item);
        }
        if (item?.budgetFitLabel === "within_budget") return true;
        if (allowAboveBudget && item?.budgetFitLabel === "above_budget") {
          return isWithinFallbackBudgetCeiling(item);
        }
        return false;
      })
    : scored;

  const excludeBelowBudget = leadHasBudget && Number.isFinite(budgetMinUsd) && budgetMinUsd > 0;
  const hasStrictArea = ["asian_side", "european_side", "cyprus", "greece", "dubai", "georgia"].includes(
    safeText(lead.preferredArea)
  );
  let pool = (budgetEligible.length > 0 ? budgetEligible : scored).filter(
    (item) =>
      !excludeBelowBudget || item?.budgetFitLabel !== "below_budget_range"
  );
  if (hasStrictArea) {
    pool = pool.filter((item) => itemMatchesPreferredSide(item, lead.preferredArea));
  }

  const exactArea = pool.filter((item) =>
    ["exact_project", "exact_district"].includes(item.locationMatchLabel)
  );
  const sameCity = pool.filter((item) => item.locationMatchLabel === "same_city");
  const pageContextArea = pool.filter(
    (item) => item.locationMatchLabel === "page_context_area"
  );
  const otherArea = pool.filter((item) => item.locationMatchLabel === "other_area");

  let ordered = [...pool];

  if (hasValue(locationPreference.district)) {
    const exactAreaBudgetFriendly = exactArea.filter(isBudgetFriendly);
    const sameCityBudgetFriendly = sameCity.filter(isBudgetFriendly);

    if (exactAreaBudgetFriendly.length > 0) {
      ordered = [
        ...exactAreaBudgetFriendly,
        ...sameCityBudgetFriendly,
        ...exactArea.filter((item) => !isBudgetFriendly(item)),
        ...sameCity.filter((item) => !isBudgetFriendly(item)),
        ...pageContextArea,
        ...otherArea,
      ];
    } else if (sameCityBudgetFriendly.length > 0) {
      ordered = [
        ...sameCityBudgetFriendly,
        ...exactArea,
        ...sameCity.filter((item) => !isBudgetFriendly(item)),
        ...pageContextArea,
        ...otherArea,
      ];
    } else if (exactArea.length > 0) {
      ordered = [...exactArea, ...sameCity, ...pageContextArea, ...otherArea];
    } else {
      ordered = [...sameCity, ...pageContextArea, ...otherArea];
    }
  } else if (hasValue(locationPreference.city)) {
    ordered = [
      ...sameCity.filter(isBudgetFriendly),
      ...pageContextArea.filter(isBudgetFriendly),
      ...sameCity.filter((item) => !isBudgetFriendly(item)),
      ...pageContextArea.filter((item) => !isBudgetFriendly(item)),
      ...otherArea,
    ];
  } else {
    ordered = [
      ...pool.filter(isBudgetFriendly),
      ...pool.filter((item) => !isBudgetFriendly(item)),
    ];
  }

  const unique = [];
  const seen = new Set();
  for (const item of ordered) {
    const id = safeText(item.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(item);
    if (unique.length >= limit) break;
  }

  if (prefersInstallment && !unique.some((item) => hasInstallmentSpecialOffer(item))) {
    const selectedIds = new Set(unique.map((item) => safeText(item?.id)).filter(Boolean));
    const specialOfferCandidate = ordered.find((item) => {
      const id = safeText(item?.id);
      return id && !selectedIds.has(id) && hasInstallmentSpecialOffer(item);
    });

    if (specialOfferCandidate) {
      if (unique.length < limit) {
        unique.push(specialOfferCandidate);
      } else if (unique.length > 0) {
        unique[unique.length - 1] = specialOfferCandidate;
      }
    }
  }

  return unique;
};

export const getDeterministicRecommendations = async (
  lead = {},
  pageContext = {},
  options = {}
) => {
  const limit = Math.max(1, Math.min(6, Number(options.limit) || 4));
  const locale = options?.locale || pageContext?.locale || lead?.preferredLanguage || "en";
  const fallbackPreference = normalizeFallbackPreference(lead.fallbackPreference);
  const { budgetMinUsd, budgetMaxUsd } = getLeadBudgetRangeUsd(lead);
  const leadHasBudget =
    (Number.isFinite(budgetMinUsd) && budgetMinUsd > 0) ||
    (Number.isFinite(budgetMaxUsd) && budgetMaxUsd > 0);
  const DEFAULT_BUDGET_FLEX = 35;
  const strictLocationArgs = buildSearchArgs(lead, pageContext, limit + 10, {
    strictLocation: true,
    includeBudget: true,
    budgetFlexPercent: DEFAULT_BUDGET_FLEX,
  });
  const widerLocationArgs = buildSearchArgs(lead, pageContext, limit + 10, {
    strictLocation: false,
    includeBudget: true,
    budgetFlexPercent: DEFAULT_BUDGET_FLEX,
  });
  const noBudgetLocationArgs = buildSearchArgs(lead, pageContext, limit + 10, {
    strictLocation: true,
    includeBudget: false,
    budgetFlexPercent: 0,
  });
  const widerNoBudgetLocationArgs = buildSearchArgs(lead, pageContext, limit + 10, {
    strictLocation: false,
    includeBudget: false,
    budgetFlexPercent: 0,
  });

  const preferredAreaDistricts = getDistrictsForPreferredArea(lead.preferredArea);
  const preferredAreaCountries = getCountriesForPreferredArea(lead.preferredArea);
  const hasStrictArea = ["asian_side", "european_side", "cyprus", "greece", "dubai", "georgia"].includes(
    safeText(lead.preferredArea)
  );

  const priceOnlyBase = leadHasBudget && Number.isFinite(budgetMinUsd) && budgetMinUsd > 0
    ? {
        limit: limit + 15,
        budget_min: budgetMinUsd,
        budget_max:
          Number.isFinite(budgetMaxUsd) && budgetMaxUsd > 0
            ? budgetMaxUsd * MAX_FALLBACK_ABOVE_BUDGET_RATIO
            : budgetMinUsd * MAX_FALLBACK_ABOVE_BUDGET_RATIO,
        budget_currency: "USD",
        budget_flex_percent: 0,
      }
    : null;

  const isCitizenshipIntent =
    lead.purpose === "citizenship" ||
    lead.citizenshipInterest === true ||
    lead.citizenshipNeed === "yes" ||
    lead.citizenshipNeed === "maybe";
  const citizenshipExtra = isCitizenshipIntent ? { gyo: true, property_scope: "projects" } : {};

  const preferredAreaLoc = PREFERRED_AREA_LOCATION_MAP[safeText(lead.preferredArea)];
  const preferredAreaCities = getCitiesForPreferredArea(lead.preferredArea);
  const priceOnlyArgs =
    priceOnlyBase && hasStrictArea
      ? preferredAreaCountries.length > 0 || preferredAreaCities.length > 0
        ? {
            ...priceOnlyBase,
            ...citizenshipExtra,
            ...(preferredAreaCountries.length > 0 ? { countries: preferredAreaCountries } : {}),
            ...(preferredAreaCities.length > 0 ? { cities: preferredAreaCities } : {}),
            ...(preferredAreaLoc?.city && !preferredAreaCities.length ? { city: preferredAreaLoc.city } : {}),
          }
        : preferredAreaDistricts.length > 0
          ? { ...priceOnlyBase, ...citizenshipExtra, city: "Istanbul", districts: preferredAreaDistricts }
          : { ...priceOnlyBase, ...citizenshipExtra }
      : priceOnlyBase ? { ...priceOnlyBase, ...citizenshipExtra } : null;

  const searchPromises = [
    searchProperties(strictLocationArgs),
    searchProperties(widerLocationArgs),
    searchProperties(noBudgetLocationArgs),
    searchProperties(widerNoBudgetLocationArgs),
  ];
  if (priceOnlyArgs) {
    searchPromises.push(searchProperties(priceOnlyArgs));
  }

  const searchResults = await Promise.all(searchPromises);
  const [strictLocationResults, widerLocationResults, noBudgetLocationResults, widerNoBudgetLocationResults] =
    searchResults.slice(0, 4);
  const priceOnlyResults = priceOnlyArgs ? searchResults[4] : [];

  const budgetFilteredResults = mergeUniqueResults(
    strictLocationResults,
    widerLocationResults,
    priceOnlyResults
  );

  let results = budgetFilteredResults;

  if (results.length < limit) {
    results = mergeUniqueResults(results, noBudgetLocationResults);
  }

  if (results.length < limit) {
    results = mergeUniqueResults(results, widerNoBudgetLocationResults);
  }

  if (results.length < limit && priceOnlyResults.length > 0) {
    results = mergeUniqueResults(results, priceOnlyResults);
  }

  const { budgetMinUsd: minUsd } = getLeadBudgetRangeUsd(lead);
  const excludeBelowMin =
    Number.isFinite(minUsd) && minUsd > 0;
  if (excludeBelowMin) {
    results = results.filter((item) => {
      const priceUsd = safeNumber(item?.price_usd);
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) return false;
      return priceUsd >= minUsd;
    });
  }

  if (hasStrictArea) {
    results = results.filter((item) => itemMatchesPreferredSide(item, lead.preferredArea));
  }

  if (results.length === 0) {
    const hasCountryRegion = preferredAreaCountries.length > 0 || preferredAreaCities.length > 0;
    const broadFallbackBase = { limit: limit + 25, ...citizenshipExtra };
    const broadFallbackArgs =
      hasStrictArea && (preferredAreaDistricts.length > 0 || hasCountryRegion)
        ? hasCountryRegion
          ? {
              ...broadFallbackBase,
              ...(preferredAreaCountries.length > 0 ? { countries: preferredAreaCountries } : {}),
              ...(preferredAreaCities.length > 0 ? { cities: preferredAreaCities } : {}),
              ...(preferredAreaLoc?.city && !preferredAreaCities.length ? { city: preferredAreaLoc.city } : {}),
            }
          : {
              ...broadFallbackBase,
              ...(leadHasBudget && Number.isFinite(budgetMinUsd) && budgetMinUsd > 0
                ? {
                    budget_min: budgetMinUsd,
                    budget_max:
                      Number.isFinite(budgetMaxUsd) && budgetMaxUsd > 0
                        ? budgetMaxUsd * MAX_FALLBACK_ABOVE_BUDGET_RATIO
                        : budgetMinUsd * MAX_FALLBACK_ABOVE_BUDGET_RATIO,
                    budget_currency: "USD",
                    budget_flex_percent: 0,
                  }
                : {}),
              city: "Istanbul",
              districts: preferredAreaDistricts,
            }
        : broadFallbackBase;
    const broadResults = await searchProperties(broadFallbackArgs);
    results = Array.isArray(broadResults) ? broadResults : [];
    if (excludeBelowMin) {
      results = results.filter((item) => {
        const priceUsd = safeNumber(item?.price_usd);
        if (!Number.isFinite(priceUsd) || priceUsd <= 0) return false;
        return priceUsd >= minUsd;
      });
    }
    if (hasStrictArea) {
      results = results.filter((item) => itemMatchesPreferredSide(item, lead.preferredArea));
    }
  }

  if (!Array.isArray(results) || results.length === 0) {
    return [];
  }

  const scored = results
    .map((item) => {
      const recommendation = scoreRecommendation(item, lead, pageContext, locale);
      return {
        ...item,
        matchReasons: recommendation.reasons,
        recommendationScore: recommendation.score,
        locationMatchLabel: recommendation.locationMatchLabel,
        budgetFitLabel: recommendation.budgetFitLabel,
        budgetGapUsd: recommendation.budgetGapUsd,
        recommendationNote: recommendation.recommendationNote,
      };
    })
    .sort((left, right) => {
      if (right.recommendationScore !== left.recommendationScore) {
        return right.recommendationScore - left.recommendationScore;
      }
      return (Number(left.budgetGapUsd) || 0) - (Number(right.budgetGapUsd) || 0);
    });

  const shortlisted = selectBestRecommendations(scored, lead, pageContext, limit);

  if (lead.citizenshipInterest === true) {
    return shortlisted.sort((left, right) => {
      const leftBoost = matchesCitizenshipHeuristic(left) ? 1 : 0;
      const rightBoost = matchesCitizenshipHeuristic(right) ? 1 : 0;
      if (leftBoost !== rightBoost) return rightBoost - leftBoost;
      return right.recommendationScore - left.recommendationScore;
    });
  }

  return shortlisted;
};
