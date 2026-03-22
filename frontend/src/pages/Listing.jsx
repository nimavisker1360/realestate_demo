import { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useProperties from "../hooks/useProperties";
import useConsultants from "../hooks/useConsultants";
import { PuffLoader } from "react-spinners";
import PropertyCard from "../components/PropertyCard";
import PropertiesMap from "../components/PropertiesMap";
import { 
  MdList, 
  MdPerson,
  MdSearch, 
  MdClose,
  MdFilterList,
  MdKeyboardArrowDown,
  MdLocationOn
} from "react-icons/md";
import { FaLandmark, FaHome, FaBriefcase, FaHotel, FaUmbrellaBeach, FaCity } from "react-icons/fa";
import { HiOutlineOfficeBuilding } from "react-icons/hi";
import { BsBuildingsFill } from "react-icons/bs";
import CurrencyContext from "../context/CurrencyContext";
import { resolveProjectPath, resolvePropertyPath } from "../utils/seo";

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const toArray = (value) => (Array.isArray(value) ? value : []);

const SEA_VIEW_KEYWORDS = [
  "sea view",
  "deniz manzara",
  "denize sifir",
  "denize yakin",
  "ocean view",
  "waterfront",
  "marina view",
  "bogaz manzara",
];

const INSTALLMENT_KEYWORDS = [
  "installment",
  "payment plan",
  "taksit",
  "taksitli",
  "down payment",
];

const CITIZENSHIP_KEYWORDS = [
  "citizenship eligible",
  "turkish citizenship",
  "citizenship",
  "vatandaslik",
  "vatandasliga uygun",
  "passport",
];

const READY_KEYWORDS = [
  "ready",
  "move in",
  "completed",
  "tamamlandi",
  "teslime hazir",
  "oturuma hazir",
  "anahtar teslim",
  "bos",
  "kiraci",
  "mulk sahibi",
  "mulk-sahibi",
];

const OFFPLAN_KEYWORDS = [
  "off plan",
  "off-plan",
  "offplan",
  "under construction",
  "construction",
  "insaat halinde",
  "devam ediyor",
  "devam-ediyor",
  "pre sale",
];

const includesAnyKeyword = (text, keywords) =>
  keywords.some((keyword) => text.includes(keyword));

const normalizeListingStatus = (value) => {
  const normalized = normalizeText(value);
  if (["ready", "hazir", "tamamlandi", "completed"].includes(normalized)) {
    return "ready";
  }
  if (
    [
      "offplan",
      "off-plan",
      "off plan",
      "devam-ediyor",
      "devam ediyor",
      "under construction",
      "under-construction",
      "insaat halinde",
      "insaat-halinde",
    ].includes(normalized)
  ) {
    return "offplan";
  }
  return "";
};

const normalizeProjectTypeFilter = (value) => {
  const normalized = normalizeText(value);
  if (
    normalized === "local" ||
    normalized === "localproject" ||
    normalized === "local-project"
  ) {
    return "local-project";
  }
  if (
    normalized === "international" ||
    normalized === "internationalproject" ||
    normalized === "international-project"
  ) {
    return "international-project";
  }
  return "";
};

const getSpecialOffers = (property) => {
  const offers = toArray(property?.projeHakkinda?.specialOffers);
  const legacyOffer = property?.projeHakkinda?.specialOffer;
  if (legacyOffer && typeof legacyOffer === "object") {
    offers.push(legacyOffer);
  }
  return offers;
};

const collectPropertySearchText = (property) => {
  const directTexts = [
    property?.title,
    property?.description,
    property?.description_tr,
    property?.description_en,
    property?.description_ru,
    property?.address,
    property?.city,
    property?.country,
    property?.usageStatus,
    property?.projectStatus,
    property?.listingStatus,
    property?.deedStatus,
    property?.kampanya,
  ];

  const staticFeatureValues = [
    ...toArray(property?.interiorFeatures),
    ...toArray(property?.exteriorFeatures),
    ...toArray(property?.muhitFeatures),
    ...toArray(property?.manzaraFeatures),
    ...toArray(property?.binaOzellikleri),
    ...toArray(property?.disOzellikler),
    ...toArray(property?.engelliYasliUygun),
    ...toArray(property?.eglenceAlisveris),
    ...toArray(property?.guvenlik),
    ...toArray(property?.manzara),
    ...toArray(property?.muhit),
  ];

  const ozelliklerValues =
    property?.ozellikler && typeof property.ozellikler === "object"
      ? Object.values(property.ozellikler).flatMap((value) => toArray(value))
      : [];

  const specialOfferValues = getSpecialOffers(property).flatMap((offer) => [
    offer?.title,
    offer?.roomType,
    offer?.locationLabel,
    offer?.description,
    offer?.paymentPlan,
  ]);

  const allValues = [
    ...directTexts,
    ...staticFeatureValues,
    ...ozelliklerValues,
    ...specialOfferValues,
  ];

  return normalizeText(allValues.filter(Boolean).join(" "));
};

const isInstallmentProperty = (property, searchableText) => {
  const hasInstallmentInOffers = getSpecialOffers(property).some(
    (offer) => Number(offer?.installmentMonths || 0) > 0
  );
  if (hasInstallmentInOffers) return true;
  return includesAnyKeyword(searchableText, INSTALLMENT_KEYWORDS);
};

const getReadyOffPlanState = (property, searchableText) => {
  const explicitStatus = normalizeListingStatus(property?.listingStatus);
  if (explicitStatus) return explicitStatus;

  const statusText = normalizeText(
    `${property?.usageStatus || ""} ${property?.projectStatus || ""}`
  );
  if (includesAnyKeyword(statusText, OFFPLAN_KEYWORDS)) return "offplan";
  if (includesAnyKeyword(statusText, READY_KEYWORDS)) return "ready";
  if (includesAnyKeyword(searchableText, OFFPLAN_KEYWORDS)) return "offplan";
  if (includesAnyKeyword(searchableText, READY_KEYWORDS)) return "ready";
  return null;
};

const matchesQuickAccessFilters = (property, quickFilters) => {
  const searchableText = collectPropertySearchText(property);

  if (quickFilters.seaView && !includesAnyKeyword(searchableText, SEA_VIEW_KEYWORDS)) {
    return false;
  }

  if (
    quickFilters.installmentAvailable &&
    !isInstallmentProperty(property, searchableText)
  ) {
    return false;
  }

  if (quickFilters.citizenshipEligible && !property.gyo) {
    return false;
  }

  if (quickFilters.status) {
    const resolvedStatus = getReadyOffPlanState(property, searchableText);
    if (resolvedStatus !== quickFilters.status) {
      return false;
    }
  }

  return true;
};

const Listing = () => {
  const { t, i18n } = useTranslation();
  const { data: rawData = [], isError, isLoading } = useProperties();
  const { data: consultants = [], isLoading: consultantsLoading } = useConsultants();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;

  // Dropdown states
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showRoomsDropdown, setShowRoomsDropdown] = useState(false);
  const [showAllFiltersModal, setShowAllFiltersModal] = useState(false);

  // Refs for closing dropdowns on outside click
  const typeRef = useRef(null);
  const categoryRef = useRef(null);
  const priceRef = useRef(null);
  const roomsRef = useRef(null);

  // Room count options
  const roomOptions = [
    { value: "0", label: t('listing.studio') },
    { value: "1", label: t('listing.room1') },
    { value: "2", label: t('listing.room2') },
    { value: "3", label: t('listing.room3') },
    { value: "4", label: t('listing.room4') },
    { value: "5+", label: t('listing.room5plus') },
  ];

  // Property categories with translations (projects have their own dedicated pages)
  const propertyCategories = [
    { value: "residential", label: t('categories.residential'), icon: FaHome },
    { value: "villa", label: t('categories.villa'), icon: FaHome },
    { value: "commercial", label: t('categories.commercial'), icon: FaBriefcase },
    { value: "land", label: t('categories.land'), icon: FaLandmark },
    { value: "residentialProjects", label: t('categories.residentialProjects'), icon: FaCity },
    { value: "building", label: t('categories.building'), icon: BsBuildingsFill },
    { value: "timeshare", label: t('categories.timeshare'), icon: FaHotel },
    { value: "touristFacility", label: t('categories.touristFacility'), icon: FaUmbrellaBeach },
  ];

  // Get filters from URL
  const typeFilter = searchParams.get("type");
  const projectTypeFilter = searchParams.get("projectType");
  const categoryFilter = searchParams.get("category");
  const consultantFilter = searchParams.get("consultantId");
  const searchQuery = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const roomsFilter = searchParams.get("rooms") || "";
  const seaViewFilter = searchParams.get("seaView") === "true";
  const installmentFilter = searchParams.get("installmentAvailable") === "true";
  const citizenshipFilter = searchParams.get("citizenshipEligible") === "true";
  const rawStatusFilter = normalizeText(searchParams.get("status"));
  const statusFilter =
    rawStatusFilter === "ready" || rawStatusFilter === "offplan"
      ? rawStatusFilter
      : "";
  const quickFilters = {
    seaView: seaViewFilter,
    installmentAvailable: installmentFilter,
    citizenshipEligible: citizenshipFilter,
    status: statusFilter,
  };
  const includeProjectsByQuickFilters =
    quickFilters.seaView ||
    quickFilters.installmentAvailable ||
    quickFilters.citizenshipEligible ||
    Boolean(quickFilters.status);

  // Local state for price inputs
  const [priceRange, setPriceRange] = useState({ min: minPrice, max: maxPrice });

  // Map projectType URL aliases to canonical property types
  const normalizedProjectTypeFilter = normalizeProjectTypeFilter(projectTypeFilter);
  const effectiveTypeFilter = normalizedProjectTypeFilter || typeFilter;

  const [filter, setFilter] = useState(searchQuery);

  // Update filter when URL search param changes
  useEffect(() => {
    setFilter(searchQuery);
  }, [searchQuery]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeRef.current && !typeRef.current.contains(event.target)) {
        setShowTypeDropdown(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
      if (priceRef.current && !priceRef.current.contains(event.target)) {
        setShowPriceDropdown(false);
      }
      if (roomsRef.current && !roomsRef.current.contains(event.target)) {
        setShowRoomsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update URL when filter changes
  const handleFilterChange = (value) => {
    setFilter(value);
    if (value.trim()) {
      searchParams.set("search", value);
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams);
  };

  const handleConsultantFilter = (consultantId) => {
    if (consultantId) {
      searchParams.set("consultantId", consultantId);
    } else {
      searchParams.delete("consultantId");
    }
    setSearchParams(searchParams);
    setShowTypeDropdown(false);
  };

  const handleCategoryFilter = (category) => {
    if (category === null) {
      searchParams.delete("category");
    } else {
      searchParams.set("category", category);
    }
    setSearchParams(searchParams);
    setShowCategoryDropdown(false);
  };

  const handlePriceFilter = () => {
    if (priceRange.min) {
      searchParams.set("minPrice", priceRange.min);
    } else {
      searchParams.delete("minPrice");
    }
    if (priceRange.max) {
      searchParams.set("maxPrice", priceRange.max);
    } else {
      searchParams.delete("maxPrice");
    }
    setSearchParams(searchParams);
    setShowPriceDropdown(false);
  };

  const handleRoomsFilter = (rooms) => {
    if (rooms) {
      searchParams.set("rooms", rooms);
    } else {
      searchParams.delete("rooms");
    }
    setSearchParams(searchParams);
    setShowRoomsDropdown(false);
  };

  const handleQuickFlagFilter = (key) => {
    const nextParams = new URLSearchParams(searchParams);
    const isEnabled = nextParams.get(key) === "true";

    if (isEnabled) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, "true");
    }

    setSearchParams(nextParams);
  };

  const handleQuickStatusFilter = (status) => {
    const nextParams = new URLSearchParams(searchParams);
    const currentStatus = normalizeText(nextParams.get("status"));

    if (currentStatus === status) {
      nextParams.delete("status");
    } else {
      nextParams.set("status", status);
    }

    setSearchParams(nextParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setFilter("");
    setPriceRange({ min: "", max: "" });
  };

  const handleResetFilters = () => {
    clearAllFilters();
    setShowAllFiltersModal(false);
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (effectiveTypeFilter) count++;
    if (categoryFilter) count++;
    if (minPrice || maxPrice) count++;
    if (roomsFilter) count++;
    if (consultantFilter) count++;
    if (filter) count++;
    if (quickFilters.seaView) count++;
    if (quickFilters.installmentAvailable) count++;
    if (quickFilters.citizenshipEligible) count++;
    if (quickFilters.status) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const getPropertyConsultantId = (property) =>
    property?.consultantId ||
    property?.consultant?.id ||
    property?.consultant?._id ||
    null;

  const normalizeId = (value) =>
    value === null || value === undefined ? "" : String(value);

  // Filter properties
  const baseFilteredData = rawData
    .filter((property) => {
      if (effectiveTypeFilter) {
        return property.propertyType === effectiveTypeFilter;
      }
      if (includeProjectsByQuickFilters) {
        return true;
      }
      // When no type filter is selected, exclude projects (they have their own pages)
      return (
        property.propertyType !== "local-project" &&
        property.propertyType !== "international-project"
      );
    })
    .filter((property) => {
      if (categoryFilter) {
        return property.category === categoryFilter;
      }
      return true;
    })
    .filter((property) => {
      if (!minPrice && !maxPrice) return true;
      const priceValue = convertAmount(
        property.price || 0,
        property.currency || baseCurrency,
        displayCurrency
      );
      if (minPrice && priceValue < parseInt(minPrice)) return false;
      if (maxPrice && priceValue > parseInt(maxPrice)) return false;
      return true;
    })
    .filter((property) => {
      if (roomsFilter) {
        // Check rooms string field (Turkish format like "2+1", "3+1")
        if (property.rooms) {
          const roomMatch = property.rooms.match(/^(\d+)/);
          const roomCount = roomMatch ? parseInt(roomMatch[1]) : 0;
          
          if (roomsFilter === "0") {
            // Studio - check if rooms contains "Stüdyo" or bedrooms is 0
            return property.rooms.toLowerCase().includes("stüdyo") || 
                   property.rooms.toLowerCase().includes("studio") ||
                   roomCount === 0;
          }
          if (roomsFilter === "5+") {
            return roomCount >= 5;
          }
          return roomCount === parseInt(roomsFilter);
        }
        
        // Fallback to facilities.bedrooms for older data
        const bedrooms = property.facilities?.bedrooms || 0;
        if (roomsFilter === "0") {
          return bedrooms === 0;
        }
        if (roomsFilter === "5+") {
          return bedrooms >= 5;
        }
        return bedrooms === parseInt(roomsFilter);
      }
      return true;
    })
    .filter((property) => matchesQuickAccessFilters(property, quickFilters))
    .filter(
      (property) =>
        property.title.toLowerCase().includes(filter.toLowerCase()) ||
        property.city.toLowerCase().includes(filter.toLowerCase()) ||
        property.country.toLowerCase().includes(filter.toLowerCase()) ||
        property.address.toLowerCase().includes(filter.toLowerCase())
    );

  const consultantPropertyCounts = useMemo(() => {
    const counts = {};
    baseFilteredData.forEach((property) => {
      const consultantId = normalizeId(getPropertyConsultantId(property));
      if (!consultantId) return;
      counts[consultantId] = (counts[consultantId] || 0) + 1;
    });
    return counts;
  }, [baseFilteredData]);

  const consultantOptions = useMemo(() => {
    const list = Array.isArray(consultants) ? consultants : [];
    const mapped = list
      .map((consultant) => {
        const id = normalizeId(consultant?.id || consultant?._id);
        if (!id) return null;
        return {
          value: id,
          label: consultant?.name || consultant?.fullName || t('listing.consultantUnknown'),
          image: consultant?.image || consultant?.photo || consultant?.avatar || null,
          icon: MdPerson,
          count: consultantPropertyCounts[id] || 0,
        };
      })
      .filter(Boolean);

    return [{ value: null, label: t('listing.all'), icon: MdList }, ...mapped];
  }, [consultants, consultantPropertyCounts, t]);

  if (isError) {
    return (
      <div className="h-screen flexCenter">
        <span className="text-red-500">{t('listing.errorFetching')}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flexCenter">
        <PuffLoader
          height="80"
          width="80"
          radius={1}
          color="#16a34a"
          aria-label="puff-loading"
        />
      </div>
    );
  }

  const filteredData = baseFilteredData.filter((property) => {
    if (!consultantFilter) return true;
    const propertyConsultantId = normalizeId(getPropertyConsultantId(property));
    return propertyConsultantId === normalizeId(consultantFilter);
  });

  const handlePropertyClick = (id, propertyType) => {
    const matchedProperty = rawData.find(
      (property) => property.id === id || property.slug === id || property.seoSlug === id
    );
    const resolvedType =
      propertyType ||
      matchedProperty?.propertyType ||
      "";
    const targetRoute =
      resolvedType === "local-project" || resolvedType === "international-project"
        ? resolveProjectPath(matchedProperty || { id })
        : resolvePropertyPath(matchedProperty || { id });
    navigate(targetRoute);
  };

  // Get current consultant label
  const getCurrentTypeLabel = () => {
    if (!consultantFilter) return t('listing.all');
    const current = consultantOptions.find(
      (option) => normalizeId(option.value) === normalizeId(consultantFilter)
    );
    return current ? current.label : t('listing.consultantUnknown');
  };

  // Get current category label
  const getCurrentCategoryLabel = () => {
    if (!categoryFilter) return t('listing.propertyUses');
    const current = propertyCategories.find(c => c.value === categoryFilter);
    return current ? current.label : t('listing.propertyUses');
  };

  // Get price label
  const getPriceLabel = () => {
    if (minPrice || maxPrice) {
      if (minPrice && maxPrice)
        return `${formatMoney(
          Number(minPrice),
          displayCurrency,
          i18n.language === "tr" ? "tr-TR" : "en-US"
        )} - ${formatMoney(
          Number(maxPrice),
          displayCurrency,
          i18n.language === "tr" ? "tr-TR" : "en-US"
        )}`;
      if (minPrice)
        return `${formatMoney(
          Number(minPrice),
          displayCurrency,
          i18n.language === "tr" ? "tr-TR" : "en-US"
        )}+`;
      if (maxPrice)
        return `${t('listing.maxPrice')}: ${formatMoney(
          Number(maxPrice),
          displayCurrency,
          i18n.language === "tr" ? "tr-TR" : "en-US"
        )}`;
    }
    return t('listing.price');
  };

  // Get rooms label
  const getRoomsLabel = () => {
    if (roomsFilter) {
      const option = roomOptions.find(o => o.value === roomsFilter);
      return option ? option.label : t('listing.rooms');
    }
    return t('listing.rooms');
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Top Filter Bar */}
      <div className="bg-white border-b shadow-sm z-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col gap-2 py-3 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-2 lg:max-w-[60%] lg:py-4">
            {/* Search Row */}
            <div className="flex items-center gap-2 w-full order-1 lg:order-1 lg:flex-none lg:w-[420px]">
              <div className="flex items-center gap-2 w-full h-11 bg-white border border-gray-300 rounded-xl px-3 py-2.5 lg:px-3 lg:py-2.5 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
                <MdLocationOn className="text-gray-400 text-lg flex-shrink-0" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  placeholder={t('listing.locationPlaceholder')}
                  className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                />
                {filter && (
                  <button 
                    onClick={() => handleFilterChange("")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <MdClose size={16} />
                  </button>
                )}
                <MdSearch className="text-gray-400 text-lg flex-shrink-0 cursor-pointer hover:text-gray-600" />
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-2 gap-2 w-full order-2 lg:order-2 lg:flex lg:flex-nowrap lg:items-center lg:gap-2 lg:flex-none">
              {/* Consultant Filter Dropdown */}
              <div ref={typeRef} className="relative">
                <button
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className={`flex w-full items-center justify-between gap-2 h-11 px-4 py-2.5 lg:px-4 lg:py-2.5 rounded-xl text-sm font-medium transition-all border lg:text-xs ${
                    consultantFilter
                      ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <span className="min-w-0 truncate">{getCurrentTypeLabel()}</span>
                  <MdKeyboardArrowDown className={`transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                <div
                  className={`absolute top-full left-0 mt-2 rounded-xl bg-white z-50 min-w-[220px] origin-top transition-all duration-300 ease-out ${
                    showTypeDropdown
                      ? "max-h-[320px] translate-y-0 opacity-100 border border-gray-200 shadow-xl py-1 pointer-events-auto"
                      : "max-h-0 -translate-y-2 opacity-0 border border-transparent shadow-none py-0 pointer-events-none"
                  }`}
                >
                  <div className="max-h-[320px] overflow-y-auto">
                    {consultantOptions.map((option) => {
                      const IconComponent = option.icon;
                      const isActive = consultantFilter
                        ? normalizeId(consultantFilter) === normalizeId(option.value)
                        : option.value === null;
                      return (
                        <button
                          key={option.value || 'all'}
                          onClick={() => handleConsultantFilter(option.value)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
                            isActive
                              ? "bg-teal-50 text-teal-700 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="h-7 w-7 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center overflow-hidden">
                            {option.image ? (
                              <img
                                src={option.image}
                                alt={option.label}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <IconComponent className="text-base" />
                            )}
                          </div>
                          <span className="flex-1 text-left">{option.label}</span>
                          {option.value && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {option.count ?? 0}
                            </span>
                          )}
                          {isActive && (
                            <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            {/* Category Filter Dropdown */}
            <div ref={categoryRef} className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className={`flex w-full items-center justify-between gap-2 h-11 px-4 py-2.5 lg:px-4 lg:py-2.5 rounded-xl text-sm font-medium transition-all border lg:text-xs ${
                  categoryFilter
                    ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <span className="min-w-0 truncate">{getCurrentCategoryLabel()}</span>
                <MdKeyboardArrowDown className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[200px] py-1 animate-fadeIn">
                  <button
                    onClick={() => handleCategoryFilter(null)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
                      !categoryFilter
                        ? "bg-teal-50 text-teal-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <MdList className={`text-lg flex-shrink-0 ${!categoryFilter ? 'text-teal-600' : 'text-gray-400'}`} />
                    <span className="flex-1 text-left">{t('listing.allCategories')}</span>
                    {!categoryFilter && (
                      <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
                    )}
                  </button>
                  {propertyCategories.map((cat) => {
                    const IconComponent = cat.icon;
                    const isActive = categoryFilter === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => handleCategoryFilter(cat.value)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
                          isActive
                            ? "bg-teal-50 text-teal-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <IconComponent className={`text-lg flex-shrink-0 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                        <span className="flex-1 text-left">{cat.label}</span>
                        {isActive && (
                          <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price Filter Dropdown */}
            <div ref={priceRef} className="relative">
              <button
                onClick={() => setShowPriceDropdown(!showPriceDropdown)}
                className={`flex w-full items-center justify-between gap-2 h-11 px-4 py-2.5 lg:px-4 lg:py-2.5 rounded-xl text-sm font-medium transition-all border lg:text-xs ${
                  minPrice || maxPrice
                    ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <span className="min-w-0 truncate">{getPriceLabel()}</span>
                <MdKeyboardArrowDown className={`transition-transform ${showPriceDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showPriceDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-[280px] p-4 animate-fadeIn">
                  <h4 className="font-medium text-gray-800 mb-3">{t('listing.priceRange')}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        placeholder={t('listing.minPrice')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <span className="text-gray-400">-</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        placeholder={t('listing.maxPrice')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handlePriceFilter}
                    className="w-full py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    {t('listing.applyFilters')}
                  </button>
                </div>
              )}
            </div>

            {/* Rooms Filter Dropdown */}
            <div ref={roomsRef} className="relative">
              <button
                onClick={() => setShowRoomsDropdown(!showRoomsDropdown)}
                className={`flex w-full items-center justify-between gap-2 h-11 px-4 py-2.5 lg:px-4 lg:py-2.5 rounded-xl text-sm font-medium transition-all border lg:text-xs ${
                  roomsFilter
                    ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                <span className="min-w-0 truncate">{getRoomsLabel()}</span>
                <MdKeyboardArrowDown className={`transition-transform ${showRoomsDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showRoomsDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[160px] py-1 animate-fadeIn">
                  <button
                    onClick={() => handleRoomsFilter(null)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      !roomsFilter
                        ? "bg-teal-50 text-teal-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{t('listing.all')}</span>
                    {!roomsFilter && (
                      <span className="ml-auto w-2 h-2 bg-teal-500 rounded-full" />
                    )}
                  </button>
                  {roomOptions.map((option) => {
                    const isActive = roomsFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleRoomsFilter(option.value)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-teal-50 text-teal-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isActive && (
                          <span className="ml-auto w-2 h-2 bg-teal-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between gap-2 w-full order-3 lg:order-3 lg:w-auto lg:ml-auto">
              <div className="flex items-center gap-2 text-xs text-gray-500 lg:hidden">
                <span>{t('listing.propertiesFound', { count: filteredData.length })}</span>
                {activeFiltersCount > 0 && (
                  <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">
                    {t('listing.filtersApplied', { count: activeFiltersCount })}
                  </span>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>{t('listing.clear')}</span>
                </button>
              )}
            </div>

          </div>

          <div className="pb-3 lg:pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFlagFilter("seaView")}
                aria-pressed={quickFilters.seaView}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  quickFilters.seaView
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50"
                }`}
              >
                {t("listing.quickSeaView")}
              </button>

              <button
                type="button"
                onClick={() => handleQuickFlagFilter("installmentAvailable")}
                aria-pressed={quickFilters.installmentAvailable}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  quickFilters.installmentAvailable
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50"
                }`}
              >
                {t("listing.quickInstallmentAvailable")}
              </button>

              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickStatusFilter("ready")}
                  aria-pressed={quickFilters.status === "ready"}
                  className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                    quickFilters.status === "ready"
                      ? "border-teal-500 bg-teal-100 text-teal-700"
                      : "border-gray-300 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50"
                  }`}
                >
                  {t("listing.quickReady")}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatusFilter("offplan")}
                  aria-pressed={quickFilters.status === "offplan"}
                  className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                    quickFilters.status === "offplan"
                      ? "border-teal-500 bg-teal-100 text-teal-700"
                      : "border-gray-300 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50"
                  }`}
                >
                  {t("listing.quickOffPlan")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleQuickFlagFilter("citizenshipEligible")}
                aria-pressed={quickFilters.citizenshipEligible}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  quickFilters.citizenshipEligible
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50"
                }`}
              >
                {t("listing.quickCitizenshipEligible")}
              </button>

              <button
                type="button"
                onClick={() => setShowAllFiltersModal(true)}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-950"
              >
                <MdFilterList />
                <span>{t('listing.allFilters')}</span>
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Main Content - Map and Listings */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Left Side - Map */}
      <div
        className="w-full h-[260px] sm:h-[320px] lg:w-[60%] lg:h-full relative"
      >
        <PropertiesMap
          properties={filteredData}
          onPropertyClick={handlePropertyClick}
          resizeKey={filteredData.length}
        />

        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
          <button className="bg-white p-2 rounded shadow hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button className="bg-white p-2 rounded shadow hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right Side - Property Listings */}
      <div className="w-full lg:w-[40%] h-full flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-white">
          {/* Search Title */}
            <div className="flex items-center justify-between">
              <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {filter
                ? t('listing.propertiesIn', { location: filter })
                : t('listing.allProperties')}
            </h1>
            <p className="text-sm text-gray-500">
              {t('listing.propertiesFound', { count: filteredData.length })}
            </p>
          </div>
              {activeFiltersCount > 0 && (
                <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-1 rounded-full">
                  {t('listing.filtersApplied', { count: activeFiltersCount })}
                </span>
              )}
            </div>
        </div>

        {/* Property List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {filteredData.length > 0 ? (
            filteredData.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onCardClick={handlePropertyClick}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="mb-4">
                <MdSearch className="text-gray-300 text-7xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {t('listing.noProperties')}
              </h3>
                <p className="text-gray-500 mb-4">
                {t('listing.tryAdjusting')}
              </p>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                  >
                    {t('listing.resetFilters')}
                  </button>
                )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* All Filters Modal */}
      {showAllFiltersModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{t('listing.allFilters')}</h2>
              <button
                onClick={() => setShowAllFiltersModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-6">
              {/* Consultants */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <MdPerson className="text-teal-600" />
                  {t('listing.consultants')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {consultantOptions.map((option) => {
                    const IconComponent = option.icon;
                    const isActive = consultantFilter
                      ? normalizeId(consultantFilter) === normalizeId(option.value)
                      : option.value === null;
                    return (
                      <button
                        key={option.value || 'all'}
                        onClick={() => handleConsultantFilter(option.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                          isActive
                            ? "bg-teal-50 border-teal-500 text-teal-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <IconComponent className={isActive ? 'text-teal-600' : 'text-gray-400'} />
                        <span className="text-sm font-medium">{option.label}</span>
                        {option.value && (
                          <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {option.count ?? 0}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!consultantsLoading && consultantOptions.length <= 1 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {t('consultants.noConsultants')}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  <HiOutlineOfficeBuilding className="text-teal-600" />
                  {t('listing.propertyUses')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCategoryFilter(null)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      !categoryFilter
                        ? "bg-teal-50 border-teal-500 text-teal-700"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <MdList className={!categoryFilter ? 'text-teal-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium">{t('listing.allCategories')}</span>
                  </button>
                  {propertyCategories.map((cat) => {
                    const IconComponent = cat.icon;
                    const isActive = categoryFilter === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => handleCategoryFilter(cat.value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                          isActive
                            ? "bg-teal-50 border-teal-500 text-teal-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <IconComponent className={isActive ? 'text-teal-600' : 'text-gray-400'} />
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">{t('listing.priceRange')}</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    placeholder={t('listing.minPrice')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    placeholder={t('listing.maxPrice')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Room Count */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">{t('listing.roomCount')}</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleRoomsFilter(null)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      !roomsFilter
                        ? "bg-teal-50 border-teal-500 text-teal-700"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {t('listing.all')}
                  </button>
                  {roomOptions.map((option) => {
                    const isActive = roomsFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleRoomsFilter(option.value)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-teal-50 border-teal-500 text-teal-700"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-4 border-t sticky bottom-0 bg-white">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors"
              >
                {t('listing.resetFilters')}
              </button>
              <button
                onClick={() => {
                  handlePriceFilter();
                  setShowAllFiltersModal(false);
                }}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                {t('listing.applyFilters')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </main>
  );
};

export default Listing;
