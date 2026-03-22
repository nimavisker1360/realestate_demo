import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

interface PropertyEntry {
  id?: string;
  slug?: string;
  seoSlug?: string;
  propertyType?: string;
  projectName?: string;
  title?: string;
  name?: string;
  city?: string;
  address?: string;
  district?: string;
  ilce?: string;
  rooms?: string;
  addressDetails?: {
    city?: string;
    district?: string;
  };
  dairePlanlari?: Array<{
    tip?: string;
    roomType?: string;
  }>;
  updatedAt?: string;
  createdAt?: string;
}

interface BlogEntry {
  id?: string;
  slug?: string;
  country?: string;
  title?: string;
  title_en?: string;
  title_tr?: string;
  title_ru?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface SitemapUrl {
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

const SITE_URL = "https://demo.example";
const rawApiBase =
  process.env.SITEMAP_API_URL ||
  process.env.VITE_API_URL ||
  `${SITE_URL}/api`;

const normalizeBaseUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/+$/, "");
  }
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${SITE_URL.replace(/\/+$/, "")}${normalizedPath}`.replace(/\/+$/, "");
};

const API_BASE = normalizeBaseUrl(rawApiBase);
const TODAY = new Date().toISOString().split("T")[0];

const staticPages: SitemapUrl[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/listing", changefreq: "daily", priority: "0.9" },
  { path: "/projects", changefreq: "weekly", priority: "0.8" },
  { path: "/blogs", changefreq: "weekly", priority: "0.8" },
  { path: "/consultants", changefreq: "monthly", priority: "0.6" },
  { path: "/addresses", changefreq: "monthly", priority: "0.6" },
  { path: "/today", changefreq: "daily", priority: "0.7" },
  { path: "/istanbul-apartments", changefreq: "weekly", priority: "0.8" },
  { path: "/kyrenia-apartments", changefreq: "weekly", priority: "0.8" },
  { path: "/investment-opportunities", changefreq: "weekly", priority: "0.8" },
  { path: "/turkey-property-investment", changefreq: "weekly", priority: "0.8" },
  { path: "/turkish-citizenship-property", changefreq: "weekly", priority: "0.8" },
];

const toIsoDate = (value?: string) => {
  if (!value) return TODAY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return TODAY;
  return date.toISOString().split("T")[0];
};

const slugify = (value = "") =>
  value
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const isObjectId = (value = "") =>
  /^[a-f0-9]{24}$/i.test(String(value || "").trim());

const extractObjectId = (value = "") => {
  const match = String(value || "").trim().match(/([a-f0-9]{24})$/i);
  return match ? match[1] : "";
};

const pickText = (...values: Array<unknown>) => {
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

const getProjectRoomTypes = (property: PropertyEntry) => {
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

const getProjectDistrict = (property: PropertyEntry) => {
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

const titleContainsLocation = (title: string, district: string, city: string) => {
  const normalizedTitle = slugify(title);
  if (!normalizedTitle) return false;
  const normalizedDistrict = slugify(district);
  const normalizedCity = slugify(city);

  return (
    (normalizedDistrict && normalizedTitle.includes(normalizedDistrict)) ||
    (normalizedCity && normalizedTitle.includes(normalizedCity))
  );
};

const titleContainsToken = (title: string, token: string) => {
  const normalizedTitle = slugify(title);
  if (!normalizedTitle) return false;
  const normalizedToken = slugify(token);
  return Boolean(normalizedToken && normalizedTitle.includes(normalizedToken));
};

const buildProjectSlugBase = (property: PropertyEntry) => {
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

const toListingPath = (property: PropertyEntry): string | null => {
  const id = String(property.id || "").trim();
  const rawSlug = pickText(property.slug, property.seoSlug);
  const city = pickText(property.city, property.addressDetails?.city);
  const isIstanbulListing = slugify(city) === "istanbul";

  if (!isIstanbulListing) {
    if (rawSlug) return `/listing/${encodeURIComponent(rawSlug)}`;
    if (id) return `/listing/${id}`;
    return null;
  }

  const normalizedRawSlug = String(rawSlug || "").trim();
  const rawSlugHasIstanbul = slugify(normalizedRawSlug).includes("istanbul");
  if (normalizedRawSlug && rawSlugHasIstanbul) {
    return `/listing/${encodeURIComponent(normalizedRawSlug)}`;
  }

  const trailingId = extractObjectId(normalizedRawSlug) || id;
  const existingBase = slugify(
    normalizedRawSlug
      .replace(/-[a-f0-9]{24}$/i, "")
      .replace(/^[a-f0-9]{24}$/i, "")
  );
  const titleBase = slugify(pickText(property.title, property.name, "property"));
  const base = existingBase || titleBase || "property";
  const istanbulBase = base.includes("istanbul") ? base : `${base}-in-istanbul`;

  if (trailingId) {
    return `/listing/${encodeURIComponent(`${istanbulBase}-${trailingId}`)}`;
  }

  if (normalizedRawSlug) {
    return `/listing/${encodeURIComponent(normalizedRawSlug)}`;
  }

  return `/listing/${encodeURIComponent(istanbulBase)}`;
};

const toProjectPath = (property: PropertyEntry): string | null => {
  const type = String(property.propertyType || "").toLowerCase().trim();
  if (type !== "local-project" && type !== "international-project") {
    return null;
  }
  const id = String(property.id || "").trim();
  if (!id) return null;
  return `/projects/${encodeURIComponent(`${buildProjectSlugBase(property)}-${id}`)}`;
};

const resolveBlogSlug = (blog: BlogEntry): string => {
  const existingSlug = String(blog.slug || "").trim();
  if (existingSlug && !isObjectId(existingSlug)) return existingSlug;

  const titleSource = pickText(
    blog.title_en,
    blog.title,
    blog.title_tr,
    blog.title_ru,
    "blog"
  );
  const baseSlug = slugify(titleSource) || "blog";
  const id = String(blog.id || "").trim().toLowerCase();
  return id ? `${baseSlug}-${id}` : baseSlug;
};

const toBlogPath = (blog: BlogEntry): string | null => {
  const slug = resolveBlogSlug(blog);
  return slug ? `/blog/${encodeURIComponent(slug)}` : null;
};

const extractCountryFromTitle = (rawTitle?: string) => {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  const cleaned = rawTitle.replace(/[?!\u061f]+$/g, "").trim();
  const lower = cleaned.toLowerCase();
  const inIndex = lower.lastIndexOf(" in ");
  if (inIndex !== -1 && inIndex + 4 < cleaned.length) {
    return cleaned.slice(inIndex + 4).trim();
  }
  return "";
};

const resolveBlogCountry = (blog: BlogEntry) => {
  const direct = String(blog.country || "").trim();
  if (direct) return direct;
  return (
    extractCountryFromTitle(blog.title_en) ||
    extractCountryFromTitle(blog.title_tr) ||
    extractCountryFromTitle(blog.title_ru) ||
    extractCountryFromTitle(blog.title)
  );
};

const isExcludedCountry = (value: string) => {
  const normalized = value.toLowerCase().trim();
  return normalized === "turkey" || normalized === "turkiye";
};

const toCountryPath = (blog: BlogEntry): string | null => {
  const country = resolveBlogCountry(blog);
  if (!country || isExcludedCountry(country)) return null;
  const countrySlug = slugify(country);
  if (countrySlug) return `/blogs/${encodeURIComponent(countrySlug)}`;
  const encoded = encodeURIComponent(String(country).toLowerCase().trim());
  return encoded ? `/blogs/${encoded.toLowerCase()}` : null;
};

const fetchPropertyEntries = async (): Promise<PropertyEntry[]> => {
  try {
    const response = await fetch(`${API_BASE}/residency/allresd`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }

    const data = (await response.json()) as PropertyEntry[];
    return Array.isArray(data) ? data : [];
  } catch (_error) {
    console.warn(
      `[sitemap] Failed to fetch properties from ${API_BASE}/residency/allresd. Continuing with static URLs only.`
    );
    return [];
  }
};

const fetchBlogEntries = async (): Promise<BlogEntry[]> => {
  try {
    const response = await fetch(`${API_BASE}/blog/all`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }

    const data = (await response.json()) as BlogEntry[];
    return Array.isArray(data) ? data : [];
  } catch (_error) {
    console.warn(
      `[sitemap] Failed to fetch blogs from ${API_BASE}/blog/all. Continuing without blog URLs.`
    );
    return [];
  }
};

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toUrlNode = (url: SitemapUrl) => {
  const loc = `${SITE_URL.replace(/\/+$/, "")}${url.path}`;
  const lines = [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${url.lastmod || TODAY}</lastmod>`,
  ];

  if (url.changefreq) {
    lines.push(`    <changefreq>${url.changefreq}</changefreq>`);
  }
  if (url.priority) {
    lines.push(`    <priority>${url.priority}</priority>`);
  }

  lines.push("  </url>");
  return lines.join("\n");
};

const main = async () => {
  const [properties, blogs] = await Promise.all([
    fetchPropertyEntries(),
    fetchBlogEntries(),
  ]);

  const listingPages: SitemapUrl[] = properties
    .map((property) => {
      const listingPath = toListingPath(property);
      if (!listingPath) return null;
      return {
        path: listingPath,
        lastmod: toIsoDate(property.updatedAt || property.createdAt),
        changefreq: "daily",
        priority: "0.7",
      } as SitemapUrl;
    })
    .filter((item): item is SitemapUrl => Boolean(item));

  const projectPages: SitemapUrl[] = properties
    .map((property) => {
      const projectPath = toProjectPath(property);
      if (!projectPath) return null;
      return {
        path: projectPath,
        lastmod: toIsoDate(property.updatedAt || property.createdAt),
        changefreq: "weekly",
        priority: "0.7",
      } as SitemapUrl;
    })
    .filter((item): item is SitemapUrl => Boolean(item));

  const blogPages: SitemapUrl[] = blogs
    .map((blog) => {
      const blogPath = toBlogPath(blog);
      if (!blogPath) return null;
      return {
        path: blogPath,
        lastmod: toIsoDate(blog.updatedAt || blog.createdAt),
        changefreq: "weekly",
        priority: "0.7",
      } as SitemapUrl;
    })
    .filter((item): item is SitemapUrl => Boolean(item));

  const countryPages: SitemapUrl[] = blogs
    .map((blog) => {
      const countryPath = toCountryPath(blog);
      if (!countryPath) return null;
      return {
        path: countryPath,
        lastmod: toIsoDate(blog.updatedAt || blog.createdAt),
        changefreq: "weekly",
        priority: "0.6",
      } as SitemapUrl;
    })
    .filter((item): item is SitemapUrl => Boolean(item));

  const unique = new Map<string, SitemapUrl>();
  [...staticPages, ...listingPages, ...projectPages, ...blogPages, ...countryPages].forEach(
    (item) => {
      unique.set(item.path, item);
    }
  );

  const urlset = Array.from(unique.values()).map(toUrlNode).join("\n");
  const sitemap = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${urlset}\n</urlset>\n`;

  const outputDir = path.join(process.cwd(), "public");
  const outputPath = path.join(outputDir, "sitemap.xml");

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, sitemap, "utf8");

  console.log(
    `[sitemap] Generated ${outputPath} with ${unique.size} URLs (${staticPages.length} static, ${listingPages.length + projectPages.length + blogPages.length + countryPages.length} dynamic).`
  );
};

main().catch((error) => {
  console.error("[sitemap] Failed to generate sitemap:", error);
  process.exit(1);
});
