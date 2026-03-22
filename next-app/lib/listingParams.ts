import {
  LISTING_SORTS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type ListingFilters,
  type ListingSort,
  type PropertyStatus,
  type PropertyType,
} from "../types/property";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 50;

type SearchParamsLike = Pick<URLSearchParams, "get" | "getAll">;

const propertyTypeSet = new Set<PropertyType>(PROPERTY_TYPES);
const statusSet = new Set<PropertyStatus>(PROPERTY_STATUSES);
const sortSet = new Set<ListingSort>(LISTING_SORTS);

const parsePositiveNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const parsePositiveInteger = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
};

const parseBoolean = (value: string | null): boolean | undefined => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const normalizeMultiValues = (values: string[]): string[] =>
  values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

export function readListingFilters(searchParams: SearchParamsLike): ListingFilters {
  const rawTypes = normalizeMultiValues(searchParams.getAll("propertyType"));
  const propertyType = rawTypes.filter(
    (value): value is PropertyType => propertyTypeSet.has(value as PropertyType),
  );

  const rawStatus = searchParams.get("status");
  const status = statusSet.has(rawStatus as PropertyStatus)
    ? (rawStatus as PropertyStatus)
    : undefined;

  const rawSort = searchParams.get("sort");
  const sort = sortSet.has(rawSort as ListingSort)
    ? (rawSort as ListingSort)
    : "newest";

  const page = parsePositiveInteger(searchParams.get("page")) ?? DEFAULT_PAGE;
  const limit = parsePositiveInteger(searchParams.get("limit")) ?? DEFAULT_LIMIT;

  const city = searchParams.get("city")?.trim() || undefined;

  return {
    city,
    propertyType: propertyType.length > 0 ? propertyType : undefined,
    status,
    minPrice: parsePositiveNumber(searchParams.get("minPrice")),
    maxPrice: parsePositiveNumber(searchParams.get("maxPrice")),
    minRooms: parsePositiveInteger(searchParams.get("minRooms")),
    seaView: parseBoolean(searchParams.get("seaView")),
    installmentAvailable: parseBoolean(searchParams.get("installmentAvailable")),
    citizenshipEligible: parseBoolean(searchParams.get("citizenshipEligible")),
    minRoi: parsePositiveNumber(searchParams.get("minRoi")),
    sort,
    page,
    limit,
  };
}

export function buildListingSearchParams(filters: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.city?.trim()) params.set("city", filters.city.trim());
  if (filters.propertyType?.length) {
    for (const type of filters.propertyType) params.append("propertyType", type);
  }
  if (filters.status) params.set("status", filters.status);

  if (typeof filters.minPrice === "number") params.set("minPrice", String(filters.minPrice));
  if (typeof filters.maxPrice === "number") params.set("maxPrice", String(filters.maxPrice));
  if (typeof filters.minRooms === "number") params.set("minRooms", String(filters.minRooms));
  if (typeof filters.seaView === "boolean") params.set("seaView", String(filters.seaView));
  if (typeof filters.installmentAvailable === "boolean") {
    params.set("installmentAvailable", String(filters.installmentAvailable));
  }
  if (typeof filters.citizenshipEligible === "boolean") {
    params.set("citizenshipEligible", String(filters.citizenshipEligible));
  }
  if (typeof filters.minRoi === "number") params.set("minRoi", String(filters.minRoi));

  const selectedSort = filters.sort ?? "newest";
  if (selectedSort !== "newest") {
    params.set("sort", selectedSort);
  }

  if ((filters.page ?? DEFAULT_PAGE) > 1) params.set("page", String(filters.page));
  if ((filters.limit ?? DEFAULT_LIMIT) !== DEFAULT_LIMIT) {
    params.set("limit", String(Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)));
  }

  return params;
}
