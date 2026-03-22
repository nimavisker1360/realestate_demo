import dbConnect from "../dbConnect";
import { buildPropertyQuery } from "./buildPropertyQuery";
import Property from "../../models/Property";
import type { ListingFilters, PropertiesApiResponse, PropertyItem } from "../../types/property";

export async function getProperties(filters: ListingFilters): Promise<PropertiesApiResponse> {
  await dbConnect();

  const { filter, sort, page, limit } = buildPropertyQuery(filters);

  const total = await Property.countDocuments(filter);
  const pages = total === 0 ? 1 : Math.ceil(total / limit);
  const safePage = Math.min(page, pages);
  const skip = (safePage - 1) * limit;

  const docs = await Property.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  const items: PropertyItem[] = docs.map((doc) => ({
    ...doc,
    _id: String(doc._id),
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
  })) as PropertyItem[];

  return {
    items,
    total,
    page: safePage,
    pages,
  };
}
