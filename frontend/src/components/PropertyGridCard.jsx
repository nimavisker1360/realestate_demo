import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import { MdLocationOn } from "react-icons/md";
import { useContext } from "react";
import CurrencyContext from "../context/CurrencyContext";
import { getOptimizedImageUrl } from "../utils/media";
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

const PropertyGridCard = ({ property }) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const sourceCurrency = property.currency || baseCurrency;
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;
  const convertedPrice = convertAmount(property.price, sourceCurrency, displayCurrency);
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
      className="group bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-xl hover:shadow-gray-300/50 border border-gray-400 hover:border-gray-500"
      onClick={() => navigate(propertyRoute)}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <img
          src={getOptimizedImageUrl(property.image, { width: 520, height: 320 })}
          alt={property.title}
          loading="lazy"
          decoding="async"
          className="w-full h-[140px] object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Price badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-lg">
          {formattedPrice}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-800 mb-1.5 line-clamp-1 group-hover:text-emerald-600 transition-colors duration-300">
          {property.title}
        </h3>

        {/* Address */}
        <div className="flex items-start gap-1 mb-2">
          <MdLocationOn className="text-emerald-500 mt-0.5 flex-shrink-0" size={14} />
          <p className="text-xs text-gray-500 line-clamp-1">
            {property.city}, {property.country}
          </p>
        </div>

        {/* Category Badge */}
        <div className="flex items-center pt-2 border-t border-gray-100">
          <div className="ml-auto">
            <span className="text-[10px] text-emerald-600 font-medium px-1.5 py-0.5 bg-emerald-50 rounded-full">
              {getCategoryLabel(property.category, property.propertyType, i18n.language)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

PropertyGridCard.propTypes = {
  property: PropTypes.shape({
    id: PropTypes.string,
    image: PropTypes.string,
    title: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    country: PropTypes.string,
    price: PropTypes.number,
    currency: PropTypes.string,
    propertyType: PropTypes.string,
    category: PropTypes.string,
    facilities: PropTypes.shape({
      bedrooms: PropTypes.number,
      bathrooms: PropTypes.number,
      parkings: PropTypes.number,
    }),
  }).isRequired,
};

export default PropertyGridCard;
