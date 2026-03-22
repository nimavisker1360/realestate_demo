import asyncHandler from "express-async-handler";
import { getMongoDb } from "../config/prismaConfig.js";
import { getCachedJson, setCachedJson } from "../services/upstashRedis.js";

const DEFAULT_CITY = "Istanbul";
const DEFAULT_DISTRICT = "Pendik";
const HISTORY_COLLECTION = "MarketTrendHistory";
const PROJECT_PROPERTY_TYPES = new Set(["local-project", "international-project"]);

const toFolded = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const toTitleCase = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      const lower = token.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const normalizeListingType = (doc) =>
  String(doc?.listing_type || doc?.listingType || doc?.propertyType || "")
    .toLowerCase()
    .trim();

const extractAreaM2 = (doc) => {
  const direct =
    toPositiveNumber(doc?.area_m2) ||
    toPositiveNumber(doc?.areaM2) ||
    toPositiveNumber(doc?.area?.gross) ||
    toPositiveNumber(doc?.area?.net);
  return direct;
};

const cleanLocationToken = (value) =>
  String(value || "")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(mh|mah|mahalle|mahallesi)\s+/i, "")
    .replace(/\s+(mh|mah|mahalle|mahallesi)$/i, "")
    .trim();

const extractDistrictFromAddress = (address, city) => {
  const raw = String(address || "").trim();
  if (!raw) return "";

  const foldedCity = toFolded(city);
  const foldedCountryTokens = new Set(["turkey", "turkiye", "türkiye"]);
  const normalized = raw.replace(/[>|]/g, "/").replace(/,/g, "/");
  const segments = normalized
    .split("/")
    .map((part) => cleanLocationToken(part))
    .filter(Boolean)
    .filter((part) => !foldedCountryTokens.has(toFolded(part)))
    .filter((part) => !toFolded(part).includes(foldedCity));

  const looksLikeNeighborhood = (value) => {
    const folded = toFolded(value);
    return (
      /\bmah\b/.test(folded) ||
      /\bmahalle\b/.test(folded) ||
      /\bmahallesi\b/.test(folded)
    );
  };

  if (segments.length > 0) {
    const districtCandidate = segments.find((part) => !looksLikeNeighborhood(part));
    if (districtCandidate) {
      if (!/[\/,>|]/.test(raw) && districtCandidate.includes(" ")) {
        return cleanLocationToken(districtCandidate.split(/\s+/)[0]);
      }
      return districtCandidate;
    }

    const first = segments[0];
    if (first.includes(" ")) {
      return cleanLocationToken(first.split(/\s+/)[0]);
    }
    return first;
  }

  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return cleanLocationToken(words[0]);
};

const isNeighborhoodLabel = (value) => {
  const folded = toFolded(value);
  return (
    /\bmah\b/.test(folded) ||
    /\bmh\b/.test(folded) ||
    /\bmahalle\b/.test(folded) ||
    /\bmahallesi\b/.test(folded)
  );
};

const extractDistrict = (doc) => {
  const rawDirectDistrict = String(doc?.district || doc?.addressDetails?.district || "").trim();
  const directDistrict = cleanLocationToken(rawDirectDistrict);
  const addressDerived = extractDistrictFromAddress(
    doc?.address,
    doc?.city || doc?.addressDetails?.city
  );

  if (directDistrict) {
    if (isNeighborhoodLabel(rawDirectDistrict) && addressDerived) {
      return addressDerived;
    }
    return directDistrict;
  }

  return addressDerived;
};

const extractCity = (doc) =>
  cleanLocationToken(doc?.city) || cleanLocationToken(doc?.addressDetails?.city);

const makePeriodKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

const addAccumulator = (target, key, value) => {
  const current = target.get(key) || { sum: 0, count: 0 };
  current.sum += value;
  current.count += 1;
  target.set(key, current);
};

const toAveragePrice = (sum, count) => (count > 0 ? Math.round(sum / count) : 0);

const collectDistrictPeriods = (sourceMap, district, granularity) => {
  const districtFolded = toFolded(district);
  const rows = [];

  for (const [key, aggregate] of sourceMap.entries()) {
    const [rawDistrict, rawPeriod] = String(key).split("|");
    if (toFolded(rawDistrict) !== districtFolded) continue;

    if (granularity === "yearly") {
      const year = Number(rawPeriod);
      rows.push({
        year,
        price: toAveragePrice(aggregate.sum, aggregate.count),
        listing_count: aggregate.count,
      });
      continue;
    }

    const [yearText, monthText] = rawPeriod.split("-");
    rows.push({
      year: Number(yearText),
      month: Number(monthText),
      period: `${yearText}-${monthText}`,
      price: toAveragePrice(aggregate.sum, aggregate.count),
      listing_count: aggregate.count,
    });
  }

  return rows.sort((a, b) => {
    if (granularity === "yearly") return a.year - b.year;
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
};

const normalizeDistrictLabel = (value) => toFolded(cleanLocationToken(value));

const resolveDistrictByName = (districts, requestedDistrict) => {
  const requestedFolded = normalizeDistrictLabel(requestedDistrict);
  if (!requestedFolded) return "";
  const exact = districts.find(
    (district) => normalizeDistrictLabel(district) === requestedFolded
  );
  return exact || "";
};

const getDistrictYearPointCount = (yearlyMap, district) =>
  collectDistrictPeriods(yearlyMap, district, "yearly").length;

const pickFallbackDistrict = (districtRows, yearlyMap, cityFolded, minPoints) => {
  const eligible = districtRows
    .filter((row) => toFolded(row.district) !== cityFolded)
    .map((row) => ({
      ...row,
      yearPoints: getDistrictYearPointCount(yearlyMap, row.district),
    }))
    .filter((row) => row.yearPoints >= minPoints)
    .sort((a, b) => {
      if (b.listing_count !== a.listing_count) return b.listing_count - a.listing_count;
      if (b.yearPoints !== a.yearPoints) return b.yearPoints - a.yearPoints;
      return b.avg_m2_price - a.avg_m2_price;
    });

  return eligible[0]?.district || "";
};

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const toPriceAverage = (sum, count) => (count > 0 ? Math.round(sum / count) : 0);

const districtHashRatio = (district) => {
  const folded = toFolded(district);
  let hash = 0;
  for (const ch of folded) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  }
  return 0.9 + (hash % 21) / 100; // 0.90 - 1.10
};

const aggregateYearlyFromMonthly = (rows, priceKey, countKey) => {
  const yearly = new Map();
  for (const row of rows) {
    const key = Number(row.year);
    if (!Number.isFinite(key)) continue;
    const current = yearly.get(key) || {
      priceSum: 0,
      priceCount: 0,
      listingCount: 0,
    };
    const price = Number(row[priceKey]);
    if (Number.isFinite(price) && price > 0) {
      current.priceSum += price;
      current.priceCount += 1;
    }
    current.listingCount += Number(row[countKey] || 0);
    yearly.set(key, current);
  }
  return Array.from(yearly.entries())
    .map(([year, item]) => ({
      year,
      period: String(year),
      price: item.priceCount > 0 ? Math.round(item.priceSum / item.priceCount) : 0,
      listing_count: item.listingCount,
    }))
    .sort((a, b) => a.year - b.year);
};

const buildEstimatedDistrictRowsFromBenchmark = (benchmarkRows, selectedDistrict) => {
  const ratio = districtHashRatio(selectedDistrict);
  return benchmarkRows.map((row) => ({
    district: selectedDistrict,
    year: Number(row.year),
    month: Number(row.month),
    period: row.period || makePeriodKey(Number(row.year), Number(row.month)),
    avg_m2_price: Math.round(Number(row.avg_m2_price || 0) * ratio),
    listing_count: 0,
    source: "estimated",
  }));
};

const getHistoryPayload = ({
  rows,
  cityQuery,
  districtQuery,
  listingTypeQuery,
  strictDistrict,
  limitDistricts,
}) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const benchmarkDistrictLabel = toTitleCase(cityQuery);
  const benchmarkRows = rows
    .filter((row) => toFolded(row.district) === toFolded(benchmarkDistrictLabel))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  if (benchmarkRows.length === 0) return null;

  const groupedDistrict = new Map();
  for (const row of rows) {
    const district = toTitleCase(cleanLocationToken(row?.district));
    if (!district) continue;
    const period = row?.period || makePeriodKey(Number(row?.year), Number(row?.month));
    const key = `${district}|${period}`;
    // Keep listing source over estimated for same period.
    const current = groupedDistrict.get(key);
    const candidate = {
      district,
      year: Number(row?.year),
      month: Number(row?.month),
      period,
      avg_m2_price: Number(row?.avg_m2_price || 0),
      listing_count: Number(row?.listing_count || 0),
      source: String(row?.source || "estimated"),
    };
    if (!current) {
      groupedDistrict.set(key, candidate);
      continue;
    }
    if (current.source === "estimated" && candidate.source === "listing") {
      groupedDistrict.set(key, candidate);
    }
  }

  const normalizedRows = Array.from(groupedDistrict.values());
  const districtBuckets = new Map();
  for (const row of normalizedRows) {
    const district = row.district;
    const bucket = districtBuckets.get(district) || {
      priceSum: 0,
      priceCount: 0,
      listing_count: 0,
    };
    if (row.avg_m2_price > 0) {
      bucket.priceSum += row.avg_m2_price;
      bucket.priceCount += 1;
    }
    bucket.listing_count += row.listing_count;
    districtBuckets.set(district, bucket);
  }

  const districtComparisonRaw = Array.from(districtBuckets.entries())
    .map(([district, bucket]) => ({
      district,
      avg_m2_price: toPriceAverage(bucket.priceSum, bucket.priceCount),
      listing_count: bucket.listing_count,
    }))
    .sort((a, b) => {
      if (b.listing_count !== a.listing_count) return b.listing_count - a.listing_count;
      return b.avg_m2_price - a.avg_m2_price;
    });

  const knownDistricts = districtComparisonRaw
    .map((item) => item.district)
    .filter((district) => toFolded(district) !== toFolded(benchmarkDistrictLabel));

  const requestedDistrict = resolveDistrictByName(knownDistricts, districtQuery);
  let selectedDistrict = strictDistrict
    ? requestedDistrict || toTitleCase(cleanLocationToken(districtQuery))
    : requestedDistrict || knownDistricts[0] || toTitleCase(cleanLocationToken(districtQuery));

  let selectedMonthlyRows = normalizedRows
    .filter((row) => toFolded(row.district) === toFolded(selectedDistrict))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  if (selectedMonthlyRows.length === 0) {
    selectedMonthlyRows = buildEstimatedDistrictRowsFromBenchmark(benchmarkRows, selectedDistrict);
  }

  const benchmarkByPeriod = new Map(
    benchmarkRows.map((row) => [row.period || makePeriodKey(row.year, row.month), row])
  );
  const selectedByPeriod = new Map(
    selectedMonthlyRows.map((row) => [row.period || makePeriodKey(row.year, row.month), row])
  );

  const allPeriods = Array.from(new Set([
    ...benchmarkByPeriod.keys(),
    ...selectedByPeriod.keys(),
  ])).sort();

  const monthlyTrend = allPeriods.map((period) => {
    const benchmark = benchmarkByPeriod.get(period);
    const selected = selectedByPeriod.get(period);
    const [yearText, monthText] = period.split("-");
    return {
      year: Number(yearText),
      month: Number(monthText),
      period,
      benchmark_price: Number(benchmark?.avg_m2_price || 0),
      benchmark_count: Number(benchmark?.listing_count || 0),
      selected_price:
        selected && Number.isFinite(Number(selected.avg_m2_price))
          ? Number(selected.avg_m2_price)
          : null,
      selected_count: Number(selected?.listing_count || 0),
    };
  });

  const benchmarkYearlyTrend = aggregateYearlyFromMonthly(
    monthlyTrend,
    "benchmark_price",
    "benchmark_count"
  );
  const selectedYearlyTrend = aggregateYearlyFromMonthly(
    monthlyTrend,
    "selected_price",
    "selected_count"
  );

  const yearSet = Array.from(new Set([
    ...benchmarkYearlyTrend.map((row) => row.year),
    ...selectedYearlyTrend.map((row) => row.year),
  ])).sort((a, b) => a - b);

  const benchmarkYearMap = new Map(benchmarkYearlyTrend.map((row) => [row.year, row]));
  const selectedYearMap = new Map(selectedYearlyTrend.map((row) => [row.year, row]));

  const yearlyTrend = yearSet.map((year) => {
    const benchmark = benchmarkYearMap.get(year);
    const selected = selectedYearMap.get(year);
    return {
      year,
      period: String(year),
      benchmark_price: Number(benchmark?.price || 0),
      benchmark_count: Number(benchmark?.listing_count || 0),
      selected_price:
        selected && Number.isFinite(Number(selected.price)) ? Number(selected.price) : null,
      selected_count: Number(selected?.listing_count || 0),
    };
  });

  const benchmarkRow =
    districtComparisonRaw.find(
      (item) => toFolded(item.district) === toFolded(benchmarkDistrictLabel)
    ) || {
      district: benchmarkDistrictLabel,
      avg_m2_price: toPriceAverage(
        benchmarkRows.reduce((sum, row) => sum + Number(row.avg_m2_price || 0), 0),
        benchmarkRows.length
      ),
      listing_count: benchmarkRows.reduce((sum, row) => sum + Number(row.listing_count || 0), 0),
    };

  const selectedDistrictRow =
    districtComparisonRaw.find(
      (item) => toFolded(item.district) === toFolded(selectedDistrict)
    ) || {
      district: selectedDistrict,
      avg_m2_price: toPriceAverage(
        selectedMonthlyRows.reduce((sum, row) => sum + Number(row.avg_m2_price || 0), 0),
        selectedMonthlyRows.length
      ),
      listing_count: selectedMonthlyRows.reduce(
        (sum, row) => sum + Number(row.listing_count || 0),
        0
      ),
    };

  const districtComparison = [
    benchmarkRow,
    ...districtComparisonRaw.filter(
      (item) =>
        toFolded(item.district) !== toFolded(selectedDistrict) &&
        toFolded(item.district) !== toFolded(benchmarkDistrictLabel)
    ),
  ];
  if (toFolded(selectedDistrictRow.district) !== toFolded(benchmarkDistrictLabel)) {
    districtComparison.splice(1, 0, selectedDistrictRow);
  }
  const limitedDistrictComparison = districtComparison.slice(0, limitDistricts);

  const benchmarkData = {
    district: benchmarkDistrictLabel,
    avg_m2_price: benchmarkRow.avg_m2_price,
    listing_count: benchmarkRow.listing_count,
    trend: benchmarkYearlyTrend.map((row) => ({
      year: row.year,
      price: row.price,
      listing_count: row.listing_count,
    })),
  };
  const selectedDistrictData = {
    district: selectedDistrictRow.district,
    avg_m2_price: selectedDistrictRow.avg_m2_price,
    listing_count: selectedDistrictRow.listing_count,
    trend: selectedYearlyTrend.map((row) => ({
      year: row.year,
      price: row.price,
      listing_count: row.listing_count,
    })),
  };

  return {
    success: true,
    city: benchmarkDistrictLabel,
    benchmarkDistrict: benchmarkDistrictLabel,
    selectedDistrict: selectedDistrictRow.district,
    district: selectedDistrictRow.district,
    avg_m2_price: selectedDistrictRow.avg_m2_price,
    trend: selectedDistrictData.trend,
    listing_type: listingTypeQuery,
    totalListings: normalizedRows.reduce((sum, row) => sum + Number(row.listing_count || 0), 0),
    districtComparison: limitedDistrictComparison,
    yearlyTrend,
    monthlyTrend,
    summary: [benchmarkData, selectedDistrictData],
    selectedDistrictData,
    benchmarkData,
    data_source: "history",
    generatedAt: new Date().toISOString(),
  };
};

const buildCacheKey = (query) => {
  const segments = [
    "v5",
    "market",
    "istanbul",
    query.city,
    query.district,
    query.listing_type,
    String(query.include_projects),
    String(query.strict_district),
    String(query.use_history),
    String(query.min_year || ""),
    String(query.max_year || ""),
    String(query.min_trend_points || ""),
    String(query.limit || ""),
  ];
  return segments.join(":").toLowerCase();
};

export const getIstanbulMarketAnalytics = asyncHandler(async (req, res) => {
  const cityQuery = String(req.query.city || DEFAULT_CITY).trim();
  const districtQuery = String(req.query.district || DEFAULT_DISTRICT).trim();
  const listingTypeQuery = String(
    req.query.listing_type || req.query.listingType || "sale"
  )
    .toLowerCase()
    .trim();
  const includeProjects = String(req.query.include_projects || req.query.includeProjects || "true")
    .toLowerCase()
    .trim() !== "false";
  const strictDistrict = String(req.query.strict_district || req.query.strictDistrict || "false")
    .toLowerCase()
    .trim() === "true";
  const useHistory = String(req.query.use_history || req.query.useHistory || "true")
    .toLowerCase()
    .trim() !== "false";
  const minTrendPoints = clamp(req.query.min_trend_points, 1, 10, 2);
  const minYear = req.query.min_year ? clamp(req.query.min_year, 2000, 2100, 2000) : null;
  const maxYear = req.query.max_year ? clamp(req.query.max_year, 2000, 2100, 2100) : null;
  const limitDistricts = clamp(req.query.limit, 3, 20, 8);

  const cacheKey = buildCacheKey({
    city: cityQuery,
    district: districtQuery,
    listing_type: listingTypeQuery,
    include_projects: includeProjects,
    strict_district: strictDistrict,
    use_history: useHistory,
    min_year: minYear,
    max_year: maxYear,
    min_trend_points: minTrendPoints,
    limit: limitDistricts,
  });

  const cachedPayload = await getCachedJson(cacheKey);
  if (cachedPayload) {
    res.set("X-Cache", "HIT");
    return res.status(200).json(cachedPayload);
  }

  const db = await getMongoDb();
  if (useHistory) {
    const historyFilter = {
      city: toTitleCase(cityQuery),
      listing_type: listingTypeQuery,
      include_projects: includeProjects,
    };
    if (minYear !== null || maxYear !== null) {
      historyFilter.year = {};
      if (minYear !== null) historyFilter.year.$gte = minYear;
      if (maxYear !== null) historyFilter.year.$lte = maxYear;
    }

    const historyRows = await db
      .collection(HISTORY_COLLECTION)
      .find(historyFilter, {
        projection: {
          district: 1,
          year: 1,
          month: 1,
          period: 1,
          avg_m2_price: 1,
          listing_count: 1,
          source: 1,
        },
      })
      .toArray();

    const historyPayload = getHistoryPayload({
      rows: historyRows,
      cityQuery,
      districtQuery,
      listingTypeQuery,
      strictDistrict,
      limitDistricts,
    });

    if (historyPayload) {
      await setCachedJson(cacheKey, historyPayload, 60 * 60 * 6);
      res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
      res.set("X-Cache", "MISS");
      return res.status(200).json(historyPayload);
    }
  }

  const rows = await db
    .collection("Residency")
    .find(
      {},
      {
        projection: {
          price: 1,
          area: 1,
          area_m2: 1,
          areaM2: 1,
          district: 1,
          address: 1,
          addressDetails: 1,
          city: 1,
          listing_type: 1,
          listingType: 1,
          propertyType: 1,
          createdAt: 1,
          listingDate: 1,
        },
      }
    )
    .toArray();

  const cityFolded = toFolded(cityQuery);
  const preparedRows = [];

  for (const row of rows) {
    const city = extractCity(row);
    if (toFolded(city) !== cityFolded) continue;

    const listingType = normalizeListingType(row);
    if (listingTypeQuery && listingTypeQuery !== "all") {
      const isProject = PROJECT_PROPERTY_TYPES.has(listingType);
      const matchesRequestedType = listingType === listingTypeQuery;
      const allowProjectAsSale =
        includeProjects && listingTypeQuery === "sale" && isProject;

      if (!matchesRequestedType && !allowProjectAsSale) {
        continue;
      }
    }
    if (!includeProjects && PROJECT_PROPERTY_TYPES.has(listingType)) continue;

    // Prefer listing date for market timelines; fallback to createdAt.
    const date = parseDate(row?.listingDate) || parseDate(row?.createdAt);
    if (!date) continue;

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    if (minYear !== null && year < minYear) continue;
    if (maxYear !== null && year > maxYear) continue;

    const district = extractDistrict(row);
    if (!district) continue;

    const price = toPositiveNumber(row?.price);
    const areaM2 = extractAreaM2(row);
    if (!price || !areaM2) continue;

    preparedRows.push({
      district: toTitleCase(cleanLocationToken(district)),
      year,
      month,
      pricePerM2: price / areaM2,
    });
  }

  if (preparedRows.length === 0) {
    const emptyPayload = {
      success: true,
      city: toTitleCase(cityQuery),
      benchmarkDistrict: toTitleCase(cityQuery),
      selectedDistrict: toTitleCase(districtQuery),
      district: toTitleCase(districtQuery),
      avg_m2_price: 0,
      trend: [],
      listing_type: listingTypeQuery,
      totalListings: 0,
      districtComparison: [],
      yearlyTrend: [],
      monthlyTrend: [],
      summary: [],
      selectedDistrictData: null,
      benchmarkData: null,
      generatedAt: new Date().toISOString(),
    };
    res.set("X-Cache", "MISS");
    return res.status(200).json(emptyPayload);
  }

  const districtOverall = new Map();
  const districtYearly = new Map();
  const districtMonthly = new Map();
  const cityYearly = new Map();
  const cityMonthly = new Map();

  for (const item of preparedRows) {
    addAccumulator(districtOverall, item.district, item.pricePerM2);
    addAccumulator(districtYearly, `${item.district}|${item.year}`, item.pricePerM2);
    addAccumulator(
      districtMonthly,
      `${item.district}|${makePeriodKey(item.year, item.month)}`,
      item.pricePerM2
    );

    addAccumulator(cityYearly, String(item.year), item.pricePerM2);
    addAccumulator(cityMonthly, makePeriodKey(item.year, item.month), item.pricePerM2);
  }

  const districtComparisonRaw = Array.from(districtOverall.entries())
    .map(([district, aggregate]) => ({
      district,
      avg_m2_price: toAveragePrice(aggregate.sum, aggregate.count),
      listing_count: aggregate.count,
    }))
    .sort((a, b) => {
      if (b.listing_count !== a.listing_count) return b.listing_count - a.listing_count;
      return b.avg_m2_price - a.avg_m2_price;
    });

  const knownDistricts = districtComparisonRaw.map((item) => item.district);
  const requestedDistrict = resolveDistrictByName(knownDistricts, districtQuery);
  let selectedDistrict = strictDistrict
    ? requestedDistrict || toTitleCase(cleanLocationToken(districtQuery))
    : requestedDistrict ||
      districtComparisonRaw.find((item) => toFolded(item.district) !== cityFolded)?.district ||
      districtComparisonRaw[0]?.district ||
      toTitleCase(districtQuery);

  const selectedYearPointCount = getDistrictYearPointCount(districtYearly, selectedDistrict);
  const canAutoFallback = !strictDistrict && !requestedDistrict;
  if (canAutoFallback && selectedYearPointCount < minTrendPoints) {
    const fallbackDistrict = pickFallbackDistrict(
      districtComparisonRaw,
      districtYearly,
      cityFolded,
      minTrendPoints
    );
    if (fallbackDistrict) {
      selectedDistrict = fallbackDistrict;
    }
  }

  const cityAggregate = preparedRows.reduce(
    (acc, item) => {
      acc.sum += item.pricePerM2;
      acc.count += 1;
      return acc;
    },
    { sum: 0, count: 0 }
  );

  const benchmarkDistrictLabel = toTitleCase(cityQuery);
  const benchmarkRow = {
    district: benchmarkDistrictLabel,
    avg_m2_price: toAveragePrice(cityAggregate.sum, cityAggregate.count),
    listing_count: cityAggregate.count,
  };

  const selectedDistrictRow =
    districtComparisonRaw.find((item) => toFolded(item.district) === toFolded(selectedDistrict)) ||
    {
      district: selectedDistrict,
      avg_m2_price: 0,
      listing_count: 0,
    };

  const districtComparison = [
    benchmarkRow,
    ...districtComparisonRaw.filter(
      (item) =>
        toFolded(item.district) !== toFolded(selectedDistrict) &&
        toFolded(item.district) !== toFolded(benchmarkDistrictLabel)
    ),
  ];

  if (toFolded(selectedDistrictRow.district) !== toFolded(benchmarkDistrictLabel)) {
    districtComparison.splice(1, 0, selectedDistrictRow);
  }

  const limitedDistrictComparison = districtComparison.slice(0, limitDistricts);

  const selectedYearlyTrend = collectDistrictPeriods(districtYearly, selectedDistrict, "yearly");
  const selectedMonthlyTrend = collectDistrictPeriods(districtMonthly, selectedDistrict, "monthly");

  const benchmarkYearlyTrend = Array.from(cityYearly.entries())
    .map(([year, aggregate]) => ({
      year: Number(year),
      price: toAveragePrice(aggregate.sum, aggregate.count),
      listing_count: aggregate.count,
    }))
    .sort((a, b) => a.year - b.year);

  const benchmarkMonthlyTrend = Array.from(cityMonthly.entries())
    .map(([period, aggregate]) => {
      const [yearText, monthText] = period.split("-");
      return {
        year: Number(yearText),
        month: Number(monthText),
        period,
        price: toAveragePrice(aggregate.sum, aggregate.count),
        listing_count: aggregate.count,
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  const yearlyPeriods = Array.from(
    new Set([...benchmarkYearlyTrend.map((row) => row.year), ...selectedYearlyTrend.map((row) => row.year)])
  ).sort((a, b) => a - b);

  const monthlyPeriods = Array.from(
    new Set([
      ...benchmarkMonthlyTrend.map((row) => row.period),
      ...selectedMonthlyTrend.map((row) => row.period),
    ])
  ).sort();

  const benchmarkYearMap = new Map(benchmarkYearlyTrend.map((row) => [row.year, row]));
  const selectedYearMap = new Map(selectedYearlyTrend.map((row) => [row.year, row]));
  const benchmarkMonthMap = new Map(benchmarkMonthlyTrend.map((row) => [row.period, row]));
  const selectedMonthMap = new Map(selectedMonthlyTrend.map((row) => [row.period, row]));

  const yearlyTrend = yearlyPeriods.map((year) => {
    const benchmark = benchmarkYearMap.get(year);
    const selected = selectedYearMap.get(year);
    const hasSelected = Boolean(selected?.listing_count);
    return {
      year,
      period: String(year),
      benchmark_price: benchmark?.price || 0,
      benchmark_count: benchmark?.listing_count || 0,
      selected_price: hasSelected ? selected.price : null,
      selected_count: selected?.listing_count || 0,
    };
  });

  const monthlyTrend = monthlyPeriods.map((period) => {
    const benchmark = benchmarkMonthMap.get(period);
    const selected = selectedMonthMap.get(period);
    const [yearText, monthText] = period.split("-");
    const hasSelected = Boolean(selected?.listing_count);
    return {
      year: Number(yearText),
      month: Number(monthText),
      period,
      benchmark_price: benchmark?.price || 0,
      benchmark_count: benchmark?.listing_count || 0,
      selected_price: hasSelected ? selected.price : null,
      selected_count: selected?.listing_count || 0,
    };
  });

  const selectedDistrictData = {
    district: selectedDistrictRow.district,
    avg_m2_price: selectedDistrictRow.avg_m2_price,
    listing_count: selectedDistrictRow.listing_count,
    trend: selectedYearlyTrend.map((row) => ({
      year: row.year,
      price: row.price,
      listing_count: row.listing_count,
    })),
  };

  const benchmarkData = {
    district: benchmarkDistrictLabel,
    avg_m2_price: benchmarkRow.avg_m2_price,
    listing_count: benchmarkRow.listing_count,
    trend: benchmarkYearlyTrend.map((row) => ({
      year: row.year,
      price: row.price,
      listing_count: row.listing_count,
    })),
  };

  const payload = {
    success: true,
    city: benchmarkDistrictLabel,
    benchmarkDistrict: benchmarkDistrictLabel,
    selectedDistrict: selectedDistrictRow.district,
    district: selectedDistrictData.district,
    avg_m2_price: selectedDistrictData.avg_m2_price,
    trend: selectedDistrictData.trend,
    listing_type: listingTypeQuery,
    totalListings: preparedRows.length,
    districtComparison: limitedDistrictComparison,
    yearlyTrend,
    monthlyTrend,
    summary: [benchmarkData, selectedDistrictData],
    selectedDistrictData,
    benchmarkData,
    generatedAt: new Date().toISOString(),
  };

  await setCachedJson(cacheKey, payload, 60 * 60 * 6);

  res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  res.set("X-Cache", "MISS");
  return res.status(200).json(payload);
});
