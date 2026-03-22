import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_SEO,
  SITE_URL,
  buildLanguageAlternates,
  toAbsoluteUrl,
} from "../utils/seo";

type StructuredData = Record<string, unknown>;

type AlternateLink = {
  hrefLang?: string;
  href?: string;
};

type SEOProps = {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  canonicalPath?: string;
  image?: string;
  robots?: string;
  type?: string;
  structuredData?: StructuredData[];
  languageAlternates?: AlternateLink[];
  locale?: string;
  localeAlternates?: string[];
};

const normalizeCanonical = (value: string) => {
  try {
    const url = new URL(value, SITE_URL);
    url.hash = "";
    return url.toString();
  } catch (_error) {
    return SITE_URL;
  }
};

const SEO = ({
  title,
  description,
  canonical,
  ogImage,
  noindex = false,
  canonicalPath,
  image,
  robots,
  type = "website",
  structuredData = [],
  languageAlternates,
  locale,
  localeAlternates,
}: SEOProps) => {
  const location = useLocation();

  const resolvedTitle = title || DEFAULT_SEO.title;
  const resolvedDescription = description || DEFAULT_SEO.description;
  const canonicalInput =
    canonical || canonicalPath || location.pathname || "/";
  const canonicalUrl = normalizeCanonical(canonicalInput);
  const imageUrl = toAbsoluteUrl(ogImage || image || DEFAULT_SEO.image);
  const resolvedLocale = locale || DEFAULT_SEO.locale;
  const resolvedLocaleAlternates =
    Array.isArray(localeAlternates) && localeAlternates.length > 0
      ? localeAlternates
      : DEFAULT_SEO.localeAlternates;
  const resolvedAlternates =
    Array.isArray(languageAlternates) && languageAlternates.length > 0
      ? languageAlternates
      : buildLanguageAlternates(canonicalUrl);
  const shouldNoIndex =
    noindex || String(robots || "").toLowerCase().includes("noindex");

  return (
    <Helmet prioritizeSeoTags>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={DEFAULT_SEO.siteName} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={resolvedTitle} />
      <meta property="og:locale" content={resolvedLocale} />
      {resolvedLocaleAlternates
        .filter(Boolean)
        .map((item) => (
          <meta key={item} property="og:locale:alternate" content={item} />
        ))}
      <meta name="twitter:card" content={DEFAULT_SEO.twitterCard} />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={imageUrl} />
      {shouldNoIndex && (
        <meta name="robots" content="noindex, nofollow" />
      )}

      {resolvedAlternates
        .filter((item) => item?.hrefLang && item?.href)
        .map((item) => (
          <link
            key={`${item.hrefLang}-${item.href}`}
            rel="alternate"
            hrefLang={item.hrefLang}
            href={item.href}
          />
        ))}

      {structuredData
        .filter(Boolean)
        .map((schema, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
    </Helmet>
  );
};

export default SEO;
