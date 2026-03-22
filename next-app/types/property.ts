export const PROPERTY_TYPES = [
  "apartment",
  "villa",
  "penthouse",
  "studio",
  "land",
] as const;

export const PROPERTY_USES = [
  "residential",
  "commercial",
  "investment",
] as const;

export const PROPERTY_STATUSES = ["ready", "offplan"] as const;

export const LISTING_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "roi_desc",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyUse = (typeof PROPERTY_USES)[number];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type ListingSort = (typeof LISTING_SORTS)[number];

export interface PropertyItem {
  _id: string;
  title: string;
  slug: string;
  country: string;
  city: string;
  district: string;
  propertyType: PropertyType;
  propertyUse: PropertyUse;
  status: PropertyStatus;
  price: number;
  currency: string;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  seaView: boolean;
  distanceToSeaM: number;
  installmentAvailable: boolean;
  citizenshipEligible: boolean;
  rentalGuarantee: boolean;
  roiPercent: number;
  amenities: string[];
  createdAt: string;
}

export interface ListingFilters {
  city?: string;
  propertyType?: PropertyType[];
  status?: PropertyStatus;
  minPrice?: number;
  maxPrice?: number;
  minRooms?: number;
  seaView?: boolean;
  installmentAvailable?: boolean;
  citizenshipEligible?: boolean;
  minRoi?: number;
  sort?: ListingSort;
  page?: number;
  limit?: number;
}

export interface PropertiesApiResponse {
  items: PropertyItem[];
  total: number;
  page: number;
  pages: number;
}
