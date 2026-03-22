import dotenv from "dotenv";
import { getMongoDb } from "../config/prismaConfig.js";

dotenv.config();

const PROJECT_PROPERTY_TYPES = new Set(["local-project", "international-project"]);
const HISTORY_COLLECTION = "MarketTrendHistory";

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

const extractAreaM2 = (doc) =>
  toPositiveNumber(doc?.area_m2) ||
  toPositiveNumber(doc?.areaM2) ||
  toPositiveNumber(doc?.area?.gross) ||
  toPositiveNumber(doc?.area?.net);

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
  const foldedCountryTokens = new Set(["turkey", "turkiye", "turkiye"]);
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
    if (first.includes(" ")) return cleanLocationToken(first.split(/\s+/)[0]);
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
    if (isNeighborhoodLabel(rawDirectDistrict) && addressDerived) return addressDerived;
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

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
};

const parseArg = (name, fallback = "") => {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
};

const timelineBetween = (startYear, endYear, endMonth) => {
  const rows = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const maxMonth = year === endYear ? endMonth : 12;
    for (let month = 1; month <= maxMonth; month += 1) {
      rows.push({ year, month, period: makePeriodKey(year, month) });
    }
  }
  return rows;
};

const toMonthlyGrowth = (annualGrowth) => Math.pow(1 + annualGrowth, 1 / 12);

const estimateGrowthFromKnown = (knownPoints, fallbackAnnualGrowth = 0.16) => {
  const fallbackMonthly = toMonthlyGrowth(fallbackAnnualGrowth);
  if (!Array.isArray(knownPoints) || knownPoints.length < 2) {
    return fallbackMonthly;
  }
  const first = knownPoints[0];
  const last = knownPoints[knownPoints.length - 1];
  const distance = Math.max(1, last.index - first.index);
  const ratio = Math.max(0.01, last.price / Math.max(1, first.price));
  const growth = Math.pow(ratio, 1 / distance);
  if (!Number.isFinite(growth)) return fallbackMonthly;
  if (growth < 1.001 || growth > 1.04) return fallbackMonthly;
  return growth;
};

const buildFilledSeries = ({
  timeline,
  knownByPeriod,
  fallbackBasePrice,
  fallbackAnnualGrowth = 0.16,
}) => {
  const knownPoints = timeline
    .map((row, index) => {
      const known = knownByPeriod.get(row.period);
      if (!known) return null;
      return {
        index,
        period: row.period,
        price: Number(known.price || 0),
        listing_count: Number(known.listing_count || 0),
      };
    })
    .filter(Boolean);

  const growth = estimateGrowthFromKnown(knownPoints, fallbackAnnualGrowth);
  const filled = [];

  if (knownPoints.length === 0) {
    for (let index = 0; index < timeline.length; index += 1) {
      const price = Math.max(1000, Math.round(fallbackBasePrice * Math.pow(growth, index)));
      filled.push({
        period: timeline[index].period,
        year: timeline[index].year,
        month: timeline[index].month,
        avg_m2_price: price,
        listing_count: 0,
        source: "estimated",
      });
    }
    return filled;
  }

  const knownByIndex = new Map(knownPoints.map((item) => [item.index, item]));
  const firstKnown = knownPoints[0];
  const lastKnown = knownPoints[knownPoints.length - 1];

  for (let index = 0; index < timeline.length; index += 1) {
    if (knownByIndex.has(index)) {
      const current = knownByIndex.get(index);
      filled.push({
        period: timeline[index].period,
        year: timeline[index].year,
        month: timeline[index].month,
        avg_m2_price: Math.max(1000, Math.round(current.price)),
        listing_count: current.listing_count,
        source: "listing",
      });
      continue;
    }

    if (index < firstKnown.index) {
      const distance = firstKnown.index - index;
      const price = firstKnown.price / Math.pow(growth, distance);
      filled.push({
        period: timeline[index].period,
        year: timeline[index].year,
        month: timeline[index].month,
        avg_m2_price: Math.max(1000, Math.round(price)),
        listing_count: 0,
        source: "estimated",
      });
      continue;
    }

    if (index > lastKnown.index) {
      const distance = index - lastKnown.index;
      const price = lastKnown.price * Math.pow(growth, distance);
      filled.push({
        period: timeline[index].period,
        year: timeline[index].year,
        month: timeline[index].month,
        avg_m2_price: Math.max(1000, Math.round(price)),
        listing_count: 0,
        source: "estimated",
      });
      continue;
    }

    let prev = null;
    let next = null;
    for (const point of knownPoints) {
      if (point.index < index) prev = point;
      if (point.index > index) {
        next = point;
        break;
      }
    }

    if (prev && next) {
      const span = Math.max(1, next.index - prev.index);
      const ratio = (index - prev.index) / span;
      const price = prev.price + (next.price - prev.price) * ratio;
      filled.push({
        period: timeline[index].period,
        year: timeline[index].year,
        month: timeline[index].month,
        avg_m2_price: Math.max(1000, Math.round(price)),
        listing_count: 0,
        source: "estimated",
      });
      continue;
    }

    const anchor = prev || next || firstKnown;
    const fallbackPrice = anchor?.price || fallbackBasePrice;
    filled.push({
      period: timeline[index].period,
      year: timeline[index].year,
      month: timeline[index].month,
      avg_m2_price: Math.max(1000, Math.round(fallbackPrice)),
      listing_count: 0,
      source: "estimated",
    });
  }

  return filled;
};

const districtHashRatio = (district) => {
  const folded = toFolded(district);
  let hash = 0;
  for (const ch of folded) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  }
  return 0.9 + (hash % 21) / 100; // 0.90 - 1.10
};

const run = async () => {
  const now = new Date();
  const cityArg = parseArg("city", "Istanbul");
  const startYear = clamp(parseArg("start-year", 2015), 2000, 2100, 2015);
  const endYear = clamp(parseArg("end-year", now.getUTCFullYear()), startYear, 2100, now.getUTCFullYear());
  const endMonth = clamp(parseArg("end-month", endYear === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12), 1, 12, 12);
  const listingTypeQuery = String(parseArg("listing-type", "sale")).toLowerCase().trim();
  const includeProjects = String(parseArg("include-projects", "true")).toLowerCase().trim() !== "false";

  const cityLabel = toTitleCase(cityArg);
  const cityFolded = toFolded(cityArg);

  const db = await getMongoDb();
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

  const timeline = timelineBetween(startYear, endYear, endMonth);
  const periodSet = new Set(timeline.map((row) => row.period));

  const cityMonthlyMap = new Map();
  const districtMonthlyMap = new Map();
  const districtOverallMap = new Map();
  let cityOverallSum = 0;
  let cityOverallCount = 0;
  const districtNames = new Set();

  for (const row of rows) {
    const city = extractCity(row);
    if (toFolded(city) !== cityFolded) continue;

    const district = toTitleCase(cleanLocationToken(extractDistrict(row)));
    if (district) districtNames.add(district);

    const listingType = normalizeListingType(row);
    if (listingTypeQuery && listingTypeQuery !== "all") {
      const isProject = PROJECT_PROPERTY_TYPES.has(listingType);
      const matchesRequestedType = listingType === listingTypeQuery;
      const allowProjectAsSale = includeProjects && listingTypeQuery === "sale" && isProject;
      if (!matchesRequestedType && !allowProjectAsSale) continue;
    }
    if (!includeProjects && PROJECT_PROPERTY_TYPES.has(listingType)) continue;

    const date = parseDate(row?.listingDate) || parseDate(row?.createdAt);
    if (!date) continue;

    const price = toPositiveNumber(row?.price);
    const area = extractAreaM2(row);
    if (!price || !area || !district) continue;

    const pricePerM2 = price / area;
    cityOverallSum += pricePerM2;
    cityOverallCount += 1;
    addAccumulator(districtOverallMap, district, pricePerM2);

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const period = makePeriodKey(year, month);
    if (!periodSet.has(period)) continue;

    addAccumulator(cityMonthlyMap, period, pricePerM2);
    addAccumulator(districtMonthlyMap, `${district}|${period}`, pricePerM2);
  }

  const cityAvgAll = cityOverallCount > 0 ? cityOverallSum / cityOverallCount : 0;
  const benchmarkKnown = new Map(
    Array.from(cityMonthlyMap.entries()).map(([period, aggregate]) => [
      period,
      {
        price: aggregate.count > 0 ? Math.round(aggregate.sum / aggregate.count) : 0,
        listing_count: aggregate.count,
      },
    ])
  );

  const fallbackBasePrice =
    benchmarkKnown.get(timeline[0]?.period || "")?.price ||
    benchmarkKnown.get(timeline[timeline.length - 1]?.period || "")?.price ||
    Math.max(10000, Math.round(cityAvgAll || 60000));

  const benchmarkSeries = buildFilledSeries({
    timeline,
    knownByPeriod: benchmarkKnown,
    fallbackBasePrice,
    fallbackAnnualGrowth: 0.16,
  });

  const docs = [];
  for (const row of benchmarkSeries) {
    docs.push({
      city: cityLabel,
      district: cityLabel,
      year: row.year,
      month: row.month,
      period: row.period,
      avg_m2_price: row.avg_m2_price,
      listing_count: row.listing_count,
      source: row.source,
      listing_type: listingTypeQuery,
      include_projects: includeProjects,
      generatedAt: new Date(),
    });
  }

  const benchmarkByPeriod = new Map(benchmarkSeries.map((row) => [row.period, row]));

  for (const district of districtNames) {
    if (toFolded(district) === cityFolded) continue;

    const knownByPeriod = new Map();
    for (const [key, aggregate] of districtMonthlyMap.entries()) {
      const [rawDistrict, period] = key.split("|");
      if (toFolded(rawDistrict) !== toFolded(district)) continue;
      knownByPeriod.set(period, {
        price: aggregate.count > 0 ? Math.round(aggregate.sum / aggregate.count) : 0,
        listing_count: aggregate.count,
      });
    }

    const districtOverall = districtOverallMap.get(district);
    const districtAvgAll =
      districtOverall && districtOverall.count > 0 ? districtOverall.sum / districtOverall.count : 0;
    const fallbackRatio =
      cityAvgAll > 0 && districtAvgAll > 0
        ? Math.min(1.8, Math.max(0.6, districtAvgAll / cityAvgAll))
        : districtHashRatio(district);

    const districtFallbackBase = Math.max(
      1000,
      Math.round(fallbackBasePrice * fallbackRatio)
    );

    let filled = buildFilledSeries({
      timeline,
      knownByPeriod,
      fallbackBasePrice: districtFallbackBase,
      fallbackAnnualGrowth: 0.15,
    });

    if (knownByPeriod.size === 0) {
      filled = timeline.map((timeRow) => {
        const benchmark = benchmarkByPeriod.get(timeRow.period);
        return {
          period: timeRow.period,
          year: timeRow.year,
          month: timeRow.month,
          avg_m2_price: Math.max(
            1000,
            Math.round(Number(benchmark?.avg_m2_price || districtFallbackBase) * fallbackRatio)
          ),
          listing_count: 0,
          source: "estimated",
        };
      });
    }

    for (const row of filled) {
      docs.push({
        city: cityLabel,
        district,
        year: row.year,
        month: row.month,
        period: row.period,
        avg_m2_price: row.avg_m2_price,
        listing_count: row.listing_count,
        source: row.source,
        listing_type: listingTypeQuery,
        include_projects: includeProjects,
        generatedAt: new Date(),
      });
    }
  }

  const historyCollection = db.collection(HISTORY_COLLECTION);
  await historyCollection.createIndex(
    { city: 1, district: 1, period: 1, listing_type: 1, include_projects: 1 },
    { unique: true }
  );

  await historyCollection.deleteMany({
    city: cityLabel,
    listing_type: listingTypeQuery,
    include_projects: includeProjects,
  });

  if (docs.length > 0) {
    await historyCollection.insertMany(docs, { ordered: false });
  }

  const listingDocs = docs.filter((doc) => doc.source === "listing").length;
  const estimatedDocs = docs.filter((doc) => doc.source === "estimated").length;
  const uniqueDistrictCount = new Set(docs.map((doc) => doc.district)).size;

  console.log("Market trend history seeded successfully.");
  console.log(
    JSON.stringify(
      {
        city: cityLabel,
        startYear,
        endYear,
        endMonth,
        listingType: listingTypeQuery,
        includeProjects,
        districts: uniqueDistrictCount,
        totalDocs: docs.length,
        listingDocs,
        estimatedDocs,
      },
      null,
      2
    )
  );
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed market trend history:", error);
    process.exit(1);
  });
