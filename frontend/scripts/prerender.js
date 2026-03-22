import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.hbrealstate.com";
const API_BASE = process.env.SITEMAP_API_URL || `${SITE_URL}/api`;
const ENABLE_REACT_SNAP = process.env.ENABLE_REACT_SNAP === "1";
const parsedLimit = Number(process.env.PRERENDER_PROPERTY_LIMIT || 0);
const MAX_PROPERTY_ROUTES =
  Number.isFinite(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : Number.POSITIVE_INFINITY;
const DIST_DIR = path.join(process.cwd(), "dist");
const BASE_HTML_PATH = path.join(DIST_DIR, "index.html");

const STATIC_PAGE_META = {
  "/": {
    title:
      "demo | Turkey Property & Investment Opportunities",
    description:
      "Explore apartments, villas, and investment-ready projects across Istanbul, Kyrenia, and major Turkish markets with demo.",
    canonical: `${SITE_URL}/`,
  },
  "/listing": {
    title: "Turkey Property Listings | demo",
    description:
      "Browse verified apartments, villas, and investment opportunities across Turkey. Compare prices, features, and locations with demo.",
    canonical: `${SITE_URL}/listing`,
  },
  "/projects": {
    title: "Real Estate Projects | demo",
    description:
      "Discover local and international real estate projects with delivery timelines, plan options, and pricing insights.",
    canonical: `${SITE_URL}/projects`,
  },
  "/istanbul-apartments": {
    title: "Istanbul Apartments: Complete Buyer and Investor Guide",
    description:
      "Discover where, when, and how to buy Istanbul apartments with practical guidance on districts, yields, legal checks, and long-term value.",
    canonical: `${SITE_URL}/istanbul-apartments`,
  },
  "/kyrenia-apartments": {
    title: "Kyrenia Apartments: A Practical Guide For Buyers And Investors",
    description:
      "Learn how to evaluate Kyrenia apartments with a data-led approach covering rental demand, project quality, legal checks, and long-term exit planning.",
    canonical: `${SITE_URL}/kyrenia-apartments`,
  },
  "/turkey-property-investment": {
    title: "Turkey Property Investment: Strategy, Risk, And Return Framework",
    description:
      "Build a stronger Turkey property investment strategy with practical guidance on market selection, due diligence, financing, and long-term portfolio management.",
    canonical: `${SITE_URL}/turkey-property-investment`,
  },
  "/turkish-citizenship-property": {
    title: "Turkish Citizenship By Property: A Clear Investor Playbook",
    description:
      "Understand how to approach Turkish citizenship by property with a practical framework for eligibility, due diligence, and long-term asset performance.",
    canonical: `${SITE_URL}/turkish-citizenship-property`,
  },
};

const STATIC_ROUTES = Object.keys(STATIC_PAGE_META);

const normalizeRoute = (value) => {
  const route = String(value || "/").trim();
  if (!route || route === "/") return "/";
  return route.startsWith("/") ? route : `/${route}`;
};

const routeToFilePath = (route) => {
  const normalized = normalizeRoute(route);
  if (normalized === "/") return BASE_HTML_PATH;
  const parts = normalized.replace(/^\/+|\/+$/g, "").split("/");
  return path.join(DIST_DIR, ...parts, "index.html");
};

const ensureFileDir = async (filePath) => {
  await mkdir(path.dirname(filePath), { recursive: true });
};

const htmlEscape = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const upsertTag = (html, pattern, replacement) => {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  return html.replace("</head>", `${replacement}\n</head>`);
};

const setSeoHead = (html, meta) => {
  const canonical = meta.canonical || `${SITE_URL}/`;
  const ogImage = meta.ogImage || `${SITE_URL}/og-image.png`;
  const description = meta.description || "";
  const title = meta.title || "demo";

  let result = html;
  result = result
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<meta[^>]*name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<link[^>]*rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]*property=["']og:title["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]*property=["']og:description["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]*property=["']og:url["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]*property=["']og:image["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]*name=["']twitter:title["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]*name=["']twitter:description["'][^>]*>\s*/gi, "")
    .replace(/<meta[^>]*name=["']twitter:image["'][^>]*>\s*/gi, "");

  const seoCoreBlock = [
    `<title>${htmlEscape(title)}</title>`,
    `<meta name="description" content="${htmlEscape(description)}" />`,
    `<link rel="canonical" href="${htmlEscape(canonical)}" />`,
    `<meta property="og:title" content="${htmlEscape(title)}" />`,
    `<meta property="og:description" content="${htmlEscape(description)}" />`,
    `<meta property="og:url" content="${htmlEscape(canonical)}" />`,
    `<meta property="og:image" content="${htmlEscape(ogImage)}" />`,
    `<meta name="twitter:title" content="${htmlEscape(title)}" />`,
    `<meta name="twitter:description" content="${htmlEscape(description)}" />`,
    `<meta name="twitter:image" content="${htmlEscape(ogImage)}" />`,
  ].join("\n");

  result = result.replace("</head>", `${seoCoreBlock}\n</head>`);

  result = result.replace(
    /<!-- SEO_JSONLD_START -->[\s\S]*?<!-- SEO_JSONLD_END -->\s*/gi,
    ""
  );
  result = result.replace(
    /<meta\s+name=["']robots["'][^>]*noindex[^>]*>\s*/gi,
    ""
  );

  if (meta.noindex) {
    result = upsertTag(
      result,
      /<meta\s+name=["']robots["'][^>]*>/i,
      `<meta name="robots" content="noindex, nofollow" />`
    );
  }

  const jsonLdEntries = Array.isArray(meta.jsonLd) ? meta.jsonLd : [];
  if (jsonLdEntries.length > 0) {
    const scriptBlock = jsonLdEntries
      .filter(Boolean)
      .map(
        (entry) =>
          `<script type="application/ld+json">${JSON.stringify(entry)}</script>`
      )
      .join("\n");
    result = result.replace(
      "</head>",
      `<!-- SEO_JSONLD_START -->\n${scriptBlock}\n<!-- SEO_JSONLD_END -->\n</head>`
    );
  }

  return result;
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
};

const slugify = (value = "") =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeRoomTypeForSlug = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\+/g, "-")
    .replace(/\s+/g, " ");

const getProjectRoomTypes = (property) => {
  const fromPlans = Array.isArray(property?.dairePlanlari)
    ? property.dairePlanlari
        .map((plan) => pickText(plan?.tip, plan?.roomType))
        .filter(Boolean)
    : [];

  const fromRoomsField = pickText(property?.rooms)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set([...fromPlans, ...fromRoomsField])).slice(0, 4);
};

const getProjectDistrict = (property) => {
  const directDistrict = pickText(
    property?.addressDetails?.district,
    property?.district,
    property?.ilce
  );
  if (directDistrict) return directDistrict;

  const address = pickText(property?.address);
  if (!address) return "";
  const [firstPart] = address.split(",");
  return pickText(firstPart);
};

const titleContainsLocation = (title, district, city) => {
  const normalizedTitle = slugify(title);
  if (!normalizedTitle) return false;
  const normalizedDistrict = slugify(district);
  const normalizedCity = slugify(city);

  return (
    (normalizedDistrict && normalizedTitle.includes(normalizedDistrict)) ||
    (normalizedCity && normalizedTitle.includes(normalizedCity))
  );
};

const buildProjectSlugBase = (property) => {
  const projectTitle = pickText(
    property?.projectName,
    property?.title,
    property?.name,
    "New Residential Project"
  );
  const district = getProjectDistrict(property);
  const city = pickText(property?.city, property?.addressDetails?.city);
  const location = [district, city].filter(Boolean).join(", ");
  const includeLocation = location && !titleContainsLocation(projectTitle, district, city);

  const roomTypes = getProjectRoomTypes(property)
    .map((item) => normalizeRoomTypeForSlug(item))
    .filter(Boolean);

  const sections = [
    includeLocation ? `${projectTitle} in ${location}` : projectTitle,
    roomTypes.length > 0 ? `${roomTypes.join(", ")} Apartments` : "Apartments",
    "demo",
  ];

  const slugBase = slugify(sections.join(" | "));
  if (!slugBase) return "demo-project";
  return slugBase.slice(0, 170).replace(/-+$/g, "");
};

const truncate = (value, max = 170) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
};

const toAbsoluteImage = (value) => {
  try {
    return new URL(value || "/og-image.png", SITE_URL).toString();
  } catch (_error) {
    return `${SITE_URL}/og-image.png`;
  }
};

const extractGeo = (property) => {
  const candidates = [
    property?.geo,
    property?.coordinates,
    property?.location,
    property?.iletisim?.koordinatlar,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate) && candidate.length >= 2) {
      const lat = toNumber(candidate[0]);
      const lng = toNumber(candidate[1]);
      if (lat !== null && lng !== null) return { lat, lng };
    }

    const lat = toNumber(
      candidate?.lat ?? candidate?.latitude ?? candidate?.y ?? candidate?.Lat
    );
    const lng = toNumber(
      candidate?.lng ??
        candidate?.lon ??
        candidate?.long ??
        candidate?.longitude ??
        candidate?.x ??
        candidate?.Lng
    );
    if (lat !== null && lng !== null) return { lat, lng };
  }

  const fallbackLat = toNumber(property?.lat ?? property?.latitude);
  const fallbackLng = toNumber(
    property?.lng ?? property?.lon ?? property?.long ?? property?.longitude
  );
  if (fallbackLat !== null && fallbackLng !== null) {
    return { lat: fallbackLat, lng: fallbackLng };
  }

  return null;
};

const pushIfPresent = (target, key, value) => {
  if (value === null || value === undefined) return;
  if (typeof value === "string" && !value.trim()) return;
  if (Array.isArray(value) && value.length === 0) return;
  target[key] = value;
};

const resolveAvailability = (property) => {
  const explicit = pickText(property?.availability);
  if (explicit) {
    return explicit.startsWith("http")
      ? explicit
      : `https://schema.org/${explicit}`;
  }

  const listingStatus = pickText(property?.listingStatus).toLowerCase();
  if (listingStatus === "ready") return "https://schema.org/InStock";
  if (listingStatus === "offplan") return "https://schema.org/PreOrder";
  return "";
};

const toRoomsCount = (value) => {
  if (typeof value === "number" && value > 0) return value;
  const text = pickText(value);
  const match = text.match(/^(\d+)/);
  return match ? toPositiveNumber(match[1]) : null;
};

const buildPropertyMeta = (property, route) => {
  const city = pickText(property?.city, property?.addressDetails?.city);
  const district = pickText(
    property?.addressDetails?.district,
    property?.district,
    property?.ilce
  );
  const titleOrName = pickText(property?.title, property?.name, "Property");
  const locationLabel = pickText(`${city} ${district}`) || "Turkey";
  const canonical = `${SITE_URL}${route}`;

  const sourceDescription = pickText(
    property?.description_en,
    property?.description,
    property?.description_tr,
    property?.description_ru
  );
  const roomsText = pickText(property?.rooms);
  const bedroomCount = toPositiveNumber(property?.facilities?.bedrooms);
  const roomLabel = roomsText || (bedroomCount ? `${bedroomCount} bedroom` : "");
  const highlights = [
    pickText(property?.category),
    pickText(property?.usageStatus),
    pickText(property?.deedStatus),
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  const numericPrice = toPositiveNumber(property?.price);
  const priceLabel =
    numericPrice && pickText(property?.currency)
      ? `${numericPrice.toLocaleString()} ${pickText(property?.currency)}`
      : numericPrice
      ? `${numericPrice.toLocaleString()}`
      : "";

  const description = truncate(
    [
      roomLabel ? `${roomLabel} property` : "",
      locationLabel ? `in ${locationLabel}` : "",
      priceLabel ? `priced at ${priceLabel}` : "",
      highlights ? `Highlights: ${highlights}` : "",
      sourceDescription || "",
    ]
      .filter(Boolean)
      .join(". ")
  );

  const finalDescription =
    description ||
    "Explore this property detail and contact demo for current price and availability.";

  const title = `${titleOrName} | ${locationLabel} | For Sale | demo`;
  const ogImage = toAbsoluteImage(property?.images?.[0] || property?.image);
  const images = [
    ...(Array.isArray(property?.images) ? property.images : []),
    pickText(property?.image),
  ]
    .filter(Boolean)
    .map((item) => toAbsoluteImage(item));

  const realEstateListing = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
  };
  pushIfPresent(realEstateListing, "name", pickText(property?.title, property?.name));
  pushIfPresent(realEstateListing, "description", sourceDescription || finalDescription);
  pushIfPresent(realEstateListing, "url", canonical);
  pushIfPresent(realEstateListing, "image", images);

  const address = {
    "@type": "PostalAddress",
  };
  pushIfPresent(address, "streetAddress", pickText(property?.address));
  pushIfPresent(address, "addressLocality", city);
  pushIfPresent(address, "addressRegion", district);
  pushIfPresent(address, "addressCountry", pickText(property?.country));
  if (Object.keys(address).length > 1) {
    realEstateListing.address = address;
  }

  const geo = extractGeo(property);
  if (geo) {
    realEstateListing.geo = {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lng,
    };
  }

  const offer = {
    "@type": "Offer",
  };
  pushIfPresent(offer, "price", toPositiveNumber(property?.price));
  pushIfPresent(offer, "priceCurrency", pickText(property?.currency));
  pushIfPresent(offer, "availability", resolveAvailability(property));
  pushIfPresent(offer, "url", canonical);
  if (Object.keys(offer).length > 1) {
    realEstateListing.offers = offer;
  }

  pushIfPresent(
    realEstateListing,
    "numberOfRooms",
    toRoomsCount(property?.rooms) || toPositiveNumber(property?.facilities?.bedrooms)
  );
  const areaValue =
    toPositiveNumber(property?.area?.gross) ||
    toPositiveNumber(property?.area?.net) ||
    toPositiveNumber(property?.area?.m2) ||
    toPositiveNumber(property?.m2);
  if (areaValue) {
    realEstateListing.floorSize = {
      "@type": "QuantitativeValue",
      value: Number(areaValue),
      unitCode: "MTK",
    };
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Listing",
        item: `${SITE_URL}/listing`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: titleOrName,
        item: canonical,
      },
    ],
  };

  return {
    title,
    description: finalDescription,
    canonical,
    ogImage,
    jsonLd: [realEstateListing, breadcrumb],
  };
};

const isProjectProperty = (property) => {
  const type = pickText(property?.propertyType).toLowerCase();
  return (
    type === "local-project" ||
    type === "international-project" ||
    type === "special-offer"
  );
};

const toProjectRoute = (property) => {
  const id = pickText(property?.id);
  if (!id) return null;
  return `/projects/${encodeURIComponent(`${buildProjectSlugBase(property)}-${id}`)}`;
};

const toProjectArea = (property) => {
  const planAreas =
    property?.dairePlanlari
      ?.map((item) => toPositiveNumber(item?.metrekare))
      .filter(Boolean) || [];
  if (planAreas.length > 0) return Math.min(...planAreas);
  return (
    toPositiveNumber(property?.area?.gross) ||
    toPositiveNumber(property?.area?.net) ||
    toPositiveNumber(property?.area?.m2) ||
    toPositiveNumber(property?.m2)
  );
};

const toProjectRoomSummary = (property) => {
  const types = Array.from(
    new Set(
      (property?.dairePlanlari || [])
        .map((item) => pickText(item?.tip, item?.roomType))
        .filter(Boolean)
    )
  );
  return types.slice(0, 3).join(", ");
};

const resolveProjectSchemaType = (property) => {
  const explicitSchemaType = pickText(
    property?.schemaType,
    property?.schema?.type
  ).toLowerCase();
  if (explicitSchemaType === "apartmentcomplex") return "ApartmentComplex";
  if (explicitSchemaType === "residence") return "Residence";

  const planCount = Array.isArray(property?.dairePlanlari)
    ? property.dairePlanlari.length
    : 0;
  const unitCount = toPositiveNumber(
    property?.unitCount ?? property?.totalUnits ?? property?.numberOfUnits
  );
  if (planCount > 1 || (unitCount !== null && unitCount > 1)) {
    return "ApartmentComplex";
  }
  return "Residence";
};

const getDistrictFromAddress = (address) => {
  const normalized = pickText(address);
  if (!normalized) return "";
  const [firstPart] = normalized.split(",");
  return pickText(firstPart);
};

const buildProjectMeta = (property, route) => {
  const city = pickText(property?.city, property?.addressDetails?.city);
  const district = pickText(
    property?.addressDetails?.district,
    property?.district,
    getDistrictFromAddress(property?.address)
  );
  const projectName = pickText(
    property?.projectName,
    property?.title,
    property?.name,
    "Project"
  );
  const locationLabel = pickText(`${city} ${district}`) || "Turkey";
  const canonical = `${SITE_URL}${route}`;

  const sourceDescription = pickText(
    property?.projeHakkinda?.description_en,
    property?.projeHakkinda?.description,
    property?.projeHakkinda?.description_tr,
    property?.projeHakkinda?.description_ru,
    property?.description_en,
    property?.description,
    property?.description_tr,
    property?.description_ru
  );

  const roomSummary = toProjectRoomSummary(property);
  const areaValue = toProjectArea(property);
  const numericPrice = toPositiveNumber(property?.price);
  const priceLabel =
    numericPrice && pickText(property?.currency)
      ? `${numericPrice.toLocaleString()} ${pickText(property?.currency)}`
      : numericPrice
      ? `${numericPrice.toLocaleString()}`
      : "";
  const projectStatus = pickText(property?.projectStatus, property?.listingStatus);
  const deliveryDate = pickText(property?.deliveryDate);

  const description = truncate(
    [
      roomSummary ? `Layouts: ${roomSummary}` : "",
      areaValue ? `Area from ${areaValue} m2` : "",
      locationLabel ? `in ${locationLabel}` : "",
      priceLabel ? `Starting from ${priceLabel}` : "",
      projectStatus ? `Status: ${projectStatus}` : "",
      deliveryDate ? `Delivery: ${deliveryDate}` : "",
      sourceDescription || "",
    ]
      .filter(Boolean)
      .join(". ")
  );

  const finalDescription =
    description ||
    "Explore this project detail and contact demo for current availability and pricing.";

  const title = `${projectName} | ${locationLabel} | Project | demo`;
  const ogImage = toAbsoluteImage(property?.images?.[0] || property?.image);
  const images = [
    ...(Array.isArray(property?.images) ? property.images : []),
    pickText(property?.image),
  ]
    .filter(Boolean)
    .map((item) => toAbsoluteImage(item));

  const realEstateListing = {
    "@context": "https://schema.org",
    "@type": resolveProjectSchemaType(property),
  };
  pushIfPresent(
    realEstateListing,
    "name",
    pickText(property?.projectName, property?.title, property?.name)
  );
  pushIfPresent(realEstateListing, "description", sourceDescription || finalDescription);
  pushIfPresent(realEstateListing, "url", canonical);
  pushIfPresent(realEstateListing, "image", images);

  const address = {
    "@type": "PostalAddress",
  };
  pushIfPresent(address, "streetAddress", pickText(property?.address));
  pushIfPresent(address, "addressLocality", city);
  pushIfPresent(address, "addressRegion", district);
  pushIfPresent(address, "addressCountry", pickText(property?.country));
  if (Object.keys(address).length > 1) {
    realEstateListing.address = address;
  }

  const geo = extractGeo(property);
  if (geo) {
    realEstateListing.geo = {
      "@type": "GeoCoordinates",
      latitude: geo.lat,
      longitude: geo.lng,
    };
  }

  const offer = {
    "@type": "Offer",
  };
  pushIfPresent(offer, "price", toPositiveNumber(property?.price));
  pushIfPresent(offer, "priceCurrency", pickText(property?.currency));
  pushIfPresent(offer, "availability", resolveAvailability(property));
  pushIfPresent(offer, "url", canonical);
  if (Object.keys(offer).length > 1) {
    realEstateListing.offers = offer;
  }

  const firstRoomCount = toPositiveNumber(
    pickText(property?.dairePlanlari?.[0]?.tip).split("+")[0]
  );
  pushIfPresent(realEstateListing, "numberOfRooms", firstRoomCount);
  if (areaValue) {
    realEstateListing.floorSize = {
      "@type": "QuantitativeValue",
      value: Number(areaValue),
      unitCode: "MTK",
    };
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Projects",
        item: `${SITE_URL}/projects`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: projectName,
        item: canonical,
      },
    ],
  };

  return {
    title,
    description: finalDescription,
    canonical,
    ogImage,
    jsonLd: [realEstateListing, breadcrumb],
  };
};

const toListingRoute = (property) => {
  const slugOrId = pickText(property?.slug, property?.seoSlug, property?.id);
  if (!slugOrId) return null;
  return `/listing/${encodeURIComponent(slugOrId)}`;
};

const fetchProperties = async () => {
  try {
    const response = await fetch(`${API_BASE}/residency/allresd`, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  } catch (error) {
    console.warn(
      `[prerender] Could not fetch properties from ${API_BASE}/residency/allresd: ${error?.message || "unknown error"}`
    );
    return [];
  }
};

const getReactSnapRun = async () => {
  const module = await import("react-snap");
  return module.run || module.default?.run;
};

const readHtmlForRoute = async (route, fallbackHtml) => {
  const filePath = routeToFilePath(route);
  try {
    return await readFile(filePath, "utf8");
  } catch (_error) {
    return fallbackHtml;
  }
};

const writeHtmlForRoute = async (route, html) => {
  const filePath = routeToFilePath(route);
  await ensureFileDir(filePath);
  await writeFile(filePath, html, "utf8");
};

const main = async () => {
  const properties = await fetchProperties();
  const listingEntries = properties
    .map((property) => {
      const route = toListingRoute(property);
      if (!route) return null;
      return { property, route };
    })
    .filter(Boolean)
    .slice(0, MAX_PROPERTY_ROUTES);
  const projectEntries = properties
    .map((property) => {
      if (!isProjectProperty(property)) return null;
      const route = toProjectRoute(property);
      if (!route) return null;
      return { property, route };
    })
    .filter(Boolean)
    .slice(0, MAX_PROPERTY_ROUTES);

  const include = Array.from(
    new Set([
      ...STATIC_ROUTES,
      ...listingEntries.map((entry) => entry.route),
      ...projectEntries.map((entry) => entry.route),
    ])
  );

  if (ENABLE_REACT_SNAP) {
    try {
      const run = await getReactSnapRun();
      if (typeof run === "function") {
        await run({
          source: "dist",
          include,
          crawl: true,
          skipThirdPartyRequests: false,
          puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }
    } catch (error) {
      console.warn(
        `[prerender] react-snap reported runtime errors. Continuing with static SEO snapshots. ${error?.message || ""}`
      );
    }
  } else {
    console.log(
      `[prerender] Skipping react-snap (set ENABLE_REACT_SNAP=1 to enable browser snapshot crawl).`
    );
  }

  const baseHtml = await readFile(BASE_HTML_PATH, "utf8");

  for (const route of STATIC_ROUTES) {
    const current = await readHtmlForRoute(route, baseHtml);
    const merged = setSeoHead(current, STATIC_PAGE_META[route]);
    await writeHtmlForRoute(route, merged);
  }

  for (const entry of listingEntries) {
    const current = await readHtmlForRoute(entry.route, baseHtml);
    const merged = setSeoHead(
      current,
      buildPropertyMeta(entry.property, entry.route)
    );
    await writeHtmlForRoute(entry.route, merged);
  }

  for (const entry of projectEntries) {
    const current = await readHtmlForRoute(entry.route, baseHtml);
    const merged = setSeoHead(
      current,
      buildProjectMeta(entry.property, entry.route)
    );
    await writeHtmlForRoute(entry.route, merged);
  }

  console.log(
    `[prerender] Wrote SEO HTML for ${STATIC_ROUTES.length} static routes, ${listingEntries.length} listing detail routes, and ${projectEntries.length} project detail routes.`
  );
};

main().catch((error) => {
  console.error("[prerender] Failed:", error);
  process.exit(1);
});
