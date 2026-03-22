import { useContext, useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PuffLoader } from "react-spinners";
import Map from "../components/Map";
import { getProperty, removeBooking } from "../utils/api";
import useAuthCheck from "../hooks/useAuthCheck";
import { useAuth0 } from "@auth0/auth0-react";
import BookingModal from "../components/BookingModal";
import ContactModal from "../components/ContactModal";
import UserDetailContext from "../context/UserDetailContext";
import CurrencyContext from "../context/CurrencyContext";
import { Button, Avatar } from "@mantine/core";
import { toast } from "react-toastify";
import { bilingualKey } from "../utils/bilingualToast";
import { normalizeWhatsAppNumber } from "../utils/common";
import PhoneLink from "../components/PhoneLink";
import {
  MdOutlineBed,
  MdOutlineBathtub,
  MdOutlineGarage,
  MdSell,
  MdLocationCity,
  MdPublic,
  MdVerified,
  MdDescription,
  MdShowChart,
  MdCheck,
  MdClose,
  MdPlayCircleOutline,
} from "react-icons/md";
import {
  FaLocationDot,
  FaRegClock,
  FaCalendarPlus,
  FaPhone,
  FaWhatsapp,
  FaEnvelope,
  FaStar,
} from "react-icons/fa6";
import { BsHouseDoor, BsTree, BsLightningCharge, BsGeoAlt, BsGrid, BsEye } from "react-icons/bs";

// All possible interior features (Turkish)
const ALL_INTERIOR_FEATURES = [
  "ADSL",
  "Akıllı Ev",
  "Alarm (Hırsız)",
  "Alarm (Yangın)",
  "Alüminyum Doğrama",
  "Amerikan Kapı",
  "Ankastre Fırın",
  "Beyaz Eşya",
  "Bulaşık Makinesi",
  "Kurutma Makinesi",
  "Çamaşır Makinesi",
  "Çamaşır Odası",
  "Çelik Kapı",
  "Duşakabin",
  "Fırın",
  "Giyinme Odası",
  "Gömme Dolap",
  "Görüntülü Diafon",
  "Isıcam",
  "Kartonpiyer",
  "Kiler",
  "Klima",
  "Laminat Zemin",
  "Mobilya",
  "Ankastre Mutfak",
  "Laminat Mutfak",
  "Mutfak Doğalgazı",
  "Parke Zemin",
  "PVC Doğrama",
  "Seramik Zemin",
  "Set Üstü Ocak",
  "Spot Aydınlatma",
  "Jakuzi",
  "Küvet",
  "Teras",
  "Wi-Fi",
  "Şömine",
];

// All possible exterior features (Turkish)
const ALL_EXTERIOR_FEATURES = [
  "24 Saat Güvenlik",
  "Apartman Görevlisi",
  "Araç Şarj İstasyonu",
  "Çocuk Oyun Parkı",
  "Hamam",
  "Hidrofor",
  "Jeneratör",
  "Kablo TV",
  "Kamera Sistemi",
  "Müstakil Havuzlu",
  "Sauna",
  "Ses Yalıtımı",
  "Spor Alanı",
  "Su Deposu",
  "Yangın Merdiveni",
  "Yüzme Havuzu (Açık)",
  "Yüzme Havuzu (Kapalı)",
];

// Altyapı (Infrastructure) features
const ALTYAPI_FEATURES = [
  "Elektrik",
  "Sanayi Elektriği",
  "Su",
  "Telefon",
  "Doğalgaz",
  "Kanalizasyon",
  "Arıtma",
  "Sondaj & Kuyu",
  "Zemin Etüdü",
  "Yolu Açılmış",
  "Yolu Açılmamış",
  "Yolu Yok",
];

// Konum (Location) features
const KONUM_FEATURES = [
  "Ana Yola Yakın",
  "Denize Sıfır",
  "Denize Yakın",
  "Havaalanına Yakın",
  "Toplu Ulaşıma Yakın",
];

// Genel Özellikler (General Features)
const GENEL_OZELLIKLER = [
  "İfrazlı",
  "Parselli",
  "Projeli",
  "Köşe Parsel",
];

// Manzara (View) features
const MANZARA_FEATURES = [
  "Şehir",
  "Deniz",
  "Doğa",
  "Boğaz",
  "Göl",
];

// Muhit (Neighborhood) features
const MUHIT_FEATURES = [
  "Alışveriş Merkezi",
  "Belediye",
  "Cami",
  "Denize Sıfır",
  "Eczane",
  "Eğlence Merkezi",
  "Fuar",
  "Göle Sıfır",
  "Hastane",
  "Havra",
  "İlkokul-Ortaokul",
  "İtfaiye",
  "Kilise",
  "Lise",
  "Park",
  "Plaj",
  "Polis Merkezi",
  "Sağlık Ocağı",
  "Semt Pazarı",
  "Spor Salonu",
  "Şehir Merkezi",
];

import { CgRuler } from "react-icons/cg";
import HeartBtn from "../components/HeartBtn";
import { resolveProjectPath } from "../utils/seo";
import IstanbulMarketAnalytics from "../components/market/IstanbulMarketAnalytics";
import InquirySidebarCard from "../components/InquirySidebarCard";

// Format date helper function
const formatDate = (dateString, showFullDate = false, locale = "en") => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const localeCode = locale === "tr" ? "tr-TR" : "en-US";

  if (showFullDate) {
    return date.toLocaleDateString(localeCode, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (locale === "tr") {
    if (diffDays === 0) return "Bugün";
    if (diffDays === 1) return "Dün";
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`;
  } else {
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  }

  return date.toLocaleDateString(localeCode, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const inferDistrictFromProperty = (property) => {
  const direct =
    String(property?.district || property?.addressDetails?.district || "").trim();
  if (direct) return direct;

  const address = String(property?.address || "").trim();
  if (!address) return "";

  const city = String(property?.city || property?.addressDetails?.city || "")
    .toLowerCase()
    .trim();

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

  if (parts.length > 1) {
    const withoutCity = parts.filter((part) => part.toLowerCase() !== city);
    if (withoutCity.length > 1) return withoutCity[withoutCity.length - 1] || "";
    if (withoutCity.length === 1) return withoutCity[0];
    return parts[0] || "";
  }

  return "";
};

const Property = () => {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // console.log(pathname);
  const id = pathname.split("/").slice(-1)[0];
  // console.log(id)
  const { data, isLoading, isError } = useQuery(["resd", id], () =>
    getProperty(id)
  );

  useEffect(() => {
    if (
      data?.propertyType === "local-project" ||
      data?.propertyType === "international-project"
    ) {
      navigate(resolveProjectPath(data), { replace: true });
    }
  }, [data, data?.propertyType, navigate]);
  // console.log(data)
  const [modalOpened, setModalOpened] = useState(false);
  const [galleryOpened, setGalleryOpened] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [activeOverviewTab, setActiveOverviewTab] = useState("description");
  const descriptionSectionRef = useRef(null);
  const locationSectionRef = useRef(null);
  const marketSectionRef = useRef(null);
  const { validateLogin } = useAuthCheck();
  const { user } = useAuth0();
  const whatsappNumber = normalizeWhatsAppNumber(data?.consultant?.whatsapp);
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;
  const convertedPrice = convertAmount(
    data?.price || 0,
    data?.currency || baseCurrency,
    displayCurrency
  );
  const formattedPrice = formatMoney(
    convertedPrice,
    displayCurrency,
    i18n.language === "tr" ? "tr-TR" : "en-US"
  );
  const toPositiveNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const roomText = typeof data?.rooms === "string" ? data.rooms.trim() : "";
  const roomNumber = toPositiveNumber(data?.rooms);
  const bedroomsCount = toPositiveNumber(data?.facilities?.bedrooms);
  const bathroomsCount = toPositiveNumber(data?.bathrooms ?? data?.facilities?.bathrooms);
  const parkingsCount = toPositiveNumber(data?.facilities?.parkings);
  const grossArea = toPositiveNumber(data?.area?.gross);
  const netArea = toPositiveNumber(data?.area?.net);
  const areaValue = grossArea || netArea;

  const hasRoomTextValue = roomText !== "" && roomText !== "0";
  const roomDisplayValue = hasRoomTextValue
    ? roomText
    : roomNumber || bedroomsCount || null;

  const propertyStats = [
    roomDisplayValue
      ? { key: "rooms", icon: MdOutlineBed, value: roomDisplayValue }
      : null,
    bathroomsCount > 0
      ? { key: "bathrooms", icon: MdOutlineBathtub, value: bathroomsCount }
      : null,
    parkingsCount > 0
      ? { key: "parkings", icon: MdOutlineGarage, value: parkingsCount }
      : null,
    areaValue > 0
      ? { key: "area", icon: CgRuler, value: `${areaValue.toLocaleString()} m²` }
      : null,
  ].filter(Boolean);

  // Get all images - support both 'images' array and single 'image'
  const getPropertyImages = () => {
    if (data?.images && data.images.length > 0) {
      return data.images;
    }
    if (data?.image) {
      return [data.image];
    }
    return [];
  };
  const propertyImages = getPropertyImages();
  
  // Get all videos
  const propertyVideos = data?.videos || [];
  const galleryItems = [
    ...propertyVideos.map((url) => ({ url, type: "video" })),
    ...propertyImages.map((url) => ({ url, type: "image" })),
  ];
  const districtHint = inferDistrictFromProperty(data);

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

  const {
    userDetails: { token, bookings },
    setUserDetails,
  } = useContext(UserDetailContext);

  const { mutate: cancelBooking, isLoading: cancelling } = useMutation({
    mutationFn: () => removeBooking(id, user?.email, token),
    onSuccess: () => {
      setUserDetails((prev) => ({
        ...prev,
        bookings: prev.bookings.filter((booking) => booking?.id !== id),
      }));

      toast.success(bilingualKey("booking.bookingCancelled"), {
        position: "bottom-right",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="h-64 flexCenter">
        <PuffLoader
          height="80"
          width="80"
          radius={1}
          color="#555"
          aria-label="puff-loading"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <span>Error while fetching data</span>
      </div>
    );
  }

  // Navigate gallery
  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === galleryItems.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? galleryItems.length - 1 : prev - 1
    );
  };

  // Navigate videos
  const nextVideo = () => {
    setCurrentVideoIndex((prev) =>
      prev === propertyVideos.length - 1 ? 0 : prev + 1
    );
  };

  const prevVideo = () => {
    setCurrentVideoIndex((prev) =>
      prev === 0 ? propertyVideos.length - 1 : prev - 1
    );
  };

  return (
    <section className="max-padd-container my-[99px] overflow-x-hidden">
      {/* Image Gallery Grid */}
      <div className="pb-4 relative">
        <div className="flex flex-col md:flex-row gap-2 md:h-[500px] rounded-xl overflow-hidden">
          {/* Main Large Image - Left Side */}
          <div
            className="relative md:flex-[1.5] h-[320px] sm:h-[380px] md:h-full group cursor-pointer rounded-lg overflow-hidden"
            onClick={() => {
              if (galleryItems[currentImageIndex]?.type === "video") {
                setCurrentVideoIndex(currentImageIndex);
                setVideoModalOpen(true);
              } else {
                setGalleryOpened(true);
              }
            }}
          >
            {galleryItems[currentImageIndex]?.type === "video" ? (
              <>
                <video
                  src={galleryItems[currentImageIndex]?.url}
                  className="w-full h-full object-cover"
                  muted
                  onMouseEnter={(e) => e.target.play()}
                  onMouseLeave={(e) => {
                    e.target.pause();
                    e.target.currentTime = 0;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 rounded-full p-4 group-hover:bg-black/70 transition-colors">
                    <MdPlayCircleOutline className="text-white" size={56} />
                  </div>
                </div>
              </>
            ) : (
              <img
                src={
                  galleryItems[currentImageIndex]?.url ||
                  "https://via.placeholder.com/800x600"
                }
                alt={data?.title}
                className="w-full h-full object-cover"
              />
            )}
            {/* Navigation Arrow Left */}
            {galleryItems.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flexCenter shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MdOutlineBed className="rotate-180 text-xl" />‹
              </button>
            )}
            {/* Like Button */}
            <div className="absolute top-4 right-4 z-10">
              <HeartBtn id={id} />
            </div>
          </div>

          {/* Right Side - 2x2 Grid */}
          {galleryItems.length > 1 && (
            <div className="md:flex-1 grid grid-cols-2 auto-rows-fr gap-2 h-[240px] sm:h-[280px] md:h-full">
              {galleryItems.slice(1, 5).map((item, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer overflow-hidden group rounded-lg"
                  onClick={() => {
                    setCurrentImageIndex(index + 1);
                    if (item.type === "video") {
                      setCurrentVideoIndex(index + 1);
                      setVideoModalOpen(true);
                    } else {
                      setGalleryOpened(true);
                    }
                  }}
                >
                  {item.type === "video" ? (
                    <>
                      <video
                        src={item.url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                        <MdPlayCircleOutline size={32} color="white" />
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.url}
                      alt={`${data?.title} - ${index + 2}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Navigation Arrow Right */}
          {galleryItems.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flexCenter shadow-lg z-10"
            >
              ›
            </button>
          )}
        </div>

      </div>

      {/* Video Modal */}
      {videoModalOpen && propertyVideos.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => setVideoModalOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flexCenter text-white text-2xl z-10"
          >
            ×
          </button>

          {/* Video Counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            Video {currentVideoIndex + 1} / {propertyVideos.length}
          </div>

          {/* Main Video */}
          <video
            src={propertyVideos[currentVideoIndex]}
            className="max-h-[85vh] max-w-[90vw] rounded-lg"
            controls
            autoPlay
          />

          {/* Navigation Arrows */}
          {propertyVideos.length > 1 && (
            <>
              <button
                onClick={prevVideo}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flexCenter text-white text-3xl"
              >
                ‹
              </button>
              <button
                onClick={nextVideo}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flexCenter text-white text-3xl"
              >
                ›
              </button>
            </>
          )}

          {/* Thumbnail Strip for Videos */}
          {propertyVideos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
              {propertyVideos.map((video, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentVideoIndex(index)}
                  className={`relative h-16 w-24 rounded-lg cursor-pointer transition-all overflow-hidden ${
                    currentVideoIndex === index
                      ? "ring-2 ring-purple-500 opacity-100"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <video
                    src={video}
                    className="h-full w-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <MdPlayCircleOutline size={20} color="white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Screen Gallery Modal */}
      {galleryOpened && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => setGalleryOpened(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flexCenter text-white text-2xl z-10"
          >
            ×
          </button>

          {/* Gallery Counter */}
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            {currentImageIndex + 1} / {galleryItems.length}
          </div>

          {/* Main Image/Video */}
          {galleryItems[currentImageIndex]?.type === "video" ? (
            <video
              src={galleryItems[currentImageIndex]?.url}
              className="max-h-[85vh] max-w-[90vw] rounded-lg"
              controls
              autoPlay
            />
          ) : (
            <img
              src={galleryItems[currentImageIndex]?.url}
              alt={`${data?.title} - ${currentImageIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
          )}

          {/* Navigation Arrows */}
          {galleryItems.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flexCenter text-white text-3xl"
              >
                ‹
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flexCenter text-white text-3xl"
              >
                ›
              </button>
            </>
          )}

          {/* Thumbnail Strip */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
            {galleryItems.map((item, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`relative h-16 w-24 rounded-lg cursor-pointer transition-all overflow-hidden ${
                  currentImageIndex === index
                    ? "ring-2 ring-secondary opacity-100"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                {item.type === "video" ? (
                  <>
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <MdPlayCircleOutline size={20} color="white" />
                    </div>
                  </>
                  ) : (
                    <img
                      src={item.url}
                      alt={`${data?.title || "Property image"} thumbnail ${index + 2}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
            ))}
          </div>
        </div>
      )}

      <div className="my-5 flex justify-center">
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
            <FaLocationDot size={14} />
            {i18n.language?.startsWith("tr") ? "Konumu" : "Location"}
          </button>
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
        </div>
      </div>

      {/* container */}
      <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Property Content */}
        <div ref={descriptionSectionRef} className="scroll-mt-28 rounded-2xl bg-white p-2">
          <div className="flexBetween mb-2">
            <h5 className="bold-16 text-secondary">{data?.city}</h5>
            {/* Property Type Badge */}
            <span
              className={`flexCenter gap-x-1 px-3 py-1 rounded-full text-sm font-semibold ${
                data?.propertyType === "sale"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              {data?.propertyType === "sale" ? (
                <MdSell size={16} />
              ) : data?.propertyType === "local-project" ? (
                <MdLocationCity size={16} />
              ) : (
                <MdPublic size={16} />
              )}
              {data?.propertyType === "sale" 
                ? t('listing.forSale') 
                : data?.propertyType === "local-project"
                ? t('nav.localProjects')
                : t('nav.internationalProjects')}
            </span>
          </div>
          <div className="flexBetween">
            <h4 className="medium-18">{data?.title}</h4>
            <div className="bold-20">
              {formattedPrice}
            </div>
          </div>
          {/* info */}
          {propertyStats.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-x-4 py-2">
              {propertyStats.map((stat, index) => {
                const Icon = stat.icon;
                const withSeparator = index < propertyStats.length - 1;

                return (
                  <div
                    key={stat.key}
                    className={`flexCenter gap-x-2 font-[500] text-sm sm:text-base ${
                      withSeparator ? "border-r-2 border-gray-900/80 pr-2 sm:pr-4" : ""
                    }`}
                  >
                    <Icon /> {stat.value}
                  </div>
                );
              })}
            </div>
          )}
          <p className="pt-2 mb-4">
            {i18n.language?.startsWith("tr")
              ? (data?.description_tr || data?.description)
              : i18n.language?.startsWith("ru")
              ? (data?.description_ru || data?.description_en || data?.description_tr || data?.description)
              : (data?.description_en || data?.description_tr || data?.description)}
          </p>
          <div className="flexStart gap-x-2 my-5">
            <FaLocationDot />
            <div>
              {data?.address} {data?.city} {data?.country}
            </div>
          </div>

          {/* Map Section - Moved Higher */}
          <div ref={locationSectionRef} className="scroll-mt-28 my-6 rounded-xl overflow-hidden h-[300px]">
            <Map
              address={data?.address}
              city={data?.city}
              country={data?.country}
            />
          </div>

          <div ref={marketSectionRef} className="scroll-mt-28 my-6">
            <IstanbulMarketAnalytics districtHint={districtHint} />
          </div>

          {/* Property Details Table */}
          <div className="my-6 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <tbody>
                {data?.listingNo && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 w-1/3 border-r border-gray-200">{t('propertyDetails.listingNo')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.listingNo}</td>
                  </tr>
                )}
                {data?.listingDate && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.listingDate')}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {new Date(data.listingDate).toLocaleDateString(i18n.language === "tr" ? "tr-TR" : "en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.propertyType')}</td>
                  <td className="px-4 py-3 text-gray-900">{data?.propertyType === "sale" ? t('propertyDetails.saleApartment') : t('propertyDetails.rentApartment')}</td>
                </tr>
                {data?.area?.gross > 0 && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.grossArea')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.area.gross.toLocaleString()}</td>
                  </tr>
                )}
                {data?.area?.net > 0 && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.netArea')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.area.net.toLocaleString()}</td>
                  </tr>
                )}
                {data?.rooms && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.roomCount')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.rooms}</td>
                  </tr>
                )}
                {data?.buildingAge !== undefined && data?.buildingAge !== null && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.buildingAge')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.buildingAge}</td>
                  </tr>
                )}
                {data?.floor !== undefined && data?.floor !== null && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.floor')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.floor}</td>
                  </tr>
                )}
                {data?.totalFloors > 0 && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.totalFloors')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.totalFloors}</td>
                  </tr>
                )}
                {data?.heating && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.heating')}</td>
                    <td className="px-4 py-3 text-gray-900 capitalize">{data.heating.replace(/-/g, " ")}</td>
                  </tr>
                )}
                {(data?.bathrooms > 0 || data?.facilities?.bathrooms > 0) && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.bathroomCount')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.bathrooms || data.facilities?.bathrooms}</td>
                  </tr>
                )}
                {data?.kitchen && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.kitchen')}</td>
                    <td className="px-4 py-3 text-gray-900 capitalize">{data.kitchen.replace(/-/g, " ")}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.balcony')}</td>
                  <td className="px-4 py-3 text-gray-900">{data?.balcony ? t('propertyDetails.available') : t('propertyDetails.notAvailable')}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.elevator')}</td>
                  <td className="px-4 py-3 text-gray-900">{data?.elevator ? t('propertyDetails.available') : t('propertyDetails.notAvailable')}</td>
                </tr>
                {data?.parking && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.parking')}</td>
                    <td className="px-4 py-3 text-gray-900 capitalize">{data.parking.replace(/-/g, " ")}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.furnished')}</td>
                  <td className="px-4 py-3 text-gray-900">{data?.furnished ? t('propertyDetails.yes') : t('propertyDetails.no')}</td>
                </tr>
                {data?.usageStatus && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.usageStatus')}</td>
                    <td className="px-4 py-3 text-gray-900 capitalize">{data.usageStatus.replace(/-/g, " ")}</td>
                  </tr>
                )}
                {data?.siteName && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.siteName')}</td>
                    <td className="px-4 py-3 text-gray-900">{data.siteName}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.dues')}</td>
                  <td className="px-4 py-3 text-gray-900">{data?.dues > 0 ? `₺${data.dues.toLocaleString()}` : t('propertyDetails.notSpecified')}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.mortgageEligible')}</td>
                  <td className="px-4 py-3 text-gray-900">{data?.mortgageEligible ? t('propertyDetails.yes') : t('propertyDetails.no')}</td>
                </tr>
                {data?.deedStatus && (
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.deedStatus')}</td>
                    <td className="px-4 py-3 text-gray-900 capitalize">{data.deedStatus.replace(/-/g, " ")}</td>
                  </tr>
                )}
                {data?.imarDurumu && (
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-700 border-r border-gray-200">{t('propertyDetails.imarDurumu')}</td>
                    <td className="px-4 py-3 text-gray-900 capitalize">{data.imarDurumu.replace(/-/g, " ")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Date Information */}
          <div className="flex flex-wrap gap-4 my-4 p-4 bg-primary rounded-xl">
            {data?.createdAt && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-secondary/10 rounded-lg flexCenter">
                  <FaCalendarPlus className="text-secondary" />
                </div>
                <div>
                  <p className="text-gray-30 text-xs">{t('propertyDetails.listedOn')}</p>
                  <p className="font-medium text-tertiary">
                    {formatDate(data.createdAt, true, i18n.language)}
                  </p>
                </div>
              </div>
            )}
            {data?.updatedAt && data?.updatedAt !== data?.createdAt && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flexCenter">
                  <FaRegClock className="text-blue-500" />
                </div>
                <div>
                  <p className="text-gray-30 text-xs">{t('propertyDetails.lastUpdated')}</p>
                  <p className="font-medium text-tertiary">
                    {formatDate(data.updatedAt, true, i18n.language)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {bookings?.map((booking) => booking.id).includes(id) ? (
              <>
                <div className="flex gap-2">
                  <Button
                    onClick={() => cancelBooking()}
                    variant="outline"
                    className="flex-1"
                    color="red"
                    disabled={cancelling}
                  >
                    {t('propertyDetails.cancelBooking')}
                  </Button>
                  <Button
                    onClick={() => setContactModalOpen(true)}
                    className="flex-1 bg-secondary hover:bg-secondary/90"
                    leftSection={<FaEnvelope />}
                  >
                    {t('propertyDetails.sendMessage')}
                  </Button>
                </div>
                <p className="text-green-600 medium-15 flex items-center gap-2">
                  <MdCheck className="text-lg" />
                  {t('propertyDetails.bookedVisit')}{" "}
                  {bookings?.filter((booking) => booking?.id === id)[0].date}
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    validateLogin() && setModalOpened(true);
                  }}
                  className="btn-secondary rounded-xl !px-5 !py-[7px] shadow-sm w-full"
                >
                  {t('propertyDetails.bookVisit')}
                </button>
                <Button
                  onClick={() => {
                    if (!validateLogin()) return;
                    toast.warning(`⚠️ ${bilingualKey("propertyDetails.bookFirstWarning")}`, {
                      position: "bottom-right",
                      autoClose: 5000,
                    });
                  }}
                  variant="outline"
                  color="gray"
                  className="w-full"
                  leftSection={<FaEnvelope />}
                  disabled
                >
                  {t('propertyDetails.sendMessageBookFirst')}
                </Button>
              </>
            )}
            <BookingModal
              opened={modalOpened}
              setOpened={setModalOpened}
              propertyId={id}
              email={user?.email}
            />
          </div>

          {/* Property Features Section */}
          <div className="mt-8 space-y-6">
            {/* Interior Features - Only show when NOT land */}
            {data?.category !== "land" && (
            <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flexCenter">
                  <BsHouseDoor className="text-green-600" />
                </div>
                <h4 className="font-semibold text-tertiary">
                  {t('propertyDetails.interiorFeatures')}
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ALL_INTERIOR_FEATURES.map((feature, index) => {
                  const hasFeature = data?.interiorFeatures?.includes(feature);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm ${
                        !hasFeature ? "opacity-50" : ""
                      }`}
                    >
                      {hasFeature ? (
                        <MdCheck
                          className="text-green-500 flex-shrink-0"
                          size={18}
                        />
                      ) : (
                        <MdClose
                          className="text-red-400 flex-shrink-0"
                          size={18}
                        />
                      )}
                      <span
                        className={
                          hasFeature
                            ? "text-gray-700 font-medium"
                            : "text-gray-400"
                        }
                      >
                        {feature}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Exterior Features - Only show when NOT land */}
            {data?.category !== "land" && (
            <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flexCenter">
                  <BsTree className="text-blue-600" />
                </div>
                <h4 className="font-semibold text-tertiary">
                  {t('propertyDetails.exteriorFeatures')}
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ALL_EXTERIOR_FEATURES.map((feature, index) => {
                  const hasFeature = data?.exteriorFeatures?.includes(feature);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm ${
                        !hasFeature ? "opacity-50" : ""
                      }`}
                    >
                      {hasFeature ? (
                        <MdCheck
                          className="text-green-500 flex-shrink-0"
                          size={18}
                        />
                      ) : (
                        <MdClose
                          className="text-red-400 flex-shrink-0"
                          size={18}
                        />
                      )}
                      <span
                        className={
                          hasFeature
                            ? "text-gray-700 font-medium"
                            : "text-gray-400"
                        }
                      >
                        {feature}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Muhit Features - Only show when NOT land */}
            {data?.category !== "land" && (
            <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flexCenter">
                  <BsGeoAlt className="text-purple-600" />
                </div>
                <h4 className="font-semibold text-tertiary">
                  {t('propertyDetails.muhitFeatures')}
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {MUHIT_FEATURES.map((feature, index) => {
                  const hasFeature = data?.muhitFeatures?.includes(feature);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm ${
                        !hasFeature ? "opacity-50" : ""
                      }`}
                    >
                      {hasFeature ? (
                        <MdCheck
                          className="text-green-500 flex-shrink-0"
                          size={18}
                        />
                      ) : (
                        <MdClose
                          className="text-red-400 flex-shrink-0"
                          size={18}
                        />
                      )}
                      <span
                        className={
                          hasFeature
                            ? "text-gray-700 font-medium"
                            : "text-gray-400"
                        }
                      >
                        {t(`muhit.${feature}`, feature)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Arsa/Land Features - Only show when category is land */}
            {data?.category === "land" && (
              <>
                {/* Altyapı */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 bg-amber-500/10 rounded-lg flexCenter">
                      <BsLightningCharge className="text-amber-600" />
                    </div>
                    <h4 className="font-semibold text-tertiary">Altyapı</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ALTYAPI_FEATURES.map((feature, index) => {
                      const hasFeature = data?.altyapiFeatures?.includes(feature);
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-sm ${
                            !hasFeature ? "opacity-50" : ""
                          }`}
                        >
                          {hasFeature ? (
                            <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                          ) : (
                            <MdClose className="text-red-400 flex-shrink-0" size={18} />
                          )}
                          <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                            {feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Konum */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flexCenter">
                      <BsGeoAlt className="text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-tertiary">Konum</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {KONUM_FEATURES.map((feature, index) => {
                      const hasFeature = data?.konumFeatures?.includes(feature);
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-sm ${
                            !hasFeature ? "opacity-50" : ""
                          }`}
                        >
                          {hasFeature ? (
                            <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                          ) : (
                            <MdClose className="text-red-400 flex-shrink-0" size={18} />
                          )}
                          <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                            {feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Genel Özellikler */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flexCenter">
                      <BsGrid className="text-green-600" />
                    </div>
                    <h4 className="font-semibold text-tertiary">Genel Özellikler</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {GENEL_OZELLIKLER.map((feature, index) => {
                      const hasFeature = data?.genelOzellikler?.includes(feature);
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-sm ${
                            !hasFeature ? "opacity-50" : ""
                          }`}
                        >
                          {hasFeature ? (
                            <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                          ) : (
                            <MdClose className="text-red-400 flex-shrink-0" size={18} />
                          )}
                          <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                            {feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Manzara */}
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flexCenter">
                      <BsEye className="text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-tertiary">Manzara</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {MANZARA_FEATURES.map((feature, index) => {
                      const hasFeature = data?.manzaraFeatures?.includes(feature);
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 text-sm ${
                            !hasFeature ? "opacity-50" : ""
                          }`}
                        >
                          {hasFeature ? (
                            <MdCheck className="text-green-500 flex-shrink-0" size={18} />
                          ) : (
                            <MdClose className="text-red-400 flex-shrink-0" size={18} />
                          )}
                          <span className={hasFeature ? "text-gray-700 font-medium" : "text-gray-400"}>
                            {feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          <InquirySidebarCard
            propertyId={id}
            propertyTitle={data?.title}
            listingNo={data?.listingNo || ""}
            locationLabel={
              [data?.city, districtHint].filter(Boolean).join(" / ") ||
              [data?.address, data?.city, data?.country].filter(Boolean).join(", ")
            }
            consultantId={data?.consultant?.id || data?.consultantId || ""}
            subjectPrefix="Property Inquiry"
          />

          {/* Consultant Contact Section */}
          {data?.consultant && (
            <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white/10 flexCenter">
                  <FaPhone className="text-white text-sm" />
                </div>
                <h4 className="font-semibold text-base">{t('propertyDetails.contactConsultant')}</h4>
              </div>

              <div className="flex items-center gap-4 mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Avatar
                  src={data.consultant.image}
                  alt={data.consultant.name}
                  size="lg"
                  radius="xl"
                  className="border-2 border-secondary"
                />
                <div className="flex-1">
                  <h5 className="font-semibold flex items-center gap-2">
                    {data.consultant.name}
                    <MdVerified className="text-secondary" />
                  </h5>
                  <p className="text-white/70 text-sm">
                    {data.consultant.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
                      <FaStar className="text-amber-400 text-xs" />
                      <span className="text-xs font-medium">
                        {data.consultant.rating}
                      </span>
                    </div>
                    <span className="text-white/50 text-xs">•</span>
                    <span className="text-white/70 text-xs">
                      {data.consultant.deals}+ {t('propertyDetails.deals')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consultant Specialty */}
              <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-white/60 text-xs mb-1">{t('propertyDetails.specialty')}</p>
                <p className="text-sm">{data.consultant.specialty}</p>
              </div>

              {/* Contact Buttons */}
              <div className="space-y-2">
                <PhoneLink
                  phone={data?.consultant?.phone}
                  className="flexCenter gap-2 rounded-2xl bg-white py-3 text-sm font-medium text-tertiary w-full select-text"
                >
                  <FaPhone className="text-secondary" />
                  <span dir="ltr">{data.consultant.phone}</span>
                </PhoneLink>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flexCenter gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-medium text-white transition-colors hover:bg-[#20bd5a] w-full"
                >
                  <FaWhatsapp />
                  WhatsApp
                </a>
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="flexCenter gap-2 rounded-2xl bg-white py-3 text-sm font-medium text-tertiary transition-colors hover:bg-gray-100 w-full"
                  >
                    <FaEnvelope className="text-secondary" />
                    Email
                </button>
              </div>

              {/* Languages */}
              {data.consultant.languages?.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-white/60 text-xs mb-2">{t('propertyDetails.languages')}</p>
                  <div className="flex flex-wrap gap-2">
                    {data.consultant.languages.map((lang) => (
                      <span
                        key={lang}
                        className="bg-secondary/20 text-secondary px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Contact Modal - Only opens after booking */}
      <ContactModal
        opened={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        propertyId={id}
        propertyTitle={data?.title}
        listingNo={data?.listingNo}
        userEmail={user?.email}
        consultantId={data?.consultant?.id || data?.consultantId}
      />
    </section>
  );
};

export default Property;
