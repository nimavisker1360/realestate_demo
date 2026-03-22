import asyncHandler from "express-async-handler";
import { getMongoDb, prisma } from "../config/prismaConfig.js";

const DEFAULT_CANONICAL_ORIGIN = "https://www.hbrealstate.com";
const STATIC_PATHS = [
  "/",
  "/listing",
  "/projects",
  "/blogs",
  "/consultants",
  "/addresses",
  "/today",
  "/istanbul-apartments",
  "/kyrenia-apartments",
  "/turkey-property-investment",
  "/turkish-citizenship-property",
];

const normalizeOrigin = (value) => {
  const raw = String(value || DEFAULT_CANONICAL_ORIGIN).trim();
  if (!raw) return DEFAULT_CANONICAL_ORIGIN;
  return raw.replace(/\/+$/, "");
};

const normalizeIdentifier = (value) =>
  String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

const encodePathSegment = (value) => encodeURIComponent(value);

const slugify = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

const isObjectId = (value = "") =>
  /^[a-f0-9]{24}$/i.test(String(value || "").trim());

const resolveLastModified = (...candidates) => {
  for (const value of candidates) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
};

const escapeXml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toPropertyPath = (residency) => {
  const id = normalizeIdentifier(residency?._id);
  const explicitSlug = normalizeIdentifier(residency?.slug);
  const slugFromTitle = slugify(residency?.title);
  const fallbackSlug = slugFromTitle && id ? `${slugFromTitle}-${id}` : "";
  const identifier = explicitSlug || fallbackSlug || id;
  if (!identifier) return null;
  return `/listing/${encodePathSegment(identifier)}`;
};

const toProjectPath = (residency) => {
  const type = String(residency?.propertyType || "").toLowerCase().trim();
  if (type !== "local-project" && type !== "international-project") {
    return null;
  }
  const id = normalizeIdentifier(residency?._id);
  if (!id) return null;
  return `/projects/${encodePathSegment(id)}`;
};

const extractCountryFromTitle = (rawTitle) => {
  if (!rawTitle || typeof rawTitle !== "string") return "";
  const cleaned = rawTitle.replace(/[?!\u061f]+$/g, "").trim();
  const lower = cleaned.toLowerCase();
  const inIndex = lower.lastIndexOf(" in ");
  if (inIndex !== -1 && inIndex + 4 < cleaned.length) {
    return cleaned.slice(inIndex + 4).trim();
  }
  return "";
};

const resolveBlogCountry = (blog) => {
  const direct = String(blog?.country || "").trim();
  if (direct) return direct;
  return (
    extractCountryFromTitle(blog?.title_en) ||
    extractCountryFromTitle(blog?.title_tr) ||
    extractCountryFromTitle(blog?.title_ru) ||
    extractCountryFromTitle(blog?.title)
  );
};

const isExcludedCountry = (value) => {
  const normalized = String(value || "").toLowerCase().trim();
  return normalized === "turkey" || normalized === "turkiye";
};

const resolveBlogSlug = (blog) => {
  const existingSlug = normalizeIdentifier(blog?.slug);
  if (existingSlug && !isObjectId(existingSlug)) return existingSlug;

  const titleSource =
    blog?.title_en || blog?.title || blog?.title_tr || blog?.title_ru || "blog";
  const baseSlug = slugify(titleSource) || "blog";
  const id = normalizeIdentifier(blog?.id).toLowerCase();
  return id ? `${baseSlug}-${id}` : baseSlug;
};

const toBlogPath = (blog) => {
  const slug = resolveBlogSlug(blog);
  if (!slug) return null;
  return `/blog/${encodePathSegment(slug)}`;
};

const toCountryPath = (blog) => {
  const country = resolveBlogCountry(blog);
  if (!country || isExcludedCountry(country)) return null;
  const slug = slugify(country);
  if (slug) {
    return `/blogs/${encodePathSegment(slug)}`;
  }
  const encoded = encodeURIComponent(String(country).toLowerCase().trim());
  if (!encoded) return null;
  return `/blogs/${encoded.toLowerCase()}`;
};

const buildSitemapXml = (urls) => {
  const rows = urls
    .map(
      ({ loc, lastModified }) =>
        `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${escapeXml(
          lastModified
        )}</lastmod>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
};

export const getSitemapXml = asyncHandler(async (_req, res) => {
  const origin = normalizeOrigin(
    process.env.CANONICAL_BASE_URL || process.env.SITEMAP_BASE_URL
  );
  const generatedAt = new Date().toISOString();

  const staticUrls = STATIC_PATHS.map((path) => ({
    loc: `${origin}${path}`,
    lastModified: generatedAt,
  }));

  let propertyUrls = [];
  let projectUrls = [];
  let blogUrls = [];
  let countryUrls = [];

  try {
    const db = await getMongoDb();
    const residencies = await db
      .collection("Residency")
      .find(
        {},
        {
          projection: {
            _id: 1,
            slug: 1,
            title: 1,
            propertyType: 1,
            updatedAt: 1,
            createdAt: 1,
          },
        }
      )
      .toArray();

    propertyUrls = residencies
      .map((residency) => {
        const path = toPropertyPath(residency);
        if (!path) return null;
        return {
          loc: `${origin}${path}`,
          lastModified: resolveLastModified(
            residency?.updatedAt,
            residency?.createdAt,
            generatedAt
          ),
        };
      })
      .filter(Boolean);

    projectUrls = residencies
      .map((residency) => {
        const path = toProjectPath(residency);
        if (!path) return null;
        return {
          loc: `${origin}${path}`,
          lastModified: resolveLastModified(
            residency?.updatedAt,
            residency?.createdAt,
            generatedAt
          ),
        };
      })
      .filter(Boolean);
  } catch (error) {
    // Keep sitemap available even if the database is temporarily unreachable.
    console.error("[sitemap] failed to fetch residency URLs:", error.message);
  }

  try {
    const blogs = await prisma.blog.findMany({
      where: { published: true },
      select: {
        id: true,
        slug: true,
        title: true,
        title_en: true,
        title_tr: true,
        title_ru: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    blogUrls = blogs
      .map((blog) => {
        const path = toBlogPath(blog);
        if (!path) return null;
        return {
          loc: `${origin}${path}`,
          lastModified: resolveLastModified(
            blog?.updatedAt,
            blog?.createdAt,
            generatedAt
          ),
        };
      })
      .filter(Boolean);

    countryUrls = blogs
      .map((blog) => {
        const path = toCountryPath(blog);
        if (!path) return null;
        return {
          loc: `${origin}${path}`,
          lastModified: resolveLastModified(
            blog?.updatedAt,
            blog?.createdAt,
            generatedAt
          ),
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("[sitemap] failed to fetch blog URLs:", error.message);
  }

  const uniqueByLoc = new Map();
  for (const item of [
    ...staticUrls,
    ...propertyUrls,
    ...projectUrls,
    ...blogUrls,
    ...countryUrls,
  ]) {
    if (!item?.loc) continue;
    if (!uniqueByLoc.has(item.loc)) uniqueByLoc.set(item.loc, item);
  }

  const xml = buildSitemapXml([...uniqueByLoc.values()]);

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set(
    "Cache-Control",
    "public, max-age=0, s-maxage=600, stale-while-revalidate=86400"
  );
  res.status(200).send(xml);
});
