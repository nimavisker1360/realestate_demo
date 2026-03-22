import PropTypes from "prop-types";

const ResourceLinks = ({ items, labels }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {labels.resources}
        </p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <a
            key={item.id || item.url || item.title}
            href={item.url}
            className="block overflow-hidden rounded-[20px] border border-slate-200 bg-white px-4 py-3 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.45)] transition hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.category ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {item.category}
                </p>
              ) : null}
              {item.summary ? (
                <p className="text-xs leading-5 text-slate-600">{item.summary}</p>
              ) : null}
            </div>
            <span className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
              {labels.openArticle}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};

ResourceLinks.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  labels: PropTypes.shape({
    resources: PropTypes.string.isRequired,
    openArticle: PropTypes.string.isRequired,
  }).isRequired,
};

export default ResourceLinks;
