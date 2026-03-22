import PropertyGridCard from "./PropertyGridCard";
import { Link, useNavigate } from "react-router-dom";
import useProperties from "../hooks/useProperties";
import { useEffect, useState, useRef, useMemo, useContext } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  MdLocationOn,
  MdSearch,
  MdKeyboardArrowDown,
  MdFilterList,
  MdClose,
  MdList,
  MdLocationCity,
  MdPublic,
} from "react-icons/md";
import CurrencyContext from "../context/CurrencyContext";
import useConsultants from "../hooks/useConsultants";

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

const isSeaViewProperty = (searchableText) =>
  includesAnyKeyword(searchableText, SEA_VIEW_KEYWORDS);

const isInstallmentProperty = (property, searchableText) => {
  const hasInstallmentInOffers = getSpecialOffers(property).some(
    (offer) => Number(offer?.installmentMonths || 0) > 0
  );
  if (hasInstallmentInOffers) return true;
  return includesAnyKeyword(searchableText, INSTALLMENT_KEYWORDS);
};

const isCitizenshipEligibleProperty = (searchableText) =>
  includesAnyKeyword(searchableText, CITIZENSHIP_KEYWORDS);

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

  if (quickFilters.seaView && !isSeaViewProperty(searchableText)) {
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

// Animated Card wrapper with IntersectionObserver
const AnimatedCard = ({ children, delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100 blur-0' 
          : 'opacity-0 translate-y-6 scale-95 blur-sm'
      }`}
    >
      {children}
    </div>
  );
};

AnimatedCard.propTypes = {
  children: PropTypes.node.isRequired,
  delay: PropTypes.number,
};

const Properties = () => {
  const { t, i18n } = useTranslation();
  const { data, isError, isLoading } = useProperties();
  const { data: consultants = [] } = useConsultants();
  const navigate = useNavigate();
  const [headerVisible, setHeaderVisible] = useState(false);
  const headerRef = useRef(null);
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;

  const [searchValue, setSearchValue] = useState("");
  const [consultantFilter, setConsultantFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [roomsFilter, setRoomsFilter] = useState("");
  const [quickFilters, setQuickFilters] = useState({
    seaView: false,
    installmentAvailable: false,
    citizenshipEligible: false,
    status: "",
  });
  const includeProjectsByQuickFilters =
    quickFilters.seaView ||
    quickFilters.installmentAvailable ||
    quickFilters.citizenshipEligible ||
    Boolean(quickFilters.status);

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showRoomsDropdown, setShowRoomsDropdown] = useState(false);

  const typeRef = useRef(null);
  const categoryRef = useRef(null);
  const priceRef = useRef(null);
  const roomsRef = useRef(null);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setHeaderVisible(true));
    return () => cancelAnimationFrame(frameId);
  }, []);

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

  const roomOptions = [
    { value: "0", label: t("listing.studio") },
    { value: "1", label: t("listing.room1") },
    { value: "2", label: t("listing.room2") },
    { value: "3", label: t("listing.room3") },
    { value: "4", label: t("listing.room4") },
    { value: "5+", label: t("listing.room5plus") },
  ];

  const propertyCategories = [
    { value: "residential", label: t("categories.residential") },
    { value: "villa", label: t("categories.villa") },
    { value: "commercial", label: t("categories.commercial") },
    { value: "land", label: t("categories.land") },
    { value: "residentialProjects", label: t("categories.residentialProjects") },
    { value: "building", label: t("categories.building") },
    { value: "timeshare", label: t("categories.timeshare") },
    { value: "touristFacility", label: t("categories.touristFacility") },
  ];

  const formatCurrency = (num) =>
    formatMoney(
      Number(num || 0),
      displayCurrency,
      i18n.language === "tr" ? "tr-TR" : "en-US"
    );

  const getPropertyConsultantId = (property) =>
    property?.consultantId ||
    property?.consultant?.id ||
    property?.consultant?._id ||
    null;

  const normalizeId = (value) =>
    value === null || value === undefined ? "" : String(value);

  const consultantPropertyCounts = useMemo(() => {
    if (!Array.isArray(data)) return {};
    const query = searchValue.trim().toLowerCase();
    const counts = {};

    data
      .filter((property) => {
        if (includeProjectsByQuickFilters) return true;
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
        if (!priceRange.min && !priceRange.max) return true;
        const priceValue = convertAmount(
          property.price || 0,
          property.currency || baseCurrency,
          displayCurrency
        );
        if (priceRange.min && priceValue < Number(priceRange.min)) return false;
        if (priceRange.max && priceValue > Number(priceRange.max)) return false;
        return true;
      })
      .filter((property) => {
        if (!roomsFilter) return true;

        if (property.rooms) {
          const roomsValue = property.rooms.toLowerCase();
          const normalizedRooms = roomsValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const roomMatch = roomsValue.match(/^(\d+)/);
          const roomCount = roomMatch ? parseInt(roomMatch[1], 10) : 0;

          if (roomsFilter === "0") {
            return (
              normalizedRooms.includes("studyo") ||
              normalizedRooms.includes("studio") ||
              roomCount === 0
            );
          }
          if (roomsFilter === "5+") {
            return roomCount >= 5;
          }
          return roomCount === parseInt(roomsFilter, 10);
        }

        const bedrooms = property.facilities?.bedrooms || 0;
        if (roomsFilter === "0") return bedrooms === 0;
        if (roomsFilter === "5+") return bedrooms >= 5;
        return bedrooms === parseInt(roomsFilter, 10);
      })
      .filter((property) => matchesQuickAccessFilters(property, quickFilters))
      .filter((property) => {
        if (!query) return true;
        const title = property.title?.toLowerCase() || "";
        const city = property.city?.toLowerCase() || "";
        const country = property.country?.toLowerCase() || "";
        const address = property.address?.toLowerCase() || "";
        return (
          title.includes(query) ||
          city.includes(query) ||
          country.includes(query) ||
          address.includes(query)
        );
      })
      .forEach((property) => {
        const consultantId = normalizeId(getPropertyConsultantId(property));
        if (!consultantId) return;
        counts[consultantId] = (counts[consultantId] || 0) + 1;
      });

    return counts;
  }, [
    data,
    searchValue,
    categoryFilter,
    priceRange,
    roomsFilter,
    quickFilters,
    includeProjectsByQuickFilters,
    baseCurrency,
    displayCurrency,
    convertAmount,
  ]);

  const consultantOptions = useMemo(() => {
    const list = Array.isArray(consultants) ? consultants : [];
    const mapped = list
      .map((consultant) => {
        const id = normalizeId(consultant?.id || consultant?._id);
        if (!id) return null;
        return {
          value: id,
          label: consultant?.name || consultant?.fullName || t("listing.consultantUnknown"),
          image: consultant?.image || consultant?.photo || consultant?.avatar || null,
          count: consultantPropertyCounts[id] || 0,
        };
      })
      .filter(Boolean);

    return [{ value: null, label: t("listing.all"), icon: MdList }, ...mapped];
  }, [consultants, consultantPropertyCounts, t]);

  const getConsultantLabel = () => {
    if (!consultantFilter) return t("listing.all");
    const current = consultantOptions.find(
      (option) => normalizeId(option.value) === normalizeId(consultantFilter)
    );
    return current ? current.label : t("listing.consultantUnknown");
  };

  const getCategoryLabel = () => {
    if (!categoryFilter) return t("listing.propertyUses");
    const current = propertyCategories.find((cat) => cat.value === categoryFilter);
    return current ? current.label : t("listing.propertyUses");
  };

  const getPriceLabel = () => {
    if (priceRange.min || priceRange.max) {
      if (priceRange.min && priceRange.max) {
        return `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`;
      }
      if (priceRange.min) return `${formatCurrency(priceRange.min)}+`;
      return `${t("listing.maxPrice")}: ${formatCurrency(priceRange.max)}`;
    }
    return t("listing.price");
  };

  const getRoomsLabel = () => {
    if (roomsFilter) {
      const option = roomOptions.find((item) => item.value === roomsFilter);
      return option ? option.label : t("listing.rooms");
    }
    return t("listing.rooms");
  };

  const projectPageOptions = [
    {
      value: "local",
      label: t("nav.localProjects"),
      icon: MdLocationCity,
      route: "/projects?projectType=local",
    },
    {
      value: "international",
      label: t("nav.internationalProjects"),
      icon: MdPublic,
      route: "/projects?projectType=international",
    },
  ];

  const handleProjectPageNavigation = (route) => {
    setShowTypeDropdown(false);
    navigate(route);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchValue.trim()) count += 1;
    if (consultantFilter) count += 1;
    if (categoryFilter) count += 1;
    if (priceRange.min || priceRange.max) count += 1;
    if (roomsFilter) count += 1;
    if (quickFilters.seaView) count += 1;
    if (quickFilters.installmentAvailable) count += 1;
    if (quickFilters.citizenshipEligible) count += 1;
    if (quickFilters.status) count += 1;
    return count;
  }, [searchValue, consultantFilter, categoryFilter, priceRange, roomsFilter, quickFilters]);

  const toggleQuickFlag = (key) => {
    setQuickFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleQuickStatus = (status) => {
    setQuickFilters((prev) => ({
      ...prev,
      status: prev.status === status ? "" : status,
    }));
  };

  const baseFilteredProperties = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const query = searchValue.trim().toLowerCase();

    return data
      .filter((property) => {
        if (includeProjectsByQuickFilters) return true;
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
        if (!priceRange.min && !priceRange.max) return true;
        const priceValue = convertAmount(
          property.price || 0,
          property.currency || baseCurrency,
          displayCurrency
        );
        if (priceRange.min && priceValue < Number(priceRange.min)) return false;
        if (priceRange.max && priceValue > Number(priceRange.max)) return false;
        return true;
      })
      .filter((property) => {
        if (!roomsFilter) return true;

        if (property.rooms) {
          const roomsValue = property.rooms.toLowerCase();
          const normalizedRooms = roomsValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const roomMatch = roomsValue.match(/^(\d+)/);
          const roomCount = roomMatch ? parseInt(roomMatch[1], 10) : 0;

          if (roomsFilter === "0") {
            return (
              normalizedRooms.includes("studyo") ||
              normalizedRooms.includes("studio") ||
              roomCount === 0
            );
          }
          if (roomsFilter === "5+") {
            return roomCount >= 5;
          }
          return roomCount === parseInt(roomsFilter, 10);
        }

        const bedrooms = property.facilities?.bedrooms || 0;
        if (roomsFilter === "0") return bedrooms === 0;
        if (roomsFilter === "5+") return bedrooms >= 5;
        return bedrooms === parseInt(roomsFilter, 10);
      })
      .filter((property) => matchesQuickAccessFilters(property, quickFilters))
      .filter((property) => {
        if (!query) return true;
        const title = property.title?.toLowerCase() || "";
        const city = property.city?.toLowerCase() || "";
        const country = property.country?.toLowerCase() || "";
        const address = property.address?.toLowerCase() || "";
        return (
          title.includes(query) ||
          city.includes(query) ||
          country.includes(query) ||
          address.includes(query)
        );
      });
  }, [
    data,
    searchValue,
    categoryFilter,
    priceRange,
    roomsFilter,
    quickFilters,
    includeProjectsByQuickFilters,
    baseCurrency,
    displayCurrency,
    convertAmount,
  ]);

  const filteredProperties = useMemo(() => {
    if (!consultantFilter) return baseFilteredProperties;
    return baseFilteredProperties.filter((property) => {
      const consultantId = normalizeId(getPropertyConsultantId(property));
      return consultantId === normalizeId(consultantFilter);
    });
  }, [baseFilteredProperties, consultantFilter]);

  const handleAllFilters = () => {
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("search", searchValue.trim());
    if (consultantFilter) params.set("consultantId", consultantFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (priceRange.min) params.set("minPrice", priceRange.min);
    if (priceRange.max) params.set("maxPrice", priceRange.max);
    if (roomsFilter) params.set("rooms", roomsFilter);
    if (quickFilters.seaView) params.set("seaView", "true");
    if (quickFilters.installmentAvailable) params.set("installmentAvailable", "true");
    if (quickFilters.citizenshipEligible) params.set("citizenshipEligible", "true");
    if (quickFilters.status) params.set("status", quickFilters.status);
    const queryString = params.toString();
    navigate(`/listing${queryString ? `?${queryString}` : ""}`);
  };

  if (isError) {
    return (
      <div className="max-padd-container py-16">
        <span className="text-red-500">{t("listing.errorFetching")}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <section id="featured-properties" className="relative py-20 xl:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white" />
        <div className="max-padd-container relative z-10">
          {/* Loading Header */}
          <div className="text-center mb-14">
            <div className="h-8 w-48 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-12 w-80 bg-gray-200 rounded-lg mx-auto mb-4 animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
          </div>
          {/* Loading Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse shadow-sm border border-gray-100">
                <div className="h-[140px] bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      id="featured-properties"
      className="relative py-20 xl:py-28 overflow-visible"
    >
      {/* Background - Clean White with subtle tint */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-white" />
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>
      
      <div className="max-padd-container relative z-10">
        {/* Section Header */}
        <div 
          ref={headerRef}
          className={`text-center mb-14 transition-all duration-1000 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <span className="investment-opportunities-pill relative mb-4 inline-block overflow-hidden rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-md">
            <span className="relative z-[1]">{t("properties.futureHomeAwaits")}</span>
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
            {t("properties.findDreamHere")}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {t("properties.subtitle")}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="max-w-5xl mx-auto mb-12 relative z-20">
          <div className="rounded-2xl border border-gray-200/80 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur isolation-isolate">
            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 sm:p-4">
              <div className="flex items-center gap-2 w-full sm:flex-1 sm:min-w-[260px]">
                {/* Location Search */}
                <div className="flex items-center gap-2 w-full min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
                  <MdLocationOn className="text-gray-400 text-lg flex-shrink-0" />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={t("listing.locationPlaceholder")}
                    className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                  />
                  {searchValue && (
                    <button
                      type="button"
                      onClick={() => setSearchValue("")}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label={t("listing.clear")}
                    >
                      <MdClose size={16} />
                    </button>
                  )}
                  <MdSearch className="text-gray-400 text-lg flex-shrink-0" />
                </div>

                {/* Project Type Dropdown */}
                <div ref={typeRef} className="relative w-[132px] shrink-0 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowTypeDropdown((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="flex-1 text-left">{t("nav.projects")}</span>
                    <MdKeyboardArrowDown
                      className={`transition-transform ${showTypeDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  <div
                    className={`absolute top-full right-0 mt-2 w-[220px] max-w-[calc(100vw-2rem)] rounded-lg bg-white z-30 sm:left-0 sm:right-auto sm:min-w-[220px] sm:w-auto origin-top transition-all duration-300 ease-out ${
                      showTypeDropdown
                        ? "max-h-[320px] translate-y-0 opacity-100 border border-gray-200 shadow-lg py-1 pointer-events-auto"
                        : "max-h-0 -translate-y-2 opacity-0 border border-transparent shadow-none py-0 pointer-events-none"
                    }`}
                  >
                    <div className="max-h-[320px] overflow-y-auto">
                      {projectPageOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              handleProjectPageNavigation(option.route);
                            }}
                            className="w-full px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-emerald-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                <IconComponent className="text-base" />
                              </div>
                              <span className="flex-1 text-left leading-tight whitespace-normal break-words">{option.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                {/* Category Filter Dropdown */}
                <div ref={categoryRef} className="relative col-span-2 sm:col-span-1 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="min-w-0 flex-1 truncate">{getCategoryLabel()}</span>
                    <MdKeyboardArrowDown
                      className={`transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-30 max-h-[280px] overflow-y-auto sm:right-auto sm:min-w-[220px]">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter(null);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          !categoryFilter
                            ? "bg-emerald-50 text-emerald-700 font-medium"
                            : "text-gray-700 hover:bg-emerald-50"
                        }`}
                      >
                        {t("listing.allCategories")}
                      </button>
                      {propertyCategories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(cat.value);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            categoryFilter === cat.value
                              ? "bg-emerald-50 text-emerald-700 font-medium"
                              : "text-gray-700 hover:bg-emerald-50"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Filter Dropdown */}
                <div ref={priceRef} className="relative col-span-1 sm:col-span-1 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowPriceDropdown((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="min-w-0 flex-1 truncate">{getPriceLabel()}</span>
                    <MdKeyboardArrowDown
                      className={`transition-transform ${showPriceDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showPriceDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg z-30 sm:right-auto sm:w-[260px]">
                      <h4 className="text-sm font-medium text-gray-800 mb-3">
                        {t("listing.priceRange")}
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="number"
                          value={priceRange.min}
                          onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                          placeholder={t("listing.minPrice")}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          value={priceRange.max}
                          onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                          placeholder={t("listing.maxPrice")}
                          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPriceDropdown(false)}
                        className="w-full py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition"
                      >
                        {t("listing.applyFilters")}
                      </button>
                    </div>
                  )}
                </div>

                {/* Rooms Filter Dropdown */}
                <div ref={roomsRef} className="relative col-span-1 sm:col-span-1 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowRoomsDropdown((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span className="min-w-0 flex-1 truncate">{getRoomsLabel()}</span>
                    <MdKeyboardArrowDown
                      className={`transition-transform ${showRoomsDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showRoomsDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-30 sm:right-auto sm:min-w-[160px]">
                      <button
                        type="button"
                        onClick={() => {
                          setRoomsFilter("");
                          setShowRoomsDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          !roomsFilter
                            ? "bg-emerald-50 text-emerald-700 font-medium"
                            : "text-gray-700 hover:bg-emerald-50"
                        }`}
                      >
                        {t("listing.all")}
                      </button>
                      {roomOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setRoomsFilter(option.value);
                            setShowRoomsDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            roomsFilter === option.value
                              ? "bg-emerald-50 text-emerald-700 font-medium"
                              : "text-gray-700 hover:bg-emerald-50"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* All Filters Button */}
              <div className="w-full sm:w-auto flex justify-center">
                <button
                  type="button"
                  onClick={handleAllFilters}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 sm:w-auto"
                >
                  <MdFilterList />
                  <span>{t("listing.allFilters")}</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-200/80 px-3 pb-3 sm:px-4 sm:pb-4">
              <button
                type="button"
                onClick={() => toggleQuickFlag("seaView")}
                aria-pressed={quickFilters.seaView}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  quickFilters.seaView
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {t("listing.quickSeaView")}
              </button>

              <button
                type="button"
                onClick={() => toggleQuickFlag("installmentAvailable")}
                aria-pressed={quickFilters.installmentAvailable}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  quickFilters.installmentAvailable
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {t("listing.quickInstallmentAvailable")}
              </button>

              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleQuickStatus("ready")}
                  aria-pressed={quickFilters.status === "ready"}
                  className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                    quickFilters.status === "ready"
                      ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  {t("listing.quickReady")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleQuickStatus("offplan")}
                  aria-pressed={quickFilters.status === "offplan"}
                  className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                    quickFilters.status === "offplan"
                      ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  {t("listing.quickOffPlan")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => toggleQuickFlag("citizenshipEligible")}
                aria-pressed={quickFilters.citizenshipEligible}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  quickFilters.citizenshipEligible
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {t("listing.quickCitizenshipEligible")}
              </button>
            </div>
          </div>
        </div>

        {/* Properties Grid - Exclude projects (they have their own pages) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.slice(0, 12).map((property, index) => (
            <AnimatedCard key={property.id} delay={index * 100}>
              <PropertyGridCard property={property} />
            </AnimatedCard>
          ))}
          {filteredProperties.length === 0 && (
            <div className="col-span-full text-center text-gray-500">
              {t("properties.noProperties")}
            </div>
          )}
        </div>

        {/* View More Button */}
        <AnimatedCard delay={800}>
          <div className="flex justify-center mt-14">
            <Link
              to="/listing"
              className="investment-opportunities-pill group relative overflow-hidden rounded-xl bg-emerald-500 px-8 py-3.5 font-medium text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("properties.viewAll")}
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>
        </AnimatedCard>
      </div>
    </section>
  );
};

export default Properties;
