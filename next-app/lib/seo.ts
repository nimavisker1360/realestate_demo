import type { ListingFilters } from "../types/property";

export const getSiteUrl = (): string =>
  String(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(
    /\/+$/,
    "",
  );

export const buildListingSeoText = (
  filters: ListingFilters,
): {
  title: string;
  description: string;
  heading: string;
} => {
  const cityPart = filters.city ? ` in ${filters.city}` : "";
  const statusPart = filters.status ? ` (${filters.status})` : "";

  const title = `Properties${cityPart}${statusPart} | Advanced Real Estate Search`;
  const heading = filters.city
    ? `Properties in ${filters.city}`
    : "Advanced Real Estate Search";

  const description = filters.city
    ? `Browse verified properties in ${filters.city}. Filter by price, rooms, sea view, installment plans, citizenship eligibility, and ROI.`
    : "Browse verified global real estate listings with advanced filters for price, rooms, status, sea view, installment plans, and citizenship eligibility.";

  return { title, description, heading };
};

export const buildCanonicalListingUrl = (
  queryString: string,
  pathname = "/listing",
): string => {
  const siteUrl = getSiteUrl();
  const params = new URLSearchParams(queryString);

  if (params.get("page") === "1") {
    params.delete("page");
  }

  const normalized = params.toString();
  return normalized
    ? `${siteUrl}${pathname}?${normalized}`
    : `${siteUrl}${pathname}`;
};
