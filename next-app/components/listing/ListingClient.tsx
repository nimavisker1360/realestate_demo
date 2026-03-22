"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_LIMIT,
  buildListingSearchParams,
  readListingFilters,
} from "../../lib/listingParams";
import type { ListingFilters, PropertiesApiResponse } from "../../types/property";
import AdvancedSearchBar from "./AdvancedSearchBar";
import Pagination from "./Pagination";
import PropertyCard from "./PropertyCard";

interface ListingClientProps {
  initialQueryString?: string;
  initialData?: PropertiesApiResponse | null;
  searchVariant?: "default" | "hero" | "international";
}

export default function ListingClient({
  initialQueryString = "",
  initialData = null,
  searchVariant = "default",
}: ListingClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const liveSearchParams = useSearchParams();

  const queryString = liveSearchParams.toString() || initialQueryString;
  const normalizedInitialQuery = useMemo(
    () => new URLSearchParams(initialQueryString).toString(),
    [initialQueryString],
  );
  const filters = useMemo(
    () => readListingFilters(new URLSearchParams(queryString)),
    [queryString],
  );

  const [data, setData] = useState<PropertiesApiResponse | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const usedInitialRef = useRef<boolean>(false);

  const pushFiltersToUrl = useCallback(
    (nextFilters: ListingFilters) => {
      const params = buildListingSearchParams(nextFilters);
      const nextQuery = params.toString();
      const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const handleFiltersChange = useCallback(
    (
      patch: Partial<ListingFilters>,
      options?: {
        resetPage?: boolean;
      },
    ) => {
      const shouldResetPage = options?.resetPage ?? true;
      const nextFilters: ListingFilters = {
        ...filters,
        ...patch,
      };

      if (shouldResetPage) {
        nextFilters.page = 1;
      }

      pushFiltersToUrl(nextFilters);
    },
    [filters, pushFiltersToUrl],
  );

  const handleReset = useCallback(() => {
    pushFiltersToUrl({
      sort: "newest",
      page: 1,
      limit: filters.limit ?? DEFAULT_LIMIT,
    });
  }, [filters.limit, pushFiltersToUrl]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      handleFiltersChange({ page: nextPage }, { resetPage: false });
    },
    [handleFiltersChange],
  );

  useEffect(() => {
    const canUseInitialData =
      Boolean(initialData) &&
      !usedInitialRef.current &&
      queryString === normalizedInitialQuery;

    if (canUseInitialData) {
      usedInitialRef.current = true;
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    const fetchProperties = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = queryString
          ? `/api/properties?${queryString}`
          : "/api/properties";
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not fetch properties.");
        }

        const payload = (await response.json()) as PropertiesApiResponse;
        if (isActive) setData(payload);
      } catch (requestError) {
        if (!isActive || controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to fetch properties.",
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchProperties();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [initialData, normalizedInitialQuery, queryString]);

  return (
    <section>
      <AdvancedSearchBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleReset}
        disabled={isLoading && !data}
        variant={searchVariant}
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {data ? `${data.total.toLocaleString("en-US")} result(s)` : "Loading..."}
        </p>
        {isLoading && data && (
          <p className="text-sm font-medium text-emerald-700">Updating results...</p>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && !isLoading && data && data.items.length === 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No properties found</h2>
          <p className="mt-2 text-sm text-slate-600">
            Try broader filters or reset the search.
          </p>
        </div>
      )}

      {!error && data && data.items.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>

          <Pagination
            page={data.page}
            pages={data.pages}
            onPageChange={handlePageChange}
            disabled={isLoading}
          />
        </>
      )}
    </section>
  );
}
