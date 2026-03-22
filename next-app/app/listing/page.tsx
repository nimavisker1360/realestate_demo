import type { Metadata } from "next";
import ListingClient from "../../components/listing/ListingClient";
import { readListingFilters } from "../../lib/listingParams";
import { getProperties } from "../../lib/server/getProperties";
import {
  buildCanonicalListingUrl,
  buildListingSeoText,
  getSiteUrl,
} from "../../lib/seo";
import type { PropertiesApiResponse } from "../../types/property";

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

const toQueryString = (searchParams: PageSearchParams): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    }
  }

  return params.toString();
};

interface ListingPageProps {
  searchParams: PageSearchParams | Promise<PageSearchParams>;
}

const resolveSearchParams = async (
  searchParams: PageSearchParams | Promise<PageSearchParams>,
): Promise<PageSearchParams> => Promise.resolve(searchParams);

export async function generateMetadata({
  searchParams,
}: ListingPageProps): Promise<Metadata> {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const queryString = toQueryString(resolvedSearchParams);
  const filters = readListingFilters(new URLSearchParams(queryString));
  const seoText = buildListingSeoText(filters);
  const canonical = buildCanonicalListingUrl(queryString);

  return {
    title: seoText.title,
    description: seoText.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: seoText.title,
      description: seoText.description,
      url: canonical,
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ListingPage({ searchParams }: ListingPageProps) {
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const initialQueryString = toQueryString(resolvedSearchParams);
  const filters = readListingFilters(new URLSearchParams(initialQueryString));
  const seoText = buildListingSeoText(filters);

  let initialData: PropertiesApiResponse = {
    items: [],
    total: 0,
    page: 1,
    pages: 1,
  };

  try {
    initialData = await getProperties(filters);
  } catch (error) {
    console.error("SSR listing fetch failed:", error);
  }

  const canonicalUrl = buildCanonicalListingUrl(initialQueryString);
  const siteUrl = getSiteUrl();

  const listingSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seoText.heading,
    description: seoText.description,
    url: canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: initialData.total,
      itemListElement: initialData.items.slice(0, 20).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/property/${item.slug}`,
        name: item.title,
      })),
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingSchema) }}
      />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-2 text-3xl font-semibold text-slate-900">{seoText.heading}</h1>
        <p className="mb-6 text-sm text-slate-600">{seoText.description}</p>
        <ListingClient
          initialQueryString={initialQueryString}
          initialData={initialData}
          searchVariant="default"
        />
      </div>
    </main>
  );
}
