import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MdSell,
  MdEmail,
} from "react-icons/md";
import { FaHeart, FaRegHeart, FaWhatsapp } from "react-icons/fa";
import PropTypes from "prop-types";
import { useContext } from "react";
import UserDetailContext from "../context/UserDetailContext";
import CurrencyContext from "../context/CurrencyContext";
import { useMutation } from "react-query";
import { toFav } from "../utils/api";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "react-toastify";
import { bilingualKey } from "../utils/bilingualToast";
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

const PropertyCard = ({ property, onCardClick }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth0();
  const { userDetails, setUserDetails } = useContext(UserDetailContext);
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const isForSale = property.propertyType === "sale" || !property.propertyType;
  const isLocalProject = property.propertyType === "local-project";
  const isInternationalProject = property.propertyType === "international-project";
  const isProject = isLocalProject || isInternationalProject;
  const getPropertyRoute = (targetProperty) =>
    targetProperty?.propertyType === "local-project" ||
    targetProperty?.propertyType === "international-project"
      ? resolveProjectPath(targetProperty)
      : resolvePropertyPath(targetProperty);

  // Get display price - for projects, use minimum floor plan price if main price is 0
  const getDisplayPrice = () => {
    if (property.price > 0) {
      return property.price;
    }
    // Try to get minimum price from floor plans
    if (property.dairePlanlari && property.dairePlanlari.length > 0) {
      const prices = property.dairePlanlari
        .map(plan => plan.fiyat || 0)
        .filter(p => p > 0);
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
    return 0;
  };
  
  const displayPrice = getDisplayPrice();
  const sourceCurrency = property.currency || baseCurrency;
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;
  const convertedDisplayPrice = convertAmount(
    displayPrice,
    sourceCurrency,
    displayCurrency
  );
  const convertedPrice = convertAmount(
    property.price,
    sourceCurrency,
    displayCurrency
  );
  const formattedDisplayPrice = formatMoney(
    convertedDisplayPrice,
    displayCurrency,
    i18n.language === "tr" ? "tr-TR" : "en-US"
  );
  const formattedPrice = formatMoney(
    convertedPrice,
    displayCurrency,
    i18n.language === "tr" ? "tr-TR" : "en-US"
  );

  // Get description based on current language
  const getDescription = () => {
    if (i18n.language?.startsWith("tr")) {
      return property.description_tr || property.description;
    }
    if (i18n.language?.startsWith("ru")) {
      return (
        property.description_ru ||
        property.description_en ||
        property.description_tr ||
        property.description
      );
    }
    return property.description_en || property.description_tr || property.description;
  };

  const isFavorite = userDetails?.favourites?.includes(property.id);

  const { mutate: toggleFav } = useMutation({
    mutationFn: () => toFav(property.id, user?.email, userDetails?.token),
    onSuccess: () => {
      if (isFavorite) {
        setUserDetails((prev) => ({
          ...prev,
          favourites: prev.favourites.filter((id) => id !== property.id),
        }));
        toast.success(bilingualKey("favorites.removedFromFavorites"));
      } else {
        setUserDetails((prev) => ({
          ...prev,
          favourites: [...prev.favourites, property.id],
        }));
        toast.success(bilingualKey("favorites.addedToFavorites"));
      }
    },
  });

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error(bilingualKey("toast.loginFirst"));
      return;
    }
    toggleFav();
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(property.id, property.propertyType);
    } else {
      navigate(getPropertyRoute(property));
    }
  };

  const whatsappHref = `https://wa.me/905551234567?text=${encodeURIComponent(
    `Hi, I'm interested in the property: ${property.title} - ${formattedPrice}`
  )}`;

  const handleWhatsAppClick = (e) => {
    e.stopPropagation();
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="bg-white border-b border-gray-100 p-4 hover:bg-emerald-100/70 cursor-pointer transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Property Image */}
        <div className="relative w-full h-[200px] sm:w-[280px] sm:h-[180px] flex-shrink-0">
          <img
            src={getOptimizedImageUrl(property.image, { width: 760, height: 480 })}
            alt={property.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover rounded-lg"
          />
          {property.offBadge && (
            <div className="absolute top-3 right-3 z-10 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-sm">
              OFF
            </div>
          )}
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-green-500 text-white">
              <MdSell size={12} />
              {getCategoryLabel(property.category, property.propertyType, i18n.language)}
            </span>
          </div>
        </div>

        {/* Property Details */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {property.title}
              </h3>
              <p className="text-sm text-gray-500">
                {property.address}, {property.city}, {property.country}
              </p>
            </div>
            {/* Favorite Button */}
            <button
              onClick={handleFavoriteClick}
              className="group p-2 rounded-full transition-colors flex-shrink-0"
            >
              {isFavorite ? (
                <FaHeart className="w-5 h-5 text-red-500" />
              ) : (
                <span className="relative inline-flex w-5 h-5">
                  <FaRegHeart className="w-5 h-5 text-gray-400 transition-opacity duration-150 group-hover:opacity-0" />
                  <FaHeart className="w-5 h-5 text-emerald-600 absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                </span>
              )}
            </button>
          </div>

          {/* Price */}
          <div className="mt-2">
            {isProject ? (
              // For projects - show "Starting from" price
              displayPrice > 0 ? (
                <div>
                  <span className="text-sm text-gray-500">{t("propertyCard.startingFrom", "Başlangıç fiyatı")}</span>
                  <span className="text-2xl font-bold text-green-600 ml-2">
                    {formattedDisplayPrice}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-medium text-gray-500">{t("propertyCard.contactForPrice", "Fiyat için iletişime geçin")}</span>
              )
            ) : (
              // For regular properties
              <>
                <span className="text-2xl font-bold text-green-600">
                  {formattedPrice}
                </span>
                {!isForSale && (
                  <span className="text-sm text-gray-500 ml-1">/mo</span>
                )}
              </>
            )}
          </div>

          {/* Facilities */}
          {/* Description */}
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
            {getDescription()}
          </p>

          {/* Contact Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
            <button
              onClick={handleWhatsAppClick}
              data-whatsapp-url={whatsappHref}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#25D366] rounded-lg hover:bg-[#1da851] transition-colors"
            >
              <FaWhatsapp className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(getPropertyRoute(property));
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
            >
              <MdEmail className="w-4 h-4" />
              Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

PropertyCard.propTypes = {
  property: PropTypes.shape({
    id: PropTypes.string,
    image: PropTypes.string,
    title: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    country: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.number,
    currency: PropTypes.string,
    propertyType: PropTypes.string,
    offBadge: PropTypes.bool,
    facilities: PropTypes.shape({
      bedrooms: PropTypes.number,
      bathrooms: PropTypes.number,
      parkings: PropTypes.number,
    }),
    dairePlanlari: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        tip: PropTypes.string,
        varyant: PropTypes.string,
        metrekare: PropTypes.number,
        fiyat: PropTypes.number,
      })
    ),
  }).isRequired,
  onCardClick: PropTypes.func,
};

export default PropertyCard;
