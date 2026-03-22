import Link from "next/link";
import type { PropertyItem } from "../../types/property";

interface PropertyCardProps {
  property: PropertyItem;
}

const formatPrice = (price: number, currency: string): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString("en-US")} ${currency}`;
  }
};

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">
          {property.title}
        </h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {property.status}
        </span>
      </div>

      <p className="mb-3 text-sm text-slate-600">
        {property.district}, {property.city}, {property.country}
      </p>

      <p className="mb-4 text-2xl font-bold text-emerald-700">
        {formatPrice(property.price, property.currency)}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-slate-700">
        <span>Type: {property.propertyType}</span>
        <span>Rooms: {property.rooms}</span>
        <span>Area: {property.areaM2} m2</span>
        <span>ROI: {property.roiPercent}%</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {property.seaView && (
          <span className="rounded-full bg-sky-100 px-2 py-1 font-medium text-sky-700">
            Sea View
          </span>
        )}
        {property.installmentAvailable && (
          <span className="rounded-full bg-indigo-100 px-2 py-1 font-medium text-indigo-700">
            Installment
          </span>
        )}
        {property.citizenshipEligible && (
          <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700">
            Citizenship
          </span>
        )}
      </div>

      <Link
        href={`/property/${property.slug}`}
        className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        View Details
      </Link>
    </article>
  );
}
