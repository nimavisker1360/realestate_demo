import { Schema, model, models, type Model } from "mongoose";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_USES,
  type PropertyStatus,
  type PropertyType,
  type PropertyUse,
} from "../types/property";

export interface IProperty {
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
  createdAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    propertyType: {
      type: String,
      enum: [...PROPERTY_TYPES],
      required: true,
    },
    propertyUse: {
      type: String,
      enum: [...PROPERTY_USES],
      required: true,
    },
    status: {
      type: String,
      enum: [...PROPERTY_STATUSES],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    currency: {
      type: String,
      required: true,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    rooms: { type: Number, required: true, min: 0 },
    bedrooms: { type: Number, required: true, min: 0 },
    bathrooms: { type: Number, required: true, min: 0 },
    areaM2: { type: Number, required: true, min: 0 },
    seaView: { type: Boolean, default: false },
    distanceToSeaM: { type: Number, default: 0, min: 0 },
    installmentAvailable: { type: Boolean, default: false },
    citizenshipEligible: { type: Boolean, default: false },
    rentalGuarantee: { type: Boolean, default: false },
    roiPercent: { type: Number, default: 0, min: 0 },
    amenities: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  },
);

propertySchema.index({ city: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ propertyType: 1 });
propertySchema.index({ roiPercent: -1 });
propertySchema.index({ createdAt: -1 });

const Property =
  (models.Property as Model<IProperty>) ||
  model<IProperty>("Property", propertySchema);

export default Property;
