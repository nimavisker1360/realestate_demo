import { type FilterQuery, type SortOrder } from "mongoose";
import type { IProperty } from "../../models/Property";
import type { ListingFilters, ListingSort } from "../../types/property";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../listingParams";

const sortMap: Record<ListingSort, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
  roi_desc: { roiPercent: -1, createdAt: -1 },
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildPropertyQuery(filters: ListingFilters): {
  filter: FilterQuery<IProperty>;
  sort: Record<string, SortOrder>;
  page: number;
  limit: number;
} {
  const filter: FilterQuery<IProperty> = {};

  if (filters.city) {
    filter.city = new RegExp(`^${escapeRegExp(filters.city)}$`, "i");
  }

  if (filters.propertyType?.length) {
    filter.propertyType = { $in: filters.propertyType };
  }

  if (filters.status) {
    filter.status = filters.status;
  }

  if (typeof filters.minPrice === "number" || typeof filters.maxPrice === "number") {
    const priceRange: { $gte?: number; $lte?: number } = {};
    if (typeof filters.minPrice === "number") priceRange.$gte = filters.minPrice;
    if (typeof filters.maxPrice === "number") priceRange.$lte = filters.maxPrice;
    filter.price = priceRange;
  }

  if (typeof filters.minRooms === "number") {
    filter.rooms = { $gte: filters.minRooms };
  }

  if (typeof filters.seaView === "boolean") {
    filter.seaView = filters.seaView;
  }

  if (typeof filters.installmentAvailable === "boolean") {
    filter.installmentAvailable = filters.installmentAvailable;
  }

  if (typeof filters.citizenshipEligible === "boolean") {
    filter.citizenshipEligible = filters.citizenshipEligible;
  }

  if (typeof filters.minRoi === "number") {
    filter.roiPercent = { $gte: filters.minRoi };
  }

  const page = Math.max(DEFAULT_PAGE, filters.page ?? DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, filters.limit ?? DEFAULT_LIMIT),
    MAX_LIMIT,
  );

  const sort = sortMap[filters.sort ?? "newest"];

  return { filter, sort, page, limit };
}
