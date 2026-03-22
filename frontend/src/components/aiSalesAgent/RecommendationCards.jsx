import PropTypes from "prop-types";

const MATCH_REASON_LABELS = {
  project_match: "Exact project match",
  district_match: "Near preferred area",
  city_match: "Same city",
  page_context_match: "Related area",
  room_type_match: "Matches room type",
  property_type_match: "Matches property type",
  installment_match: "Installment available",
  citizenship_fit: "Eligible for citizenship",
  investment_fit: "Investment-friendly",
  within_budget: "Within budget",
  below_budget_range: "Below budget range",
  above_budget: "Slightly above budget",
  delivery_match: "Matches delivery preference",
  family_friendly: "Family-friendly concept",
  amenity_match: "Matches your priorities",
  title_deed_ready: "Ready title deed",
  sea_view_match: "Sea view available",
  preferred_side_match: "Preferred side of Istanbul",
};

const formatReason = (reason) =>
  MATCH_REASON_LABELS[reason] || reason.replace(/_/g, " ");

const RecommendationCards = ({ items, labels }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {labels.recommendations}
        </p>
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const reasons = Array.isArray(item.whyItMatches) && item.whyItMatches.length > 0
            ? item.whyItMatches
            : Array.isArray(item.matchReasons) && item.matchReasons.length > 0
            ? item.matchReasons.map(formatReason)
            : [];

          return (
            <div
              key={item.id || item.title}
              className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_22px_60px_-44px_rgba(15,23,42,0.45)]"
            >
              {item.image_url ? (
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title || "property"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                </div>
              ) : null}
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      {[item.city, item.district].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                  {item.price_usd ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      ${Number(item.price_usd).toLocaleString()}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                  {item.rooms ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1">{item.rooms}</span>
                  ) : null}
                  {item.size_m2 ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {item.size_m2} m2
                    </span>
                  ) : null}
                  {item.payment_plan ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {item.payment_plan}
                    </span>
                  ) : null}
                </div>

                {reasons.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {labels.matchReasons}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {reasons.map((reason, reasonIndex) => (
                        <span
                          key={`${reason}-${reasonIndex}`}
                          className="rounded-full bg-[#fff3e8] px-2 py-1 text-[10px] font-semibold text-[#c75d1b]"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {item.recommendationNote ? (
                  <p className="text-xs leading-5 text-slate-600">{item.recommendationNote}</p>
                ) : null}

                {item.detail_url ? (
                  <a
                    href={item.detail_url}
                    className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    {labels.viewDetails}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

RecommendationCards.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  labels: PropTypes.shape({
    recommendations: PropTypes.string.isRequired,
    matchReasons: PropTypes.string.isRequired,
    viewDetails: PropTypes.string.isRequired,
  }).isRequired,
};

export default RecommendationCards;
