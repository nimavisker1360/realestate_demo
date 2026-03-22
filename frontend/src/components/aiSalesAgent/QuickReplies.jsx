import { useState } from "react";
import PropTypes from "prop-types";
import { MdExpandMore, MdExpandLess } from "react-icons/md";

const TURKEY_IDS = ["find_property", "investment_projects", "european_side", "asian_side", "citizenship", "installment", "consultation"];
const TURKEY_ORDER = ["find_property", "investment_projects", "european_side", "asian_side", "citizenship", "installment", "consultation"];

const normalizeQuickReplies = (items, turkeyLabel = "Turkey") => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const existingTurkey = items.find((i) => i.id === "turkey");
  if (!existingTurkey) return items;

  const topLevelTurkey = items.filter((i) => TURKEY_IDS.includes(i.id));
  const existingChildren = existingTurkey?.children || [];
  const mergedChildren = [...existingChildren];
  for (const item of topLevelTurkey) {
    if (!mergedChildren.some((c) => c.id === item.id)) {
      mergedChildren.push(item);
    }
  }
  mergedChildren.sort((a, b) => TURKEY_ORDER.indexOf(a.id) - TURKEY_ORDER.indexOf(b.id));
  const hasAllInGroup = mergedChildren.length >= 2 && !topLevelTurkey.length;
  if (hasAllInGroup && existingTurkey) return items;
  const rest = items.filter((i) => i.id !== "turkey" && !TURKEY_IDS.includes(i.id));
  const turkeyGroup = {
    id: "turkey",
    label: existingTurkey.label || turkeyLabel,
    children: mergedChildren,
  };
  const insertAt = Math.max(0, rest.findIndex((i) => i.id === "cyprus"));
  return [...rest.slice(0, insertAt), turkeyGroup, ...rest.slice(insertAt)];
};

const QuickReplies = ({ quickReplies, onSelect, turkeyLabel = "Turkey" }) => {
  const [expandedGroups, setExpandedGroups] = useState({});
  const normalized = normalizeQuickReplies(quickReplies, turkeyLabel);
  if (normalized.length === 0) return null;

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {normalized.map((item) => {
        if (item.children?.length) {
          const isExpanded = expandedGroups[item.id];
          return (
            <div key={item.id || item.label} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleGroup(item.id)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100"
              >
                {item.label}
                {isExpanded ? (
                  <MdExpandLess size={14} className="shrink-0" />
                ) : (
                  <MdExpandMore size={14} className="shrink-0" />
                )}
              </button>
              {isExpanded &&
                item.children.map((child) => (
                  <button
                    key={child.id || child.label}
                    type="button"
                    onClick={() => onSelect(child.message || child.label)}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    {child.label}
                  </button>
                ))}
            </div>
          );
        }
        return (
          <button
            key={item.id || item.label}
            type="button"
            onClick={() => onSelect(item.message || item.label)}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

QuickReplies.propTypes = {
  turkeyLabel: PropTypes.string,
  quickReplies: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string.isRequired,
        message: PropTypes.string,
      }),
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string.isRequired,
        children: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            label: PropTypes.string.isRequired,
            message: PropTypes.string,
          })
        ),
      }),
    ])
  ),
  onSelect: PropTypes.func.isRequired,
};

export default QuickReplies;
