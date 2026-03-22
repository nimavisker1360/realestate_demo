import { MdSell } from "react-icons/md";
import { FaRegClock } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import HeartBtn from "./HeartBtn";
import PropTypes from "prop-types";
import { useContext } from "react";
import CurrencyContext from "../context/CurrencyContext";
import { resolveProjectPath, resolvePropertyPath } from "../utils/seo";

// Get category display name (bilingual)
const getCategoryLabel = (category, propertyType, lang = "tr") => {
  const labels = {
    tr: {
      "local-project": "Yurt İçi Proje",
      "international-project": "Yurt Dışı Proje",
      residential: "Konut",
      commercial: "Ticari",
      land: "Arsa",
      building: "Bina",
      villa: "Villa",
      "tourist-facility": "Turistik Tesis",
      timeshare: "Devre Mülk",
      default: "Satılık",
    },
    en: {
      "local-project": "Local Project",
      "international-project": "International Project",
      residential: "Residential",
      commercial: "Commercial",
      land: "Land",
      building: "Building",
      villa: "Villa",
      "tourist-facility": "Tourist Facility",
      timeshare: "Timeshare",
      default: "For Sale",
    },
  };
  
  const currentLabels = labels[lang] || labels.tr;
  
  if (propertyType === "local-project" || propertyType === "international-project") {
    return currentLabels[propertyType];
  }
  
  return currentLabels[category] || category || currentLabels.default;
};

// Format date helper function
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const Item = ({ property }) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const isForSale = property.propertyType === "sale" || !property.propertyType;
  const sourceCurrency = property.currency || baseCurrency;
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;
  const convertedPrice = convertAmount(
    property.price,
    sourceCurrency,
    displayCurrency
  );
  const formattedPrice = formatMoney(
    convertedPrice,
    displayCurrency,
    i18n.language === "tr" ? "tr-TR" : "en-US"
  );
  const propertyRoute =
    property?.propertyType === "local-project" ||
    property?.propertyType === "international-project"
      ? resolveProjectPath(property)
      : resolvePropertyPath(property);

  return (
    <div
      className="rounded-2xl p-5 bg-white cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(propertyRoute)}
    >
      <div className="pb-2 relative">
        <img
          src={property.image}
          alt={property.title}
          loading="lazy"
          decoding="async"
          className="rounded-xl"
        />
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="flexCenter gap-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
            <MdSell size={14} />
            {getCategoryLabel(property.category, property.propertyType, i18n.language)}
          </span>
        </div>
        {/* like btn */}
        <div className="absolute top-4 right-6">
          <HeartBtn id={property?.id} />
        </div>
      </div>
      {/* City and Date Row */}
      <div className="flexBetween my-1">
        <h5 className="bold-16 text-secondary">{property.city}</h5>
        {property.updatedAt && (
          <span className="flexCenter gap-x-1 text-xs text-gray-30">
            <FaRegClock size={11} />
            {formatDate(property.updatedAt)}
          </span>
        )}
      </div>
      <h4 className="medium-18 line-clamp-1">{property.title}</h4>
      <p className="pt-2 mb-4 line-clamp-2">{property.description}</p>
      <div className="flexBetween flex-wrap gap-2">
        <div className="bold-18 sm:bold-20">
          {formattedPrice}
          {!isForSale && (
            <span className="text-sm font-normal text-gray-500">/ay</span>
          )}
        </div>
        <Link to={`/`}>
          <button className="btn-secondary rounded-xl !px-4 sm:!px-5 !py-[7px] shadow-sm text-sm sm:text-base">
            View details
          </button>
        </Link>
      </div>
    </div>
  );
};

Item.propTypes = {
  property: PropTypes.shape({
    id: PropTypes.string,
    image: PropTypes.string,
    title: PropTypes.string,
    city: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    currency: PropTypes.string,
    propertyType: PropTypes.string,
    updatedAt: PropTypes.string,
    createdAt: PropTypes.string,
    facilities: PropTypes.shape({
      bedrooms: PropTypes.number,
      bathrooms: PropTypes.number,
      parkings: PropTypes.number,
    }),
  }).isRequired,
};

export default Item;
