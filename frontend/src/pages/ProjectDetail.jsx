import { useState, useMemo, useContext, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CurrencyContext from "../context/CurrencyContext";
import { useQuery } from "react-query";
import {
  Container,
  Grid,
  Paper,
  Button,
  Modal,
  Loader,
  Avatar,
} from "@mantine/core";
import {
  MdLocationOn,
  MdImage,
  MdPlayCircle,
  MdDescription,
  MdArrowBack,
  MdZoomIn,
  MdCampaign,
  MdPlayCircleOutline,
  MdVideocam,
  MdShowChart,
  MdCheck,
  MdClose,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { FaKey } from "react-icons/fa";
import { FaPhone, FaWhatsapp } from "react-icons/fa6";
import { 
  BsHouseDoor, 
  BsTree, 
  BsPeople, 
  BsCart4, 
  BsShieldCheck, 
  BsEye, 
  BsGeoAlt 
} from "react-icons/bs";
import { getProperty } from "../utils/api";
import useConsultants from "../hooks/useConsultants";
import { normalizeWhatsAppNumber } from "../utils/common";
import PhoneLink from "../components/PhoneLink";
import {
  getOptimizedImageUrl,
  getOptimizedVideoPosterUrl,
  getOptimizedVideoUrl,
} from "../utils/media";
import { extractObjectId, resolveProjectPath } from "../utils/seo";
import IstanbulMarketAnalytics from "../components/market/IstanbulMarketAnalytics";
import InquirySidebarCard from "../components/InquirySidebarCard";

// All possible Bina Özellikleri (Building Features)
const ALL_BINA_OZELLIKLERI = [
  "Akıllı Ev",
  "Alarm (Yangın)",
  "Intercom Sistemi",
  "Kablo TV",
  "Jeneratör",
  "Ses Yalıtımı",
  "Su Deposu",
];

// All possible Dış Özellikler (Exterior Features)
const ALL_DIS_OZELLIKLER = [
  "Bahçe",
  "Buhar Odası",
  "Sauna",
  "Türk Hamamı",
  "SPA",
  "Otopark",
  "Havuz",
  "Çocuk Parkı",
  "Spor Alanı",
  "Peyzaj",
];

// All possible Engelli/Yaşlı Uygun (Accessibility Features)
const ALL_ENGELLI_UYGUN = [
  "Engelli Asansörü",
  "Engelli Rampası",
  "Engelli WC",
  "Yaşlı Dostu Tasarım",
  "Görme Engelli Yardımcıları",
];

// All possible Eğlence & Alışveriş (Entertainment/Shopping)
const ALL_EGLENCE_ALISVERIS = [
  "AVM",
  "Restoran",
  "Cafe",
  "Sinema",
  "Fitness Salonu",
  "Çocuk Kulübü",
];

// All possible Güvenlik (Security Features)
const ALL_GUVENLIK = [
  "24 Saat Güvenlik",
  "Güvenlik Kamerası",
  "Kartlı Giriş Sistemi",
  "Yangın Merdiveni",
  "Yangın Söndürme Sistemi",
];

// All possible Manzara (View Features)
const ALL_MANZARA = [
  "Şehir Manzarası",
  "Deniz Manzarası",
  "Göl Manzarası",
  "Orman Manzarası",
  "Havuz Manzarası",
  "Bahçe Manzarası",
];

// All possible Muhit (Neighborhood Features)
const ALL_MUHIT = [
  "Metro",
  "Metrobüs",
  "Otobüs Durağı",
  "Okul",
  "Hastane",
  "Market",
  "Eczane",
  "Banka",
  "Park",
  "Cami",
  "Üniversite",
  "Alışveriş Merkezi",
  "Fuar",
  "İlkokul-Ortaokul",
  "Sağlık Ocağı",
];

// Feature translations (Turkish to English)
const FEATURE_TRANSLATIONS = {
  // Bina Özellikleri
  "Akıllı Ev": "Smart Home",
  "Alarm (Yangın)": "Fire Alarm",
  "Intercom Sistemi": "Intercom System",
  "Kablo TV": "Cable TV",
  "Jeneratör": "Generator",
  "Ses Yalıtımı": "Sound Insulation",
  "Su Deposu": "Water Tank",
  // Dış Özellikler
  "Bahçe": "Garden",
  "Buhar Odası": "Steam Room",
  "Otopark": "Parking",
  "Havuz": "Pool",
  "Çocuk Parkı": "Playground",
  "Spor Alanı": "Sports Area",
  "Peyzaj": "Landscaping",
  // Engelli/Yaşlı Uygun
  "Engelli Asansörü": "Disabled Elevator",
  "Engelli Rampası": "Disabled Ramp",
  "Engelli WC": "Disabled WC",
  "Yaşlı Dostu Tasarım": "Elderly Friendly Design",
  "Görme Engelli Yardımcıları": "Visually Impaired Aids",
  // Eğlence/Alışveriş
  "AVM": "Shopping Mall",
  "Restoran": "Restaurant",
  "Cafe": "Cafe",
  "Sinema": "Cinema",
  "Fitness Salonu": "Fitness Center",
  "SPA": "SPA",
  "Sauna": "Sauna",
  "Türk Hamamı": "Turkish Bath",
  "Çocuk Kulübü": "Kids Club",
  // Güvenlik
  "24 Saat Güvenlik": "24/7 Security",
  "Güvenlik Kamerası": "Security Camera",
  "Kartlı Giriş Sistemi": "Card Access System",
  "Yangın Merdiveni": "Fire Escape",
  "Yangın Söndürme Sistemi": "Fire Suppression System",
  // Manzara
  "Şehir Manzarası": "City View",
  "Deniz Manzarası": "Sea View",
  "Göl Manzarası": "Lake View",
  "Orman Manzarası": "Forest View",
  "Havuz Manzarası": "Pool View",
  "Bahçe Manzarası": "Garden View",
  // Muhit
  "Metro": "Metro",
  "Metrobüs": "Metrobus",
  "Otobüs Durağı": "Bus Stop",
  "Okul": "School",
  "Hastane": "Hospital",
  "Market": "Market",
  "Eczane": "Pharmacy",
  "Banka": "Bank",
  "Park": "Park",
  "Cami": "Mosque",
  "Üniversite": "University",
  "Alışveriş Merkezi": "Shopping Center",
  "Fuar": "Fair",
  "İlkokul-Ortaokul": "Primary-Middle School",
  "Sağlık Ocağı": "Health Center",
};

// Helper function to get translated feature
const getTranslatedFeature = (feature, language) => {
  // Check if feature is bilingual format (e.g., "Havuz / Pool")
  if (feature && feature.includes(" / ")) {
    const parts = feature.split(" / ");
    if (language === "en") {
      return parts[1] || parts[0]; // Return English part
    }
    return parts[0]; // Return Turkish part
  }
  
  // Fallback to translation dictionary
  if (language === "en") {
    return FEATURE_TRANSLATIONS[feature] || feature;
  }
  return feature;
};

const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  let videoId = null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }
  } catch {
    return null;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

const hasSpecialOfferData = (specialOffer) =>
  Boolean(
    specialOffer &&
      (specialOffer.enabled ||
        specialOffer.title ||
        specialOffer.roomType ||
        Number(specialOffer.areaM2 || 0) > 0 ||
        Number(specialOffer.priceGBP || specialOffer.priceUSD || 0) > 0 ||
        Number(specialOffer.downPaymentAmount || 0) > 0 ||
        Number(specialOffer.downPaymentPercent || 0) > 0 ||
        Number(specialOffer.installmentMonths || 0) > 0 ||
        specialOffer.locationLabel ||
        Number(specialOffer.locationMinutes || 0) > 0)
  );

const inferDistrictFromRawProperty = (propertyData) => {
  const direct = String(
    propertyData?.district || propertyData?.addressDetails?.district || ""
  ).trim();
  if (direct) return direct;

  const city = String(
    propertyData?.city || propertyData?.addressDetails?.city || ""
  )
    .toLowerCase()
    .trim();

  const address = String(propertyData?.address || "").trim();
  if (!address) return "";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    const slashParts = address
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    if (slashParts.length > 0) return slashParts[0];
    const words = address.split(/\s+/).filter(Boolean);
    return words[0] || "";
  }

  const withoutCity = parts.filter((part) => part.toLowerCase() !== city);
  const districtCandidate =
    withoutCity.length > 1
      ? withoutCity[withoutCity.length - 1]
      : withoutCity[0] || "";

  return districtCandidate;
};

const ProjectDetail = () => {
  const { projectSlugOrId: routeProjectSlugOrId = "" } = useParams();
  const projectLookupKey = useMemo(() => {
    const normalized = String(routeProjectSlugOrId || "").trim();
    if (!normalized) return "";
    return extractObjectId(normalized) || normalized;
  }, [routeProjectSlugOrId]);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const {
    currencies,
    selectedCurrency,
    baseCurrency,
    rates,
    convertAmount,
    formatMoney,
  } = useContext(CurrencyContext);
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;
  const priceLocale = i18n.language === "tr" ? "tr-TR" : "en-US";
  const currencyCodes = useMemo(() => {
    if (Array.isArray(currencies) && currencies.length > 0) {
      return currencies.map((currency) => currency.code);
    }
    return ["TRY", "USD", "EUR", "GBP"];
  }, [currencies]);
  const secondaryCurrencyCodes = useMemo(
    () => currencyCodes.filter((code) => code !== displayCurrency),
    [currencyCodes, displayCurrency]
  );

  const getSecondaryPrices = (amount, sourceCurrency) =>
    secondaryCurrencyCodes.map((code) => ({
      code,
      label: formatMoney(convertAmount(amount, sourceCurrency, code), code, priceLocale),
    }));
  
  const [activeTab, setActiveTab] = useState("all");
  const [featuresTab, setFeaturesTab] = useState("binaOzellikleri");
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [floorPlanModal, setFloorPlanModal] = useState({ open: false, plan: null });
  const [sitePlanModalOpen, setSitePlanModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLightboxMediaLoaded, setIsLightboxMediaLoaded] = useState(true);
  const [isMainVideoPreviewActive, setIsMainVideoPreviewActive] = useState(false);
  const [isMainVideoPreviewReady, setIsMainVideoPreviewReady] = useState(false);
  const [activeOverviewTab, setActiveOverviewTab] = useState("description");
  const mainVideoPreviewRef = useRef(null);
  const mainGalleryTouchStartXRef = useRef(null);
  const lightboxTouchStartXRef = useRef(null);
  const mainGallerySwipeHandledRef = useRef(false);
  const lightboxSwipeHandledRef = useRef(false);
  const descriptionSectionRef = useRef(null);
  const locationSectionRef = useRef(null);
  const marketSectionRef = useRef(null);

  // Fetch project data from API
  const { data: propertyData, isLoading, isError } = useQuery(
    ["project", projectLookupKey],
    () => getProperty(projectLookupKey),
    { enabled: Boolean(projectLookupKey) }
  );
  const { data: consultants, isLoading: consultantsLoading } = useConsultants();

  useEffect(() => {
    const routeValue = String(routeProjectSlugOrId || "").trim();
    if (!routeValue || !propertyData) return;
    const targetPath = resolveProjectPath(propertyData);
    if (!targetPath || targetPath === location.pathname) return;
    navigate(targetPath, { replace: true });
  }, [location.pathname, navigate, propertyData, routeProjectSlugOrId]);

  // Transform property data to project format
  const project = useMemo(() => {
    if (!propertyData) return null;
    
    // Combine images and videos into a single gallery array
    const images = propertyData.images || [];
    const videos = propertyData.videos || [];
    
    // Create gallery items with type indicator
    const galleryItems = [
      ...videos.map(url => ({ url, type: 'video' })),  // Videos first
      ...images.map(url => ({ url, type: 'image' })),
    ];
    
    // Build ozellikler from individual fields or existing ozellikler object
    const ozellikler = {
      binaOzellikleri: propertyData.binaOzellikleri || propertyData.ozellikler?.binaOzellikleri || [],
      disOzellikler: propertyData.disOzellikler || propertyData.ozellikler?.disOzellikler || [],
      engelliUygun: propertyData.engelliYasliUygun || propertyData.ozellikler?.engelliUygun || [],
      eglenceAlisveris: propertyData.eglenceAlisveris || propertyData.ozellikler?.eglenceAlisveris || [],
      guvenlik: propertyData.guvenlik || propertyData.ozellikler?.guvenlik || [],
      manzara: propertyData.manzara || propertyData.ozellikler?.manzara || [],
      muhit: propertyData.muhit || propertyData.ozellikler?.muhit || [],
    };
    
    const specialOffersFromArray = Array.isArray(propertyData.projeHakkinda?.specialOffers)
      ? propertyData.projeHakkinda.specialOffers.filter((offer) =>
          hasSpecialOfferData(offer)
        )
      : [];
    const legacySpecialOffer = propertyData.projeHakkinda?.specialOffer;
    const specialOffers =
      specialOffersFromArray.length > 0
        ? specialOffersFromArray
        : hasSpecialOfferData(legacySpecialOffer)
        ? [legacySpecialOffer]
        : [];

    return {
      id: propertyData.id,
      name: propertyData.title,
      projectName: propertyData.projectName || "",
      propertyType: propertyData.propertyType || "",
      city: propertyData.city,
      district: inferDistrictFromRawProperty(propertyData),
      price: propertyData.price,
      currency: propertyData.currency,
      deliveryDate: propertyData.deliveryDate || "",
      images: propertyData.images || [],
      videos: propertyData.videos || [],
      galleryItems, // Combined gallery
      projeHakkinda: propertyData.projeHakkinda,
      dairePlanlari: propertyData.dairePlanlari || [],
      vaziyetPlani: propertyData.vaziyetPlani,
      brochureUrl: propertyData.brochureUrl || "",
      ozellikler,
      kampanya: propertyData.kampanya,
      mapImage: propertyData.mapImage,
      ilanNo: propertyData.ilanNo || "",
      consultantId: propertyData.consultant?.id || propertyData.consultantId || "",
      gyo: Boolean(propertyData.gyo),
      specialOffer: specialOffers[0] || null,
      specialOffers,
    };
  }, [propertyData]);

  const projectConsultant = useMemo(() => {
    if (!propertyData) return null;
    if (propertyData.consultant) return propertyData.consultant;
    const consultantId = propertyData.consultantId;
    if (!consultantId || !Array.isArray(consultants)) return null;
    return consultants.find((consultant) => consultant.id === consultantId) || null;
  }, [propertyData, consultants]);

  const consultantTitle =
    projectConsultant &&
    (i18n.language === "tr"
      ? projectConsultant.title_tr || projectConsultant.title
      : projectConsultant.title_en || projectConsultant.title);

  const consultantWhatsApp = normalizeWhatsAppNumber(projectConsultant?.whatsapp);

  // Filter floor plans by room type
  const filteredPlans = useMemo(() => {
    if (!project?.dairePlanlari) return [];
    if (activeTab === "all") return project.dairePlanlari;
    return project.dairePlanlari.filter((plan) => plan.tip === activeTab);
  }, [project, activeTab]);

  // Get unique room types for tabs
  const roomTypes = useMemo(() => {
    if (!project?.dairePlanlari) return [];
    return [...new Set(project.dairePlanlari.map((plan) => plan.tip))];
  }, [project]);

  const getMainImageUrl = (url) =>
    getOptimizedImageUrl(url, { width: 1280, height: 860, quality: "auto:good" });
  const getThumbnailImageUrl = (url) =>
    getOptimizedImageUrl(url, { width: 320, height: 240, quality: "auto:good" });
  const getLightboxImageUrl = (url) =>
    getOptimizedImageUrl(url, {
      width: 1800,
      height: 1400,
      crop: "limit",
      quality: "auto:good",
    });
  const withOriginalSrcFallback = (originalUrl) => (event) => {
    if (!originalUrl) return;
    const currentSrc = event.currentTarget.getAttribute("src");
    if (currentSrc === originalUrl) {
      event.currentTarget.onerror = null;
      return;
    }
    event.currentTarget.setAttribute("src", originalUrl);
  };
  const getMainVideoPosterUrl = (url) =>
    getOptimizedVideoPosterUrl(url, { width: 1280, height: 860, quality: "auto:good" });
  const getThumbnailVideoPosterUrl = (url) =>
    getOptimizedVideoPosterUrl(url, { width: 320, height: 240, quality: "auto:good" });
  const getOptimizedProjectVideoUrl = (url) =>
    getOptimizedVideoUrl(url, { width: 1600, quality: "auto:good" });

  useEffect(() => {
    if (!project?.galleryItems?.length) return;

    const firstVideoIndex = project.galleryItems.findIndex(
      (item) => item?.type === "video" && item?.url
    );
    const firstImageIndex = project.galleryItems.findIndex(
      (item) => item?.type === "image" && item?.url
    );

    // Prefer video on initial load, then fallback to first image.
    if (firstVideoIndex >= 0) {
      setSelectedImage(firstVideoIndex);
      return;
    }

    setSelectedImage(firstImageIndex >= 0 ? firstImageIndex : 0);
  }, [project?.id, project?.galleryItems]);

  useEffect(() => {
    setIsMainVideoPreviewActive(false);
    setIsMainVideoPreviewReady(false);

    if (mainVideoPreviewRef.current) {
      mainVideoPreviewRef.current.pause();
      mainVideoPreviewRef.current.currentTime = 0;
    }
  }, [selectedImage, project?.id]);

  useEffect(() => {
    if (!project?.galleryItems?.length) return;

    const totalItems = project.galleryItems.length;
    const preloadIndexes = [selectedImage, selectedImage + 1, selectedImage + 2]
      .map((index) => index % totalItems)
      .filter((index, current, items) => items.indexOf(index) === current);

    preloadIndexes.forEach((index) => {
      const item = project.galleryItems[index];
      if (!item?.url) return;

      const preloadedImage = new Image();
      preloadedImage.src =
        item.type === "video"
          ? getMainVideoPosterUrl(item.url) || getThumbnailVideoPosterUrl(item.url)
          : getMainImageUrl(item.url);
    });
  }, [project, selectedImage]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const currentType = project?.galleryItems?.[selectedImage]?.type;
    setIsLightboxMediaLoaded(currentType === "video");
  }, [lightboxOpen, selectedImage, project]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader size="xl" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t("localProjects.noProjectsFound")}</p>
          <Button onClick={() => navigate("/projects")}>{t("common.back")}</Button>
        </div>
      </div>
    );
  }

  const specialOffersData = (project.specialOffers || []).filter((offer) =>
    hasSpecialOfferData(offer)
  );
  const isSpecialOfferProject = specialOffersData.length > 0;
  const showMarketAnalytics = project.propertyType !== "international-project";

  const goToPrevGalleryItem = () => {
    const totalItems = project?.galleryItems?.length || 0;
    if (totalItems <= 1) return;
    setSelectedImage((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  };

  const goToNextGalleryItem = () => {
    const totalItems = project?.galleryItems?.length || 0;
    if (totalItems <= 1) return;
    setSelectedImage((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  };

  const navigateBySwipe = (startX, endX) => {
    if (typeof startX !== "number" || typeof endX !== "number") return false;
    const deltaX = endX - startX;
    const swipeThreshold = 45;
    if (Math.abs(deltaX) < swipeThreshold) return false;

    if (deltaX > 0) {
      goToPrevGalleryItem();
    } else {
      goToNextGalleryItem();
    }
    return true;
  };

  const handleMainGalleryTouchStart = (event) => {
    mainGalleryTouchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    mainGallerySwipeHandledRef.current = false;
  };

  const handleMainGalleryTouchEnd = (event) => {
    const startX = mainGalleryTouchStartXRef.current;
    const endX = event.changedTouches?.[0]?.clientX;
    mainGalleryTouchStartXRef.current = null;
    mainGallerySwipeHandledRef.current = navigateBySwipe(startX, endX);
  };

  const handleLightboxTouchStart = (event) => {
    lightboxTouchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    lightboxSwipeHandledRef.current = false;
  };

  const handleLightboxTouchEnd = (event) => {
    const startX = lightboxTouchStartXRef.current;
    const endX = event.changedTouches?.[0]?.clientX;
    lightboxTouchStartXRef.current = null;
    lightboxSwipeHandledRef.current = navigateBySwipe(startX, endX);
  };

  const handleLightboxImageClick = (event) => {
    if (lightboxSwipeHandledRef.current) {
      lightboxSwipeHandledRef.current = false;
      return;
    }

    const totalItems = project?.galleryItems?.length || 0;
    if (totalItems <= 1) return;

    const { left, width } = event.currentTarget.getBoundingClientRect();
    const clickPosition = event.clientX - left;

    if (clickPosition < width / 2) {
      goToPrevGalleryItem();
      return;
    }

    goToNextGalleryItem();
  };

  const handleMainGalleryClick = (event) => {
    if (mainGallerySwipeHandledRef.current) {
      mainGallerySwipeHandledRef.current = false;
      return;
    }

    const currentItem = project?.galleryItems?.[selectedImage];
    if (currentItem?.type === "video") {
      stopMainVideoPreview();
      setCurrentVideoIndex(selectedImage);
      setVideoModalOpen(true);
      return;
    }

    const totalItems = project?.galleryItems?.length || 0;
    if (totalItems <= 1) return;

    const { left, width } = event.currentTarget.getBoundingClientRect();
    const clickPosition = event.clientX - left;

    if (clickPosition < width / 2) {
      goToPrevGalleryItem();
      return;
    }

    goToNextGalleryItem();
  };

  const scrollToSection = (sectionKey) => {
    setActiveOverviewTab(sectionKey);

    const sectionMap = {
      description: descriptionSectionRef,
      location: locationSectionRef,
      market: marketSectionRef,
    };
    sectionMap[sectionKey]?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const selectedGalleryItem = project.galleryItems[selectedImage];
  const selectedVideoPoster =
    selectedGalleryItem?.type === "video"
      ? getMainVideoPosterUrl(selectedGalleryItem.url) ||
        getMainImageUrl(project.images?.[0] || "")
      : "";

  const startMainVideoPreview = () => {
    if (selectedGalleryItem?.type !== "video" || !selectedGalleryItem?.url) return;
    setIsMainVideoPreviewReady(false);
    setIsMainVideoPreviewActive(true);
  };

  const stopMainVideoPreview = () => {
    setIsMainVideoPreviewActive(false);
    setIsMainVideoPreviewReady(false);

    if (mainVideoPreviewRef.current) {
      mainVideoPreviewRef.current.pause();
      mainVideoPreviewRef.current.currentTime = 0;
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-white">
      {/* Header */}
      <div className="bg-white border-b">
        <Container size="lg" className="py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MdArrowBack size={24} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {project.projectName && (
                  <span className="text-xl font-bold text-gray-900">
                    {project.projectName}
                  </span>
                )}
                {isSpecialOfferProject && (
                  <span className="rounded-md bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
                    SPECIAL OFFER
                  </span>
                )}
                {project.ilanNo && (
                  <span className="text-sm font-medium text-gray-500">{project.ilanNo}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-gray-600 text-sm">
                <MdLocationOn className="text-gray-400" />
                <span>{project.city} / {project.district}</span>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container size="lg" className="py-6">
        <Grid gutter="xl">
          {/* Left Column - Main Content */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            {/* Image Gallery */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row gap-2">
                {/* Main Image/Video */}
                <div 
                  className="flex-1 relative cursor-pointer group"
                  onMouseEnter={startMainVideoPreview}
                  onMouseLeave={stopMainVideoPreview}
                  onTouchStart={handleMainGalleryTouchStart}
                  onTouchEnd={handleMainGalleryTouchEnd}
                  onClick={handleMainGalleryClick}
                >
                  {selectedGalleryItem?.type === "video" ? (
                    <>
                      {selectedVideoPoster ? (
                        <img
                          src={selectedVideoPoster}
                          alt={`${project.name} video preview`}
                          className="w-full h-[300px] md:h-[400px] object-cover rounded-lg"
                          loading="eager"
                          fetchPriority="high"
                          decoding="async"
                        />
                      ) : (
                        <video
                          src={getOptimizedProjectVideoUrl(selectedGalleryItem?.url)}
                          className="w-full h-[300px] md:h-[400px] object-cover rounded-lg"
                          muted
                          preload="metadata"
                          playsInline
                        />
                      )}
                      {isMainVideoPreviewActive && selectedGalleryItem?.url && (
                        <video
                          ref={mainVideoPreviewRef}
                          src={getOptimizedProjectVideoUrl(selectedGalleryItem.url)}
                          className={`absolute inset-0 w-full h-[300px] md:h-[400px] object-cover rounded-lg transition-opacity duration-150 ${
                            isMainVideoPreviewReady ? "opacity-100" : "opacity-0"
                          }`}
                          muted
                          autoPlay
                          preload="metadata"
                          playsInline
                          onLoadedData={(event) => {
                            event.currentTarget.currentTime = 0;
                            setIsMainVideoPreviewReady(true);
                          }}
                          onTimeUpdate={(event) => {
                            if (event.currentTarget.currentTime >= 3) {
                              event.currentTarget.currentTime = 0;
                            }
                          }}
                          onError={stopMainVideoPreview}
                        />
                      )}
                      {/* Video Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 rounded-full p-4 group-hover:bg-black/70 transition-colors">
                          <MdPlayCircle className="text-white" size={64} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={
                          getMainImageUrl(selectedGalleryItem?.url || project.images[0]) ||
                          project.images[0]
                        }
                        alt={project.name}
                        className="w-full h-[300px] md:h-[400px] object-cover rounded-lg"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
                    </>
                  )}

                  {project.galleryItems.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToPrevGalleryItem();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Previous image"
                      >
                        <MdChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          goToNextGalleryItem();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Next image"
                      >
                        <MdChevronRight size={24} />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Thumbnails */}
                <div className="flex md:flex-col gap-2 md:w-[120px] h-auto md:h-[400px]">
                  {project.galleryItems.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className={`relative cursor-pointer rounded-lg overflow-hidden flex-1 min-h-[60px] ${
                        selectedImage === index ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => setSelectedImage(index)}
                    >
                      {item.type === "video" ? (
                        <>
                          {getThumbnailVideoPosterUrl(item.url) ? (
                            <img
                              src={getThumbnailVideoPosterUrl(item.url)}
                              alt={`${project.name} video ${index + 1}`}
                              className="w-full h-full object-cover absolute inset-0"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <video
                              src={getOptimizedProjectVideoUrl(item.url)}
                              className="w-full h-full object-cover absolute inset-0"
                              muted
                              preload="metadata"
                              playsInline
                            />
                          )}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <MdPlayCircleOutline className="text-white" size={24} />
                          </div>
                        </>
                      ) : (
                        <img
                          src={getThumbnailImageUrl(item.url)}
                          alt={`${project.name} ${index + 1}`}
                          className="w-full h-full object-cover absolute inset-0"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      {index === 4 && project.galleryItems.length > 5 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium text-center">
                          +{project.galleryItems.length - 5}
                          <br />
                          <span className="text-xs">{t("projectDetail.morePhotos")}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery/Video/Brochure + Price + Delivery Row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mt-4 border-t border-b py-4 gap-4">
                {/* Left: Gallery/Video/Brochure Tabs */}
                <div className="flex items-center gap-4 md:gap-6">
                  <button 
                    onClick={() => setLightboxOpen(true)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <MdImage size={18} />
                    <span className="text-sm">{t("projectDetail.gallery")}</span>
                    <span className="text-xs text-gray-500">
                      ({project.images.length}{project.videos.length > 0 ? ` + ${project.videos.length} video` : ''})
                    </span>
                  </button>
                  <span className="text-gray-300">|</span>
                  {getYouTubeEmbedUrl(project.brochureUrl) ? (
                    <button
                      type="button"
                      onClick={() => setShowYouTube((prev) => !prev)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <MdPlayCircle size={18} />
                      <span className="text-sm">YouTube</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (project.brochureUrl) {
                          window.open(project.brochureUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                      disabled={!project.brochureUrl}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MdDescription size={18} />
                      <span className="text-sm">{t("projectDetail.brochure")}</span>
                    </button>
                  )}
                </div>

                {/* Right: Price and Delivery */}
                <div className="flex items-center gap-6 md:gap-10">
                  {project.gyo && (
                    <button
                      type="button"
                      className="min-w-[120px] rounded-md bg-emerald-600 px-8 py-2.5 text-center text-base font-semibold text-white"
                    >
                      GYO
                    </button>
                  )}

                  {/* Price - Only show if greater than 0 */}
                  {project.price > 0 && (
                    <div className="text-right">
                      <div className="text-xl md:text-2xl font-bold text-blue-600">
                        {formatMoney(
                          convertAmount(
                            project.price,
                            project.currency || baseCurrency,
                            displayCurrency
                          ),
                          displayCurrency,
                          i18n.language === "tr" ? "tr-TR" : "en-US"
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{t("projectDetail.startingFrom")}</div>
                    </div>
                  )}

                  {/* Delivery Date */}
                  <div className="flex items-center gap-2">
                    <FaKey className="text-gray-400" size={18} />
                    <div>
                      <div className="text-xs text-gray-500">{t("projectDetail.deliveryDate")}</div>
                      <div className="font-semibold text-sm">{project.deliveryDate}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {showYouTube && getYouTubeEmbedUrl(project.brochureUrl) && (
              <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={getYouTubeEmbedUrl(project.brochureUrl)}
                    title={project.projectName || project.name || "YouTube Video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <div className="mb-8 flex justify-center">
              <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => scrollToSection("description")}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    activeOverviewTab === "description"
                      ? "bg-[#0b4f93] text-white"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <MdDescription size={16} />
                  {i18n.language?.startsWith("tr") ? "Açıklama" : "Description"}
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("location")}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    activeOverviewTab === "location"
                      ? "bg-[#0b4f93] text-white"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <MdLocationOn size={16} />
                  {i18n.language?.startsWith("tr") ? "Konumu" : "Location"}
                </button>
                {showMarketAnalytics && (
                  <button
                    type="button"
                    onClick={() => scrollToSection("market")}
                    className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                      activeOverviewTab === "market"
                        ? "bg-[#0b4f93] text-white"
                        : "text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    <MdShowChart size={16} />
                    {i18n.language?.startsWith("tr") ? "Emlak Endeksi" : "Market Index"}
                  </button>
                )}
              </div>
            </div>

            {/* About Project */}
            <section ref={descriptionSectionRef} className="mb-8 scroll-mt-28">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t("projectDetail.aboutProject")}</h2>
              
              {/* Project Stats */}
              {project.projeHakkinda && (
                <div className="flex flex-wrap items-center gap-8 md:gap-16 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                    <div>
                      <div className="text-sm text-gray-500">{t("projectDetail.projectArea")}</div>
                      <div className="font-bold text-gray-900">{project.projeHakkinda.projeAlani?.toLocaleString("tr-TR")} m<sup>2</sup></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                    <div>
                      <div className="text-sm text-gray-500">{t("projectDetail.greenArea")}</div>
                      <div className="font-bold text-gray-900">{project.projeHakkinda.yesilAlan?.toLocaleString("tr-TR")} m<sup>2</sup></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                    <div>
                      <div className="text-sm text-gray-500">{t("projectDetail.unitCount")}</div>
                      <div className="font-bold text-gray-900">{project.projeHakkinda.konutSayisi?.toLocaleString("tr-TR")}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Banner */}
              {project.kampanya && (
                <div className="bg-gray-600 rounded p-4 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MdCampaign className="text-yellow-400 text-xl" />
                    <span className="text-sm text-white">{project.kampanya}</span>
                  </div>
                  <button className="text-blue-400 text-sm hover:underline">{t("projectDetail.details")}</button>
                </div>
              )}

              {isSpecialOfferProject && (
                <div className="mb-6 space-y-3">
                  {specialOffersData.map((offer, offerIndex) => {
                    const specialOfferDownPaymentAmount = Number(
                      offer.downPaymentAmount ?? offer.downPaymentPercent ?? 0
                    );
                    const specialOfferLocationText =
                      offer.locationLabel || offer.locationMinutes
                        ? `${offer.locationLabel || ""} ${
                            Number(offer.locationMinutes || 0) > 0
                              ? `${offer.locationMinutes} min`
                              : ""
                          }`.trim()
                        : "";

                    return (
                      <div
                        key={offer.id || offerIndex}
                        className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-rose-50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-lg font-bold text-rose-700">
                            {offer.title || project.projectName || project.name}
                          </h3>
                          <div className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
                            OFF
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-sm">
                          <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
                            {offer.roomType || "-"}
                          </div>
                          <div className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
                            {Number(offer.areaM2 || 0) > 0 ? `${offer.areaM2} m²` : "-"}
                          </div>
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-700">
                            {specialOfferDownPaymentAmount > 0
                              ? `${formatMoney(
                                  convertAmount(
                                    specialOfferDownPaymentAmount,
                                    "GBP",
                                    displayCurrency
                                  ),
                                  displayCurrency,
                                  i18n.language === "tr" ? "tr-TR" : "en-US"
                                )} down payment`
                              : "-"}
                          </div>
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-700">
                            {Number(offer.installmentMonths || 0) > 0
                              ? `${offer.installmentMonths} months`
                              : "-"}
                          </div>
                        </div>

                        <div className="border-t border-rose-100 pt-3">
                          <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                              <div className="text-xs text-slate-500">{t("projectDetail.startingFrom")}</div>
                              <div className="text-2xl font-extrabold text-rose-700">
                                {formatMoney(
                                  Number(offer.priceGBP || offer.priceUSD || project.price || 0),
                                  "GBP",
                                  i18n.language === "tr" ? "tr-TR" : "en-US"
                                )}
                              </div>
                            </div>
                            {specialOfferLocationText && (
                              <div className="text-sm font-medium text-slate-700">
                                {specialOfferLocationText}
                              </div>
                            )}
                          </div>
                          {(() => {
                            const gbpPrice = Number(offer.priceGBP || offer.priceUSD || project.price || 0);
                            if (gbpPrice <= 0) return null;
                            const locale = i18n.language === "tr" ? "tr-TR" : "en-US";
                            return (
                              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                                <span>{formatMoney(convertAmount(gbpPrice, "GBP", "TRY"), "TRY", locale)}</span>
                                <span className="text-slate-300">|</span>
                                <span>{formatMoney(convertAmount(gbpPrice, "GBP", "USD"), "USD", locale)}</span>
                                <span className="text-slate-300">|</span>
                                <span>{formatMoney(convertAmount(gbpPrice, "GBP", "EUR"), "EUR", locale)}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Description - Bilingual */}
              {(() => {
                const description = i18n.language?.startsWith("ru")
                  ? (
                      project.projeHakkinda?.description_ru ||
                      project.projeHakkinda?.description_en ||
                      project.projeHakkinda?.description_tr ||
                      project.projeHakkinda?.description
                    )
                  : i18n.language?.startsWith("en")
                  ? (project.projeHakkinda?.description_en || project.projeHakkinda?.description)
                  : (project.projeHakkinda?.description_tr || project.projeHakkinda?.description);
                
                if (!description) return null;
                
                return (
                  <div className="mb-6 text-sm text-gray-700 leading-relaxed">
                    {description.split('\n\n').map((paragraph, index) => {
                      // Check if paragraph starts with a bold-like text
                      const isBoldStart = paragraph.includes('!') || paragraph.includes('...') || paragraph.startsWith('Siz') || paragraph.startsWith('Hayallerini') || paragraph.startsWith('Ayrıca') || paragraph.startsWith('Kartal');
                      if (isBoldStart && index < 6) {
                        const lines = paragraph.split('\n');
                        return (
                          <div key={index} className="mb-4">
                            {lines.map((line, lineIndex) => {
                              if (lineIndex === 0 && (line.includes('!') || line.includes('...'))) {
                                return <p key={lineIndex} className="font-bold text-gray-900 mb-1">{line}</p>;
                              }
                              return <p key={lineIndex} className="mb-1">{line}</p>;
                            })}
                          </div>
                        );
                      }
                      return <p key={index} className="mb-4">{paragraph}</p>;
                    })}
                  </div>
                );
              })()}

              {/* Nearby Distances */}
              {project.projeHakkinda?.yakinMesafeler && (
                <div className="mt-4">
                  {project.projeHakkinda.yakinMesafeler.map((item, index) => (
                    <div key={index} className="text-sm text-gray-700 mb-1">
                      {item.yer} <span className="text-blue-600">{item.mesafe}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {showMarketAnalytics && (
              <section ref={marketSectionRef} className="mb-8 scroll-mt-28">
                <IstanbulMarketAnalytics districtHint={project.district} />
              </section>
            )}

            {/* Floor Plans */}
            {project.dairePlanlari && project.dairePlanlari.length > 0 && (
              <section className="mb-8">
                {/* Room Type Tabs */}
                <div className="flex items-center gap-6 mb-4 border-b">
                  <button
                    className={`px-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === "all"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("all")}
                  >
                    Hepsi
                  </button>
                  {roomTypes.map((type) => (
                    <button
                      key={type}
                      className={`px-2 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === type
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>


                {/* Floor Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlans.map((plan) => {
                    const planSecondaryPrices = getSecondaryPrices(
                      plan.fiyat,
                      project.currency || baseCurrency
                    );
                    return (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-bold text-gray-900 text-lg mb-2">
                          {plan.tip} - {plan.varyant}
                        </h3>
                        {plan.fiyat > 0 && (
                          <div className="mb-3">
                            <span className="text-blue-600 font-medium">
                              {formatMoney(
                                convertAmount(
                                  plan.fiyat,
                                  project.currency || baseCurrency,
                                  displayCurrency
                                ),
                                displayCurrency,
                                priceLocale
                              )}
                            </span>
                            {planSecondaryPrices.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                {planSecondaryPrices.map((price) => (
                                  <span key={price.code} className="whitespace-nowrap">
                                    <span className="font-medium text-gray-600">{price.code}</span>{" "}
                                    {price.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="w-4 h-4 border border-gray-400 rounded-sm inline-block"></span>
                            <span>{plan.metrekare} m²</span>
                          </div>
                          <button 
                            className="text-blue-600 hover:underline"
                            onClick={() => setFloorPlanModal({ open: true, plan })}
                          >
                            {t("projectDetail.details")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Site Plan */}
            {project.vaziyetPlani && (
              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t("projectDetail.sitePlan")}</h2>
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => setSitePlanModalOpen(true)}
                >
                  <img
                    src={getOptimizedImageUrl(project.vaziyetPlani, {
                      width: 1400,
                      height: 1000,
                      crop: "limit",
                    })}
                    onError={withOriginalSrcFallback(project.vaziyetPlani)}
                    alt={t("projectDetail.sitePlan")}
                    className="w-full h-auto max-h-[500px] object-contain rounded-lg border bg-gray-50"
                    loading="lazy"
                    decoding="async"
                  />
                  {/* Zoom overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
                      <MdZoomIn size={20} className="text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">{t("projectDetail.clickToEnlarge") || "Büyütmek için tıklayın"}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Location / Map Section */}
            <section ref={locationSectionRef} className="mb-8 scroll-mt-28">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t("projectDetail.location")}</h2>
              <div className="relative">
                {project.mapImage ? (
                  <img
                    src={getOptimizedImageUrl(project.mapImage, {
                      width: 1400,
                      height: 900,
                    })}
                    alt={`${project.name} - ${t("projectDetail.location")}`}
                    className="w-full h-[350px] object-cover rounded-lg border"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-[350px] bg-gray-100 rounded-lg border flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <MdLocationOn size={48} className="mx-auto mb-2" />
                      <p className="text-sm">{project.city} / {project.district}</p>
                      <p className="text-xs mt-1">Harita görüntüsü eklenecek</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Features Section - Below Location - Comprehensive Display */}
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-lg">📋</span>
                {t("projectDetail.features")}
              </h2>
              
              {/* Feature Category Tabs with Icons */}
              <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2 border-b">
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    featuresTab === "binaOzellikleri"
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setFeaturesTab("binaOzellikleri")}
                >
                  <BsHouseDoor />
                  {t("projectDetail.buildingFeatures")}
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    featuresTab === "disOzellikler"
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setFeaturesTab("disOzellikler")}
                >
                  <BsTree />
                  {t("projectDetail.exteriorFeatures")}
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    featuresTab === "engelliUygun"
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setFeaturesTab("engelliUygun")}
                >
                  <BsPeople />
                  {t("projectDetail.accessibility")}
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    featuresTab === "eglenceAlisveris"
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setFeaturesTab("eglenceAlisveris")}
                >
                  <BsCart4 />
                  {t("projectDetail.entertainment")}
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    featuresTab === "guvenlik"
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setFeaturesTab("guvenlik")}
                >
                  <BsShieldCheck />
                  {t("projectDetail.security")}
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    featuresTab === "manzara"
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setFeaturesTab("manzara")}
                >
                  <BsEye />
                  {t("projectDetail.view")}
                </button>
                <button
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    featuresTab === "muhit"
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setFeaturesTab("muhit")}
                >
                  <BsGeoAlt />
                  {t("projectDetail.neighborhood")}
                </button>
              </div>

              {/* Features Grid - Show all possible features with check/uncheck */}
              <div className="p-5 bg-white border border-gray-100 rounded-xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {/* Bina Özellikleri */}
                  {featuresTab === "binaOzellikleri" && ALL_BINA_OZELLIKLERI.map((feature, index) => {
                    const hasFeature = project.ozellikler?.binaOzellikleri?.some(f => 
                      f === feature || f.includes(feature) || feature.includes(f.split(" / ")[0])
                    );
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${!hasFeature ? "opacity-50" : ""}`}
                      >
                        {hasFeature ? (
                          <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                        ) : (
                          <MdClose className="text-red-400 flex-shrink-0" size={18} />
                        )}
                        <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                          {getTranslatedFeature(feature, i18n.language)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Dış Özellikler */}
                  {featuresTab === "disOzellikler" && ALL_DIS_OZELLIKLER.map((feature, index) => {
                    const hasFeature = project.ozellikler?.disOzellikler?.some(f => 
                      f === feature || f.includes(feature) || feature.includes(f.split(" / ")[0])
                    );
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${!hasFeature ? "opacity-50" : ""}`}
                      >
                        {hasFeature ? (
                          <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                        ) : (
                          <MdClose className="text-red-400 flex-shrink-0" size={18} />
                        )}
                        <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                          {getTranslatedFeature(feature, i18n.language)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Engelli/Yaşlı Uygun */}
                  {featuresTab === "engelliUygun" && ALL_ENGELLI_UYGUN.map((feature, index) => {
                    const hasFeature = project.ozellikler?.engelliUygun?.some(f => 
                      f === feature || f.includes(feature) || feature.includes(f.split(" / ")[0])
                    );
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${!hasFeature ? "opacity-50" : ""}`}
                      >
                        {hasFeature ? (
                          <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                        ) : (
                          <MdClose className="text-red-400 flex-shrink-0" size={18} />
                        )}
                        <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                          {getTranslatedFeature(feature, i18n.language)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Eğlence & Alışveriş */}
                  {featuresTab === "eglenceAlisveris" && ALL_EGLENCE_ALISVERIS.map((feature, index) => {
                    const hasFeature = project.ozellikler?.eglenceAlisveris?.some(f => 
                      f === feature || f.includes(feature) || feature.includes(f.split(" / ")[0])
                    );
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${!hasFeature ? "opacity-50" : ""}`}
                      >
                        {hasFeature ? (
                          <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                        ) : (
                          <MdClose className="text-red-400 flex-shrink-0" size={18} />
                        )}
                        <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                          {getTranslatedFeature(feature, i18n.language)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Güvenlik */}
                  {featuresTab === "guvenlik" && ALL_GUVENLIK.map((feature, index) => {
                    const hasFeature = project.ozellikler?.guvenlik?.some(f => 
                      f === feature || f.includes(feature) || feature.includes(f.split(" / ")[0])
                    );
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${!hasFeature ? "opacity-50" : ""}`}
                      >
                        {hasFeature ? (
                          <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                        ) : (
                          <MdClose className="text-red-400 flex-shrink-0" size={18} />
                        )}
                        <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                          {getTranslatedFeature(feature, i18n.language)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Manzara */}
                  {featuresTab === "manzara" && ALL_MANZARA.map((feature, index) => {
                    const hasFeature = project.ozellikler?.manzara?.some(f => 
                      f === feature || f.includes(feature) || feature.includes(f.split(" / ")[0])
                    );
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${!hasFeature ? "opacity-50" : ""}`}
                      >
                        {hasFeature ? (
                          <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                        ) : (
                          <MdClose className="text-red-400 flex-shrink-0" size={18} />
                        )}
                        <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                          {getTranslatedFeature(feature, i18n.language)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Muhit */}
                  {featuresTab === "muhit" && ALL_MUHIT.map((feature, index) => {
                    const hasFeature = project.ozellikler?.muhit?.some(f => 
                      f === feature || f.includes(feature) || feature.includes(f.split(" / ")[0])
                    );
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 text-sm ${!hasFeature ? "opacity-50" : ""}`}
                      >
                        {hasFeature ? (
                          <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                        ) : (
                          <MdClose className="text-red-400 flex-shrink-0" size={18} />
                        )}
                        <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                          {getTranslatedFeature(feature, i18n.language)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </Grid.Col>

          {/* Right Column - Contact Form */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <div className="sticky top-24">
              <InquirySidebarCard
                propertyId={project.id}
                propertyTitle={project.name}
                listingNo={project.ilanNo || propertyData?.listingNo || ""}
                locationLabel={[project.city, project.district].filter(Boolean).join(" / ")}
                consultantId={project.consultantId || projectConsultant?.id || ""}
                subjectPrefix="Project Inquiry"
              />
            </div>

            {(projectConsultant || project.consultantId) && (
              <Paper
                shadow="sm"
                className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.35)]"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t("projectDetail.consultant")}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t("projectDetail.consultantDescription")}
                </p>

                {consultantsLoading && !projectConsultant && (
                  <div className="flex items-center justify-center py-6">
                    <Loader size="sm" />
                  </div>
                )}

                {!consultantsLoading && !projectConsultant && (
                  <p className="text-sm text-gray-500">
                    {t("projectDetail.consultantUnavailable")}
                  </p>
                )}

                {projectConsultant && (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar
                        src={projectConsultant.image}
                        alt={projectConsultant.name}
                        size="lg"
                        radius="xl"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {projectConsultant.name}
                        </h4>
                        {consultantTitle && (
                          <p className="text-sm text-gray-600">
                            {consultantTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <PhoneLink
                        phone={projectConsultant.phone}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:border-green-500 hover:text-green-600"
                      >
                        <FaPhone className="text-gray-500" />
                        <span dir="ltr">{projectConsultant.phone}</span>
                      </PhoneLink>
                      {consultantWhatsApp && (
                        <a
                          href={`https://wa.me/${consultantWhatsApp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:bg-[#20bd5a] transition-colors"
                        >
                          <FaWhatsapp />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </>
                )}
              </Paper>
            )}
          </Grid.Col>
        </Grid>
      </Container>

      {/* Image/Video Lightbox */}
      <Modal
        opened={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        size="xl"
        centered
        withCloseButton
      >
        <div className="relative">
          {selectedGalleryItem?.type === "video" ? (
            <video
              src={getOptimizedProjectVideoUrl(selectedGalleryItem?.url)}
              poster={getMainVideoPosterUrl(selectedGalleryItem?.url) || undefined}
              className="w-full h-auto rounded-lg"
              controls
              autoPlay
              preload="metadata"
              playsInline
            />
          ) : (
            <img
              src={
                getLightboxImageUrl(selectedGalleryItem?.url || project.images[0]) ||
                project.images[0]
              }
              alt={project.name}
              className={`w-full h-auto cursor-pointer select-none transition-opacity duration-200 ${
                isLightboxMediaLoaded ? "opacity-100" : "opacity-0"
              }`}
              onTouchStart={handleLightboxTouchStart}
              onTouchEnd={handleLightboxTouchEnd}
              onClick={handleLightboxImageClick}
              onLoad={() => setIsLightboxMediaLoaded(true)}
              onError={() => setIsLightboxMediaLoaded(true)}
              decoding="async"
            />
          )}

          {selectedGalleryItem?.type === "image" && !isLightboxMediaLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/60 rounded-lg">
              <Loader size="sm" />
            </div>
          )}

          {project.galleryItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevGalleryItem}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors flex items-center justify-center"
                aria-label="Previous image"
              >
                <MdChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={goToNextGalleryItem}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/45 text-white hover:bg-black/65 transition-colors flex items-center justify-center"
                aria-label="Next image"
              >
                <MdChevronRight size={24} />
              </button>
            </>
          )}
        </div>
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          {project.galleryItems.map((item, index) => (
            <button
              key={index}
              className={`w-16 h-12 rounded overflow-hidden relative ${
                selectedImage === index ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedImage(index)}
            >
              {item.type === "video" ? (
                <>
                  {getThumbnailVideoPosterUrl(item.url) ? (
                    <img
                      src={getThumbnailVideoPosterUrl(item.url)}
                      alt={`${project.name} video ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <video
                      src={getOptimizedProjectVideoUrl(item.url)}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                      playsInline
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <MdPlayCircleOutline className="text-white" size={16} />
                  </div>
                </>
              ) : (
                <img
                  src={getThumbnailImageUrl(item.url)}
                  alt={`${project.name} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Floor Plan Modal */}
      <Modal
        opened={floorPlanModal.open}
        onClose={() => setFloorPlanModal({ open: false, plan: null })}
        size="lg"
        centered
        withCloseButton
        title={
          floorPlanModal.plan && (
            <div className="font-bold text-lg">
              {floorPlanModal.plan.tip} - {floorPlanModal.plan.varyant}
            </div>
          )
        }
      >
        {floorPlanModal.plan && (
          <div className="space-y-4">
            {floorPlanModal.plan.image ? (
              <img
                src={floorPlanModal.plan.image}
                alt={`${floorPlanModal.plan.tip} - ${floorPlanModal.plan.varyant}`}
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <p className="text-gray-500">{t("projectDetail.noFloorPlanImage") || "Görsel mevcut değil"}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              {floorPlanModal.plan.fiyat > 0 && (() => {
                const modalSecondaryPrices = getSecondaryPrices(
                  floorPlanModal.plan.fiyat,
                  project.currency || baseCurrency
                );
                return (
                  <div>
                    <p className="text-sm text-gray-500">{t("projectDetail.price") || "Fiyat"}</p>
                    <p className="font-bold text-blue-600 text-lg">
                      {formatMoney(
                        convertAmount(
                          floorPlanModal.plan.fiyat,
                          project.currency || baseCurrency,
                          displayCurrency
                        ),
                        displayCurrency,
                        priceLocale
                      )}
                    </p>
                    {modalSecondaryPrices.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        {modalSecondaryPrices.map((price) => (
                          <span key={price.code} className="whitespace-nowrap">
                            <span className="font-medium text-gray-600">{price.code}</span>{" "}
                            {price.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <p className="text-sm text-gray-500">{t("projectDetail.area") || "Alan"}</p>
                <p className="font-bold text-gray-900 text-lg">
                  {floorPlanModal.plan.metrekare} m²
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Site Plan Modal */}
      <Modal
        opened={sitePlanModalOpen}
        onClose={() => setSitePlanModalOpen(false)}
        size="xl"
        centered
        withCloseButton
        title={<span className="font-bold text-lg">{t("projectDetail.sitePlan")}</span>}
      >
        {project?.vaziyetPlani && (
          <img
            src={getOptimizedImageUrl(project.vaziyetPlani, {
              width: 1800,
              height: 1400,
              crop: "limit",
            })}
            onError={withOriginalSrcFallback(project.vaziyetPlani)}
            alt={t("projectDetail.sitePlan")}
            className="w-full h-auto rounded-lg"
            loading="lazy"
            decoding="async"
          />
        )}
      </Modal>

      {/* Video Modal - Full Screen */}
      {videoModalOpen && project?.galleryItems[currentVideoIndex]?.type === 'video' && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => setVideoModalOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl z-10"
          >
            ×
          </button>

          {/* Video Info */}
          <div className="absolute top-4 left-4 text-white/80 text-sm flex items-center gap-2">
            <MdVideocam />
            Video
          </div>

          {/* Main Video */}
          <video
            key={currentVideoIndex}
            src={getOptimizedProjectVideoUrl(project.galleryItems[currentVideoIndex]?.url)}
            poster={
              getMainVideoPosterUrl(project.galleryItems[currentVideoIndex]?.url) || undefined
            }
            className="max-h-[85vh] max-w-[90vw] rounded-lg"
            controls
            autoPlay
            preload="metadata"
            playsInline
          />
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
