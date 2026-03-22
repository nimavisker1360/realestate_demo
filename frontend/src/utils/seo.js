import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
  stripLanguageFromPath,
} from "./languageRouting";

export const SITE_URL = "https://www.hbrealstate.com";
export const SUPPORTED_SEO_LANGS = SUPPORTED_LANGUAGE_CODES;

export const DEFAULT_SEO = {
  title: "demo",
  description:
    "Discover premium real estate investment opportunities in Istanbul, Antalya, and across Turkey with demo.",
  image: "/og-image.png",
  siteName: "demo",
  twitterCard: "summary_large_image",
  locale: "en_US",
  localeAlternates: ["tr_TR", "ru_RU"],
};

export const toAbsoluteUrl = (value = "/") => {
  try {
    if (!value) return SITE_URL;
    return new URL(value, SITE_URL).toString();
  } catch (_error) {
    return SITE_URL;
  }
};

export const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const truncateText = (value, maxLength = 160) => {
  const normalized = stripHtml(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
};

const removeTrailingObjectIdSegment = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (/^[a-f0-9]{24}$/i.test(normalized)) return "";
  return normalized.replace(/-[a-f0-9]{24}$/i, "");
};

export const resolvePropertySlug = (property) => {
  const id = String(property?.id || "").trim();
  const rawSlug = pickText(property?.slug, property?.seoSlug);
  const city = pickText(property?.city, property?.addressDetails?.city);
  const isIstanbulListing = slugify(city) === "istanbul";

  if (!isIstanbulListing) {
    return rawSlug || id || "";
  }

  const normalizedRawSlug = String(rawSlug || "").trim();
  const rawSlugHasIstanbul = slugify(normalizedRawSlug).includes("istanbul");
  if (normalizedRawSlug && rawSlugHasIstanbul) {
    return normalizedRawSlug;
  }

  const trailingId = extractObjectId(normalizedRawSlug) || id;
  const existingBase = slugify(removeTrailingObjectIdSegment(normalizedRawSlug));
  const titleBase = slugify(pickText(property?.title, property?.name, "property"));
  const base = existingBase || titleBase || "property";
  const istanbulBase = base.includes("istanbul") ? base : `${base}-in-istanbul`;

  if (trailingId) {
    return `${istanbulBase}-${trailingId}`;
  }

  // Keep original slug if no id exists to avoid unresolved custom slugs.
  return normalizedRawSlug || istanbulBase;
};

export const resolvePropertyPath = (property) => {
  const slug = resolvePropertySlug(property);
  return slug ? `/listing/${encodeURIComponent(slug)}` : "/listing";
};

const pickText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
};

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

const titleContainsToken = (title, token) => {
  const normalizedTitle = slugify(title);
  if (!normalizedTitle) return false;
  const normalizedToken = slugify(token);
  return Boolean(normalizedToken && normalizedTitle.includes(normalizedToken));
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
  const projectType = String(property?.propertyType || "").toLowerCase().trim();
  const isLocalIstanbulProject =
    projectType === "local-project" && slugify(city) === "istanbul";
  const titleHasDistrict = titleContainsToken(projectTitle, district);
  const titleHasCity = titleContainsToken(projectTitle, city);

  let locationLabel = "";
  if (isLocalIstanbulProject && city && !titleHasCity) {
    locationLabel = [titleHasDistrict ? "" : district, city]
      .filter(Boolean)
      .join(", ");
  } else {
    const location = [district, city].filter(Boolean).join(", ");
    const includeLocation =
      location && !titleContainsLocation(projectTitle, district, city);
    locationLabel = includeLocation ? location : "";
  }

  const roomTypes = getProjectRoomTypes(property)
    .map((item) => normalizeRoomTypeForSlug(item))
    .filter(Boolean);

  const sections = [
    locationLabel ? `${projectTitle} in ${locationLabel}` : projectTitle,
    roomTypes.length > 0 ? `${roomTypes.join(", ")} Apartments` : "Apartments",
    "demo",
  ];

  const slugBase = slugify(sections.join(" | "));
  if (!slugBase) return "demo-project";
  return slugBase.slice(0, 170).replace(/-+$/g, "");
};

export const resolveProjectPath = (property) => {
  const id = String(property?.id || "").trim();
  if (!id) return "/projects";
  const generatedSlugBase = buildProjectSlugBase(property);
  return `/projects/${encodeURIComponent(`${generatedSlugBase}-${id}`)}`;
};

export const extractObjectId = (value = "") => {
  const match = String(value || "").trim().match(/([a-f0-9]{24})$/i);
  return match ? match[1] : "";
};

export const isObjectId = (value = "") =>
  /^[a-f0-9]{24}$/i.test(String(value || "").trim());

export const resolveBlogSlug = (blog) => {
  const existingSlug = String(blog?.slug || "").trim();
  if (existingSlug && !isObjectId(existingSlug)) return existingSlug;

  const titleSource =
    blog?.title_en || blog?.title || blog?.title_tr || blog?.title_ru || "blog";
  const baseSlug = slugify(titleSource) || "blog";
  const id = String(blog?.id || "").trim().toLowerCase();

  // Include id for generated fallback slugs so duplicate titles remain unique.
  return id ? `${baseSlug}-${id}` : baseSlug;
};

export const resolveBlogIdentifier = (blog, options = {}) => {
  const preferSlug = Boolean(options?.preferSlug);
  const slug = resolveBlogSlug(blog);
  const id = String(blog?.id || "").trim();
  return preferSlug ? slug || id : id || slug;
};

export const resolveBlogPath = (blog, options = {}) => {
  const identifier = resolveBlogIdentifier(blog, options);
  return identifier ? `/blog/${encodeURIComponent(identifier)}` : "/blogs";
};

export const slugify = (value = "") =>
  value
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

export const resolveCountrySlug = (value = "") => {
  const normalized = slugify(value);
  if (normalized) return normalized;
  return encodeURIComponent(String(value || "").trim().toLowerCase()).toLowerCase();
};

export const buildLanguageAlternates = (
  pathOrUrl = "/",
  languages = SUPPORTED_SEO_LANGS
) => {
  const absolute = toAbsoluteUrl(pathOrUrl);
  let baseUrl;

  try {
    baseUrl = new URL(absolute);
  } catch (_error) {
    baseUrl = new URL(SITE_URL);
  }

  const alternates = [];
  const seen = new Set();
  const basePathWithoutLanguage = stripLanguageFromPath(baseUrl.pathname || "/");
  const normalizedPath =
    basePathWithoutLanguage && basePathWithoutLanguage !== "/"
      ? basePathWithoutLanguage
      : "";

  languages.forEach((lang) => {
    if (!lang) return;
    const hrefLang = String(lang).toLowerCase();
    if (seen.has(hrefLang)) return;
    seen.add(hrefLang);

    const localized = new URL(baseUrl.toString());
    localized.pathname = `/${hrefLang}${normalizedPath}`;
    alternates.push({ hrefLang, href: localized.toString() });
  });

  const xDefault = new URL(baseUrl.toString());
  xDefault.pathname = `/${DEFAULT_LANGUAGE_CODE}${normalizedPath}`;
  alternates.push({ hrefLang: "x-default", href: xDefault.toString() });
  return alternates;
};
