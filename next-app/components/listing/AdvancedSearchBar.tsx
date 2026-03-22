import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type ListingFilters,
  type PropertyStatus,
  type PropertyType,
} from "../../types/property";

type SearchVariant = "default" | "hero" | "international";

interface AdvancedSearchBarProps {
  filters: ListingFilters;
  onFiltersChange: (
    patch: Partial<ListingFilters>,
    options?: { resetPage?: boolean },
  ) => void;
  onReset: () => void;
  disabled?: boolean;
  variant?: SearchVariant;
}

const WRAPPER_STYLES: Record<SearchVariant, string> = {
  default: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
  hero: "rounded-2xl bg-white/95 p-4 shadow-2xl backdrop-blur",
  international: "rounded-2xl border-2 border-white/60 bg-white p-4 shadow-lg",
};

const INPUT_STYLE =
  "h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  ready: "Ready",
  offplan: "Off-plan",
};

const toNumber = (value: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export default function AdvancedSearchBar({
  filters,
  onFiltersChange,
  onReset,
  disabled = false,
  variant = "default",
}: AdvancedSearchBarProps) {
  const selectedTypes = filters.propertyType ?? [];

  const togglePropertyType = (type: PropertyType) => {
    const nextTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((value) => value !== type)
      : [...selectedTypes, type];

    onFiltersChange({
      propertyType: nextTypes.length > 0 ? nextTypes : undefined,
    });
  };

  const toggleBooleanFilter = (
    key: "seaView" | "installmentAvailable" | "citizenshipEligible",
    checked: boolean,
  ) => {
    onFiltersChange({ [key]: checked ? true : undefined } as Partial<ListingFilters>);
  };

  const toggleStatusFilter = (status: PropertyStatus) => {
    onFiltersChange({
      status: filters.status === status ? undefined : status,
    });
  };

  return (
    <section className={WRAPPER_STYLES[variant]}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <input
          type="text"
          placeholder="City (e.g. Istanbul)"
          className={`${INPUT_STYLE} lg:col-span-2`}
          value={filters.city ?? ""}
          onChange={(event) =>
            onFiltersChange({ city: event.target.value || undefined })
          }
          disabled={disabled}
        />

        <details className="relative lg:col-span-2">
          <summary className={`${INPUT_STYLE} flex cursor-pointer list-none items-center justify-between`}>
            <span className="truncate">
              {selectedTypes.length > 0
                ? `${selectedTypes.length} type(s)`
                : "Property Type"}
            </span>
            <span className="ml-2 text-xs text-slate-500">Select</span>
          </summary>
          <div className="absolute z-10 mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <div className="space-y-2">
              {PROPERTY_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => togglePropertyType(type)}
                    disabled={disabled}
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </details>

        <select
          className={`${INPUT_STYLE} lg:col-span-1`}
          value={filters.status ?? ""}
          onChange={(event) =>
            onFiltersChange({
              status: event.target.value
                ? (event.target.value as ListingFilters["status"])
                : undefined,
            })
          }
          disabled={disabled}
        >
          <option value="">Any Status</option>
          {PROPERTY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={0}
          placeholder="Min Price"
          className={`${INPUT_STYLE} lg:col-span-1`}
          value={filters.minPrice ?? ""}
          onChange={(event) =>
            onFiltersChange({ minPrice: toNumber(event.target.value) })
          }
          disabled={disabled}
        />

        <input
          type="number"
          min={0}
          placeholder="Max Price"
          className={`${INPUT_STYLE} lg:col-span-1`}
          value={filters.maxPrice ?? ""}
          onChange={(event) =>
            onFiltersChange({ maxPrice: toNumber(event.target.value) })
          }
          disabled={disabled}
        />

        <select
          className={`${INPUT_STYLE} lg:col-span-1`}
          value={filters.minRooms ?? ""}
          onChange={(event) =>
            onFiltersChange({
              minRooms: event.target.value
                ? Number.parseInt(event.target.value, 10)
                : undefined,
            })
          }
          disabled={disabled}
        >
          <option value="">Any Rooms</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5+</option>
        </select>

        <input
          type="number"
          min={0}
          step={0.1}
          placeholder="Min ROI %"
          className={`${INPUT_STYLE} lg:col-span-1`}
          value={filters.minRoi ?? ""}
          onChange={(event) =>
            onFiltersChange({ minRoi: toNumber(event.target.value) })
          }
          disabled={disabled}
        />

        <select
          className={`${INPUT_STYLE} lg:col-span-2`}
          value={filters.sort ?? "newest"}
          onChange={(event) =>
            onFiltersChange(
              {
                sort: event.target.value as ListingFilters["sort"],
              },
              { resetPage: false },
            )
          }
          disabled={disabled}
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="roi_desc">ROI: High to Low</option>
        </select>

        <button
          type="button"
          onClick={onReset}
          className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
          disabled={disabled}
        >
          Reset Filters
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.seaView === true}
            onChange={(event) => toggleBooleanFilter("seaView", event.target.checked)}
            disabled={disabled}
          />
          Sea View
        </label>

        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.installmentAvailable === true}
            onChange={(event) =>
              toggleBooleanFilter("installmentAvailable", event.target.checked)
            }
            disabled={disabled}
          />
          Installment Available
        </label>

        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span>Ready / Off-plan</span>
          <button
            type="button"
            onClick={() => toggleStatusFilter("ready")}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
              filters.status === "ready"
                ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
            disabled={disabled}
          >
            Ready
          </button>
          <button
            type="button"
            onClick={() => toggleStatusFilter("offplan")}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
              filters.status === "offplan"
                ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
            disabled={disabled}
          >
            Off-plan
          </button>
        </div>

        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filters.citizenshipEligible === true}
            onChange={(event) =>
              toggleBooleanFilter("citizenshipEligible", event.target.checked)
            }
            disabled={disabled}
          />
          Citizenship Eligible
        </label>
      </div>
    </section>
  );
}
