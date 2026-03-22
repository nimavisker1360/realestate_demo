import { useState, useEffect, useContext } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Button,
  Group,
  Select,
  SegmentedControl,
  Text,
  Loader,
  Avatar,
  Checkbox,
  ScrollArea,
  Collapse,
  Grid,
  Switch,
  Divider,
  Paper,
  Tabs,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MdSell,
  MdOutlineCloudUpload,
  MdPerson,
  MdExpandMore,
  MdExpandLess,
  MdLocationCity,
  MdPublic,
  MdDragIndicator,
  MdVideocam,
  MdPlayCircleOutline,
} from "react-icons/md";
import { AiOutlineClose } from "react-icons/ai";
import { BsHouseDoor, BsTree, BsLightningCharge, BsGeoAlt, BsGrid, BsEye, BsBuilding, BsShield, BsPeople } from "react-icons/bs";
import { FaLandmark, FaHome, FaBriefcase, FaWheelchair, FaShoppingCart } from "react-icons/fa";
import { pickAndUploadImages, pickAndUploadVideos } from "../utils/blobUpload";
import UploadProgressBar from "./UploadProgressBar";

// Sortable Image Component
const SortableImage = ({ url, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative h-24 rounded-lg overflow-hidden group ${isDragging ? 'shadow-xl' : ''}`}
    >
      <img
        src={url}
        alt={`property-${index + 1}`}
        className="h-full w-full object-cover"
      />
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 bg-black/50 text-white rounded p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MdDragIndicator size={14} />
      </div>
      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <AiOutlineClose size={12} />
      </button>
      {/* Main Image Badge */}
      {index === 0 && (
        <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-[10px] px-1 py-0.5 rounded">
          Ana
        </span>
      )}
    </div>
  );
};

// Property categories
const propertyCategories = [
  { value: "residential", label: "Konut", icon: FaHome },
  { value: "villa", label: "Vila", icon: FaHome },
  { value: "commercial", label: "Ticari", icon: FaBriefcase },
  { value: "land", label: "Arsa", icon: FaLandmark },
];

// Turkish real estate options
const heatingOptions = [
  { value: "merkezi", label: "Merkezi" },
  { value: "merkezi-pay-olcer", label: "Merkezi (Pay Ölçer)" },
  { value: "dogalgaz-kombi", label: "Doğalgaz (Kombi)" },
  { value: "dogalgaz-soba", label: "Doğalgaz (Soba)" },
  { value: "klima", label: "Klima" },
  { value: "soba", label: "Soba" },
  { value: "yerden-isitma", label: "Yerden Isıtma" },
  { value: "yok", label: "Yok" },
];

const kitchenOptions = [
  { value: "acik-amerikan", label: "Açık (Amerikan)" },
  { value: "kapali", label: "Kapalı" },
  { value: "laminat", label: "Laminat" },
  { value: "hilton", label: "Hilton" },
];

const parkingOptions = [
  { value: "kapali-otopark", label: "Kapalı Otopark" },
  { value: "acik-otopark", label: "Açık Otopark" },
  { value: "otopark-yok", label: "Otopark Yok" },
];

const usageStatusOptions = [
  { value: "bos", label: "Boş" },
  { value: "kiraci", label: "Kiracı" },
  { value: "mulk-sahibi", label: "Mülk Sahibi" },
];


// İmar Durumu (Zoning Status) options
const imarDurumuOptions = [
  { value: "villa", label: "Villa" },
  { value: "konut", label: "Konut" },
  { value: "ticari", label: "Ticari" },
  { value: "arsa", label: "Arsa" },
  { value: "karma", label: "Karma" },
  { value: "sanayi", label: "Sanayi" },
  { value: "turizm", label: "Turizm" },
  { value: "tarimsal", label: "Tarımsal" },
];

const normalizeListingStatus = (value) => {
  const normalized = String(value || "").toLowerCase().trim();
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
      "under-construction",
      "under construction",
      "insaat-halinde",
      "insaat halinde",
    ].includes(normalized)
  ) {
    return "offplan";
  }
  return "";
};

const listingStatusFromProjectStatus = (value) => {
  const normalized = String(value || "").toLowerCase().trim();
  if (["tamamlandi", "completed", "ready"].includes(normalized)) {
    return "ready";
  }
  if (
    ["devam-ediyor", "devam ediyor", "under construction", "off-plan", "offplan"].includes(
      normalized
    )
  ) {
    return "offplan";
  }
  return "";
};

const projectStatusFromListingStatus = (value) =>
  value === "ready" ? "tamamlandi" : "devam-ediyor";

const roomOptions = [
  { value: "1+0", label: "1+0 (Stüdyo)" },
  { value: "1+1", label: "1+1" },
  { value: "2+1", label: "2+1" },
  { value: "2+2", label: "2+2" },
  { value: "3+1", label: "3+1" },
  { value: "3+2", label: "3+2" },
  { value: "4+1", label: "4+1" },
  { value: "4+2", label: "4+2" },
  { value: "5+1", label: "5+1" },
  { value: "5+2", label: "5+2" },
  { value: "6+1", label: "6+1" },
  { value: "6+2", label: "6+2" },
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

// Project-specific feature categories
const PROJE_BINA_OZELLIKLERI = [
  "Akıllı Ev",
  "Alarm (Yangın)",
  "Intercom Sistemi",
  "Kablo TV",
  "Jeneratör",
  "Ses Yalıtımı",
  "Su Deposu",
];

const PROJE_DIS_OZELLIKLER = [
  "Bahçe / Garden",
  "Buhar Odası / Steam Room",
  "Sauna",
  "Türk Hamamı / Turkish Bath",
  "SPA",
  "Otopark / Parking",
  "Havuz / Pool",
  "Gym",
  "Çocuk Parkı / Children's Playground",
  "Spor Alanı / Sports Area",
  "Basketbol Sahası / Basketball Court",
  "Futbol Sahası / Football Court",
  "Peyzaj / Landscaping",
];

const PROJE_ENGELLI_YASLI_UYGUN = [
  "Engelli Asansörü",
  "Engelli Rampası",
  "Engelli WC",
  "Yaşlı Dostu Tasarım",
  "Görme Engelli Yardımcıları",
];

const PROJE_EGLENCE_ALISVERIS = [
  "AVM / Shopping Mall",
  "Restoran / Restaurant",
  "Cafe",
  "Sinema / Cinema",
  "Fitness Salonu / Gym",
  "Çocuk Kulübü / Kids Club",
];

const PROJE_GUVENLIK = [
  "24 Saat Güvenlik",
  "Güvenlik Kamerası",
  "Kartlı Giriş Sistemi",
  "Yangın Merdiveni",
  "Yangın Söndürme Sistemi",
];

const PROJE_MANZARA = [
  "Şehir Manzarası",
  "Deniz Manzarası",
  "Göl Manzarası",
  "Orman Manzarası",
  "Havuz Manzarası",
  "Bahçe Manzarası",
];

const PROJE_MUHIT = [
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
  "Buhar Odası",
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
import { toast } from "react-toastify";
import { bilingualFromMessage, bilingualKey } from "../utils/bilingualToast";
import { useMutation } from "react-query";
import PropTypes from "prop-types";
import useCountries from "../hooks/useCountries";
import useConsultants from "../hooks/useConsultants";
import UserDetailContext from "../context/UserDetailContext";
import CurrencyContext from "../context/CurrencyContext";
import { updateResidency } from "../utils/api";
import { validateString } from "../utils/common";

const FIAT_CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "\u20AC" },
  { code: "GBP", symbol: "\u00A3" },
  { code: "TRY", symbol: "\u20BA" },
];

const FIAT_CURRENCY_CODES = FIAT_CURRENCIES.map((currency) => currency.code);

const FIAT_SYMBOLS = FIAT_CURRENCIES.reduce((acc, currency) => {
  acc[currency.code] = currency.symbol;
  return acc;
}, {});

const normalizeFiatCurrency = (currencyCode) => {
  const defaultFromEnv = String(
    import.meta.env.VITE_DEFAULT_FIAT_CURRENCY || "USD"
  ).toUpperCase();
  const fallback = FIAT_CURRENCY_CODES.includes(defaultFromEnv)
    ? defaultFromEnv
    : "USD";
  const normalized = String(currencyCode || "").toUpperCase();
  return FIAT_CURRENCY_CODES.includes(normalized) ? normalized : fallback;
};

const FLOOR_PLAN_PRICE_FIELDS = {
  USD: "fiyatUSD",
  EUR: "fiyatEUR",
  GBP: "fiyatGBP",
  TRY: "fiyatTRY",
};

const hasOwnField = (obj, field) =>
  Object.prototype.hasOwnProperty.call(obj || {}, field);

const toRoundedPrice = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return Math.round(numericValue);
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

const createSpecialOfferDraft = (overrides = {}) => {
  const downPayment = Number(
    overrides.downPaymentAmount ?? overrides.downPaymentPercent
  ) || 0;

  return {
    id: overrides.id || Date.now() + Math.floor(Math.random() * 100000),
    enabled: Boolean(overrides.enabled ?? true),
    title: String(overrides.title || ""),
    roomType: String(overrides.roomType || ""),
    areaM2: Number(overrides.areaM2) || 0,
    priceGBP: toRoundedPrice(overrides.priceGBP || overrides.priceUSD),
    downPaymentPercent: downPayment,
    downPaymentAmount: downPayment,
    installmentMonths: Number(overrides.installmentMonths) || 0,
    locationLabel: String(overrides.locationLabel || ""),
    locationMinutes: Number(overrides.locationMinutes) || 0,
  };
};

const getInitialSpecialOffers = (property = {}) => {
  const specialOffers = Array.isArray(property.projeHakkinda?.specialOffers)
    ? property.projeHakkinda.specialOffers
        .filter((offer) => offer && typeof offer === "object")
        .map((offer) => createSpecialOfferDraft(offer))
    : [];

  if (specialOffers.length > 0) return specialOffers;

  if (hasSpecialOfferData(property.projeHakkinda?.specialOffer)) {
    return [createSpecialOfferDraft(property.projeHakkinda.specialOffer)];
  }

  return [
    createSpecialOfferDraft({
      title: property.projectName || "",
      roomType: property.dairePlanlari?.[0]?.tip || "",
      areaM2: Number(property.dairePlanlari?.[0]?.metrekare || 0),
      priceGBP: toRoundedPrice(
        property.dairePlanlari?.[0]?.fiyatGBP ||
          property.dairePlanlari?.[0]?.fiyatUSD ||
          property.dairePlanlari?.[0]?.fiyat ||
          0
      ),
    }),
  ];
};

const hasAnySpecialOfferData = (specialOffers = []) =>
  Array.isArray(specialOffers) &&
  specialOffers.some((offer) => hasSpecialOfferData(offer));

const filterAllowedFeatures = (selected = [], allowed = []) => {
  const allowedSet = new Set(allowed);
  return (Array.isArray(selected) ? selected : []).filter((feature) =>
    allowedSet.has(feature)
  );
};

const formatUsdAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const EditPropertyModal = ({ opened, setOpened, property, onSuccess }) => {
  const { getAll } = useCountries();
  const { data: consultants, isLoading: consultantsLoading } = useConsultants();
  const {
    userDetails: { token },
  } = useContext(UserDetailContext);
  const { convertAmount } = useContext(CurrencyContext);

  const [imageURLs, setImageURLs] = useState([]);
  const [videoURLs, setVideoURLs] = useState([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState("");
  const [interiorFeatures, setInteriorFeatures] = useState([]);
  const [exteriorFeatures, setExteriorFeatures] = useState([]);
  const [muhitFeatures, setMuhitFeatures] = useState([]);
  const [interiorOpened, { toggle: toggleInterior }] = useDisclosure(false);
  const [exteriorOpened, { toggle: toggleExterior }] = useDisclosure(false);
  const [muhitOpened, { toggle: toggleMuhit }] = useDisclosure(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Turkish real estate fields state
  const [listingNo, setListingNo] = useState("");
  const [listingDate, setListingDate] = useState(null);
  const [areaGross, setAreaGross] = useState(0);
  const [areaNet, setAreaNet] = useState(0);
  const [rooms, setRooms] = useState("");
  const [buildingAge, setBuildingAge] = useState(0);
  const [floor, setFloor] = useState(0);
  const [totalFloors, setTotalFloors] = useState(0);
  const [heating, setHeating] = useState("");
  const [kitchen, setKitchen] = useState("");
  const [balcony, setBalcony] = useState(false);
  const [elevator, setElevator] = useState(false);
  const [parkingType, setParkingType] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [usageStatus, setUsageStatus] = useState("");
  const [siteName, setSiteName] = useState("");
  const [dues, setDues] = useState(0);
  const [mortgageEligible, setMortgageEligible] = useState(false);
  const [deedStatus, setDeedStatus] = useState("");
  const [imarDurumu, setImarDurumu] = useState("");
  
  // Land/Arsa features
  const [altyapiFeatures, setAltyapiFeatures] = useState([]);
  const [konumFeatures, setKonumFeatures] = useState([]);
  const [genelOzellikler, setGenelOzellikler] = useState([]);
  const [manzaraFeatures, setManzaraFeatures] = useState([]);

  // Project-specific fields (Yurt İçi Proje)
  const [projectName, setProjectName] = useState("");
  const [ilanNo, setIlanNo] = useState("");
  const [kampanya, setKampanya] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [projectStatus, setProjectStatus] = useState("devam-ediyor");
  const [listingStatus, setListingStatus] = useState("offplan");
  const [gyo, setGyo] = useState(false);
  const [brochureUrl, setBrochureUrl] = useState("");
  const [mapImage, setMapImage] = useState("");
  const [specialOffers, setSpecialOffers] = useState([]);
  const [isSpecialOfferEnabled, setIsSpecialOfferEnabled] = useState(false);
  
  // Project-specific features
  const [projeBinaOzellikleri, setProjeBinaOzellikleri] = useState([]);
  const [projeDisOzellikler, setProjeDisOzellikler] = useState([]);
  const [projeEngelliYasliUygun, setProjeEngelliYasliUygun] = useState([]);
  const [projeEglenceAlisveris, setProjeEglenceAlisveris] = useState([]);
  const [projeGuvenlik, setProjeGuvenlik] = useState([]);
  const [projeManzara, setProjeManzara] = useState([]);
  const [projeMuhit, setProjeMuhit] = useState([]);
  
  const [projeHakkinda, setProjeHakkinda] = useState({
    projeAlani: 0,
    yesilAlan: 0,
    konutSayisi: 0,
    description: "",
    description_tr: "",
    description_en: "",
    description_ru: "",
  });
  const [dairePlanlari, setDairePlanlari] = useState([]);
  const [vaziyetPlani, setVaziyetPlani] = useState("");
  const [iletisim, setIletisim] = useState({
    telefonlar: [""],
    satisOfisiAdresi: "",
    webSitesi: "",
    calismaSaatleri: {
      pazartesi: "08:30 - 18:30",
      sali: "08:30 - 18:30",
      carsamba: "08:30 - 18:30",
      persembe: "08:30 - 18:30",
      cuma: "08:30 - 18:30",
      cumartesi: "09:30 - 17:30",
      pazar: "Kapalı",
    },
  });
  const [ozellikler, setOzellikler] = useState({
    binaOzellikleri: [],
    disOzellikler: [],
    engelliYasliUygun: [],
    eglenceAlisveris: [],
    guvenlik: [],
    manzara: [],
    muhit: [],
  });

  const [vaziyetPlaniUploading, setVaziyetPlaniUploading] = useState(false);
  const [mapImageUploading, setMapImageUploading] = useState(false);
  const [floorPlanUploading, setFloorPlanUploading] = useState(null);

  const form = useForm({
    initialValues: {
      title: "",
      description: "",
      description_en: "",
      description_tr: "",
      description_ru: "",
      price: 0,
      currency: normalizeFiatCurrency(),
      country: "",
      city: "",
      address: "",
      propertyType: "sale",
      category: "residential",
      bedrooms: 0,
      parkings: 0,
      bathrooms: 0,
    },
    validate: {
      title: (value, values) => values.propertyType === "sale" ? validateString(value) : null,
      description_tr: (value, values) => values.propertyType === "sale" ? validateString(value) : null,
      price: (value, values) => values.propertyType === "sale" ? (value < 999 ? "En az 999 olmalı" : null) : null,
      country: (value, values) => values.propertyType === "sale" ? validateString(value) : null,
      city: (value, values) => values.propertyType === "sale" ? validateString(value) : null,
      address: (value, values) => values.propertyType === "sale" ? validateString(value) : null,
      // bedrooms and bathrooms are optional
    },
  });

  const floorPlanBaseCurrency = normalizeFiatCurrency(
    property?.currency || form.values.currency
  );

  const getFloorPlanPriceByCurrency = (plan, targetCurrency) => {
    const fieldKey = FLOOR_PLAN_PRICE_FIELDS[targetCurrency];
    if (hasOwnField(plan, fieldKey)) {
      return toRoundedPrice(plan[fieldKey]);
    }

    const legacyPrice = toRoundedPrice(plan?.fiyat);
    if (!legacyPrice) return 0;

    const sourceCurrency = normalizeFiatCurrency(
      plan?.currency || floorPlanBaseCurrency
    );
    return toRoundedPrice(
      convertAmount(legacyPrice, sourceCurrency, targetCurrency)
    );
  };

  const updateFloorPlanPrices = (index, sourceCurrency, value) => {
    setDairePlanlari((prevPlans) => {
      const nextPlans = [...prevPlans];
      const currentPlan = { ...(nextPlans[index] || {}) };
      const sourceValue = toRoundedPrice(value);

      FIAT_CURRENCY_CODES.forEach((currencyCode) => {
        const fieldKey = FLOOR_PLAN_PRICE_FIELDS[currencyCode];
        const convertedValue =
          currencyCode === sourceCurrency
            ? sourceValue
            : convertAmount(sourceValue, sourceCurrency, currencyCode);
        currentPlan[fieldKey] = toRoundedPrice(convertedValue);
      });

      const baseFieldKey = FLOOR_PLAN_PRICE_FIELDS[floorPlanBaseCurrency];
      currentPlan.fiyat = toRoundedPrice(currentPlan[baseFieldKey]);
      currentPlan.currency = floorPlanBaseCurrency;
      nextPlans[index] = currentPlan;

      return nextPlans;
    });
  };

  // Prepare consultant options for select
  const consultantOptions =
    consultants?.map((c) => ({
      value: c.id,
      label: c.name,
      image: c.image,
      title: c.title,
    })) || [];

  // Initialize form when property changes
  useEffect(() => {
    if (property) {
      form.setValues({
        title: property.title || "",
        description: property.description || "",
        description_en: property.description_en || "",
        description_tr: property.description_tr || property.description || "",
        description_ru: property.description_ru || "",
        price: property.price || 0,
        currency: normalizeFiatCurrency(property.currency),
        country: property.country || "",
        city: property.city || "",
        address: property.address || "",
        propertyType: ["sale", "local-project", "international-project"].includes(
          property.propertyType
        )
          ? property.propertyType
          : "local-project",
        category: property.category || "residential",
        bedrooms: property.facilities?.bedrooms || 0,
        parkings: property.facilities?.parkings || 0,
        bathrooms: property.facilities?.bathrooms || 0,
      });
      setImageURLs(property.images || (property.image ? [property.image] : []));
      setVideoURLs(property.videos || []);
      setSelectedConsultantId(property.consultantId || "");
      setInteriorFeatures(
        filterAllowedFeatures(property.interiorFeatures, ALL_INTERIOR_FEATURES)
      );
      setExteriorFeatures(
        filterAllowedFeatures(property.exteriorFeatures, ALL_EXTERIOR_FEATURES)
      );
      setMuhitFeatures(
        filterAllowedFeatures(property.muhitFeatures, MUHIT_FEATURES)
      );
      
      // Turkish real estate fields
      setListingNo(property.listingNo || "");
      setListingDate(property.listingDate ? new Date(property.listingDate) : null);
      setAreaGross(property.area?.gross || 0);
      setAreaNet(property.area?.net || 0);
      setRooms(property.rooms || "");
      setBuildingAge(property.buildingAge || 0);
      setFloor(property.floor || 0);
      setTotalFloors(property.totalFloors || 0);
      setHeating(property.heating || "");
      setKitchen(property.kitchen || "");
      setBalcony(property.balcony || false);
      setElevator(property.elevator || false);
      setParkingType(property.parking || "");
      setFurnished(property.furnished || false);
      setUsageStatus(property.usageStatus || "");
      setSiteName(property.siteName || "");
      setDues(property.dues || 0);
      setMortgageEligible(property.mortgageEligible || false);
      setDeedStatus(property.deedStatus || "");
      setImarDurumu(property.imarDurumu || "");
      
      // Land/Arsa features
      setAltyapiFeatures(property.altyapiFeatures || []);
      setKonumFeatures(property.konumFeatures || []);
      setGenelOzellikler(property.genelOzellikler || []);
      setManzaraFeatures(property.manzaraFeatures || []);

      // Project-specific fields
      setProjectName(property.projectName || "");
      setIlanNo(property.ilanNo || "");
      setKampanya(property.kampanya || "");
      setDeliveryDate(property.deliveryDate || "");
      setProjectStatus(property.projectStatus || "devam-ediyor");
      setListingStatus(
        normalizeListingStatus(property.listingStatus) ||
          (property.propertyType === "sale"
            ? "ready"
            : listingStatusFromProjectStatus(property.projectStatus) || "offplan")
      );
      setGyo(Boolean(property.gyo));
      setBrochureUrl(property.brochureUrl || "");
      setMapImage(property.mapImage || "");
      setSpecialOffers(getInitialSpecialOffers(property));
      setIsSpecialOfferEnabled(
        hasAnySpecialOfferData(property.projeHakkinda?.specialOffers) ||
        hasSpecialOfferData(property.projeHakkinda?.specialOffer)
      );
      
      // Project-specific features
      setProjeBinaOzellikleri(
        filterAllowedFeatures(
          property.projeBinaOzellikleri || property.binaOzellikleri,
          PROJE_BINA_OZELLIKLERI
        )
      );
      setProjeDisOzellikler(
        filterAllowedFeatures(
          property.projeDisOzellikler || property.disOzellikler,
          PROJE_DIS_OZELLIKLER
        )
      );
      setProjeEngelliYasliUygun(
        filterAllowedFeatures(
          property.projeEngelliYasliUygun || property.engelliYasliUygun,
          PROJE_ENGELLI_YASLI_UYGUN
        )
      );
      setProjeEglenceAlisveris(
        filterAllowedFeatures(
          property.projeEglenceAlisveris || property.eglenceAlisveris,
          PROJE_EGLENCE_ALISVERIS
        )
      );
      setProjeGuvenlik(
        filterAllowedFeatures(
          property.projeGuvenlik || property.guvenlik,
          PROJE_GUVENLIK
        )
      );
      setProjeManzara(
        filterAllowedFeatures(
          property.projeManzara || property.manzara,
          PROJE_MANZARA
        )
      );
      setProjeMuhit(
        filterAllowedFeatures(
          property.projeMuhit || property.muhit,
          PROJE_MUHIT
        )
      );
      
      setProjeHakkinda({
        ...(property.projeHakkinda || {}),
        projeAlani: property.projeHakkinda?.projeAlani || 0,
        yesilAlan: property.projeHakkinda?.yesilAlan || 0,
        konutSayisi: property.projeHakkinda?.konutSayisi || 0,
        description: property.projeHakkinda?.description || "",
        description_tr: property.projeHakkinda?.description_tr || property.projeHakkinda?.description || "",
        description_en: property.projeHakkinda?.description_en || "",
        description_ru: property.projeHakkinda?.description_ru || "",
      });
      setDairePlanlari(
        (property.dairePlanlari || []).map((plan) => ({
          ...plan,
          currency: normalizeFiatCurrency(
            plan?.currency || property?.currency || floorPlanBaseCurrency
          ),
        }))
      );
      setVaziyetPlani(property.vaziyetPlani || "");
      setIletisim(property.iletisim || {
        telefonlar: [""],
        satisOfisiAdresi: "",
        webSitesi: "",
        calismaSaatleri: {
          pazartesi: "08:30 - 18:30",
          sali: "08:30 - 18:30",
          carsamba: "08:30 - 18:30",
          persembe: "08:30 - 18:30",
          cuma: "08:30 - 18:30",
          cumartesi: "09:30 - 17:30",
          pazar: "Kapalı",
        },
      });
      setOzellikler(property.ozellikler || {
        binaOzellikleri: [],
        disOzellikler: [],
        engelliYasliUygun: [],
        eglenceAlisveris: [],
        guvenlik: [],
        manzara: [],
        muhit: [],
      });
    }
  }, [property]);

  const handleImageUpload = async () => {
    try {
      setMediaUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({
        multiple: true,
        onProgress: setUploadProgress,
      });
      if (urls.length) setImageURLs((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setMediaUploading(false);
      setUploadProgress(null);
    }
  };

  const handleVideoUpload = async () => {
    try {
      setMediaUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadVideos({
        multiple: true,
        onProgress: setUploadProgress,
      });
      if (urls.length) {
        setVideoURLs((prev) => [...prev, ...urls]);
      }
    } catch (err) {
      console.error("Video upload error:", err);
      toast.error("Video yüklenirken hata oluştu / خطا در آپلود ویدیو", {
        position: "bottom-right",
      });
    } finally {
      setMediaUploading(false);
      setUploadProgress(null);
    }
  };

  const openVaziyetPlaniUpload = async () => {
    try {
      setVaziyetPlaniUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({
        multiple: false,
        onProgress: setUploadProgress,
      });
      if (urls.length) setVaziyetPlani(urls[0]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setVaziyetPlaniUploading(false);
      setUploadProgress(null);
    }
  };

  const openMapImageUpload = async () => {
    try {
      setMapImageUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({
        multiple: false,
        onProgress: setUploadProgress,
      });
      if (urls.length) setMapImage(urls[0]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setMapImageUploading(false);
      setUploadProgress(null);
    }
  };

  const openFloorPlanUpload = async (index) => {
    try {
      setFloorPlanUploading(index);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({
        multiple: false,
        onProgress: setUploadProgress,
      });
      if (urls.length) {
        const updated = [...dairePlanlari];
        updated[index].image = urls[0];
        setDairePlanlari(updated);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setFloorPlanUploading(null);
      setUploadProgress(null);
    }
  };

  const removeImage = (indexToRemove) => {
    setImageURLs((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeVideo = (indexToRemove) => {
    setVideoURLs((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder images
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setImageURLs((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addSpecialOffer = () => {
    const firstOffer = specialOffers?.[0] || {};
    const newOffer = createSpecialOfferDraft({
      title: projectName || firstOffer.title || property?.projectName || "",
      roomType: firstOffer.roomType || dairePlanlari?.[0]?.tip || "",
      areaM2:
        Number(firstOffer.areaM2) ||
        Number(dairePlanlari?.[0]?.metrekare || 0),
      priceGBP:
        Number(firstOffer.priceGBP || firstOffer.priceUSD) ||
        toRoundedPrice(
          dairePlanlari?.[0]?.fiyatGBP || dairePlanlari?.[0]?.fiyatUSD || dairePlanlari?.[0]?.fiyat || 0
        ),
      downPaymentPercent: Number(firstOffer.downPaymentPercent || 0),
      installmentMonths: Number(firstOffer.installmentMonths || 0),
      locationLabel: "",
      locationMinutes: 0,
    });
    setSpecialOffers((prev) => [...(prev || []), newOffer]);
  };

  const removeSpecialOffer = (index) => {
    setSpecialOffers((prev) => (prev || []).filter((_, i) => i !== index));
  };

  const updateSpecialOfferField = (index, field, value) => {
    setSpecialOffers((prev) => {
      const next = [...(prev || [])];
      next[index] = {
        ...(next[index] || createSpecialOfferDraft()),
        [field]: value,
      };
      return next;
    });
  };

  const { mutate, isLoading } = useMutation({
    mutationFn: (data) => updateResidency(property.id, data, token),
    onError: (error) => {
      const message =
        error?.response?.data?.message || "Mülk güncellenirken hata oluştu";
      toast.error(bilingualFromMessage(message, "toast.propertyUpdateError"), {
        position: "bottom-right",
      });
    },
    onSuccess: () => {
      toast.success(bilingualKey("toast.propertyUpdatedSuccess"), {
        position: "bottom-right",
        autoClose: 3000,
      });
      // Refresh data without closing modal immediately
      if (onSuccess) onSuccess();
      // Close modal after a short delay to show toast
      setTimeout(() => {
        setOpened(false);
      }, 500);
    },
  });

  const handleSubmit = () => {
    const { hasErrors } = form.validate();
    if (hasErrors) return;

    const isProject =
      form.values.propertyType === "local-project" ||
      form.values.propertyType === "international-project";

    if (imageURLs.length === 0 && !isProject) {
      toast.error(bilingualKey("toast.imageRequired"), {
        position: "bottom-right",
      });
      return;
    }

    const values = form.values;
    const isProjectType =
      values.propertyType === "local-project" ||
      values.propertyType === "international-project";
    const normalizedListingStatus =
      normalizeListingStatus(listingStatus) ||
      (isProjectType
        ? listingStatusFromProjectStatus(projectStatus) || "offplan"
        : "ready");
    const isSpecialOfferType = isProjectType && isSpecialOfferEnabled;
    const normalizedCurrency = normalizeFiatCurrency(values.currency);
    const normalizedPrice = Math.round(Number(values.price || 0));
    const normalizedSpecialOffers = (specialOffers || [])
      .map((offer) => {
        const downPaymentValue = Number(
          offer?.downPaymentAmount ?? offer?.downPaymentPercent
        ) || 0;
        return {
          ...createSpecialOfferDraft(offer),
          enabled: true,
          title: String(offer?.title || projectName || "").trim(),
          roomType: String(offer?.roomType || "").trim(),
          areaM2: Number(offer?.areaM2) || 0,
          priceGBP: toRoundedPrice(offer?.priceGBP || offer?.priceUSD),
          downPaymentPercent: downPaymentValue,
          downPaymentAmount: downPaymentValue,
          installmentMonths: Number(offer?.installmentMonths) || 0,
          locationLabel: String(offer?.locationLabel || "").trim(),
          locationMinutes: Number(offer?.locationMinutes) || 0,
        };
      })
      .filter((offer) => hasSpecialOfferData(offer));

    const primarySpecialOffer = normalizedSpecialOffers[0] || null;
    const specialOfferTitleValue = String(primarySpecialOffer?.title || "").trim();
    const specialOfferRoomTypeValue = String(
      primarySpecialOffer?.roomType || ""
    ).trim();
    const specialOfferAreaValue = Number(primarySpecialOffer?.areaM2 || 0);
    const specialOfferPriceValue = toRoundedPrice(primarySpecialOffer?.priceGBP || primarySpecialOffer?.priceUSD);
    const specialOfferDownPaymentValue = Number(
      primarySpecialOffer?.downPaymentPercent || 0
    );
    const specialOfferInstallmentValue = Number(
      primarySpecialOffer?.installmentMonths || 0
    );
    const specialOfferLocationLabelValue = String(
      primarySpecialOffer?.locationLabel || ""
    ).trim();
    const specialOfferLocationMinutesValue = Number(
      primarySpecialOffer?.locationMinutes || 0
    );

    const nextDairePlanlari = [...dairePlanlari];

    const generatedCampaign = [];
    if (specialOfferDownPaymentValue > 0) {
      generatedCampaign.push(
        `${formatUsdAmount(specialOfferDownPaymentValue)} down payment`
      );
    }
    if (specialOfferInstallmentValue > 0) {
      generatedCampaign.push(
        `${specialOfferInstallmentValue} months installments`
      );
    }
    const generatedCampaignText = generatedCampaign.join(" - ");

    const nextProjeHakkinda = isProjectType
      ? {
          ...projeHakkinda,
          specialOffer: isSpecialOfferType && primarySpecialOffer
            ? {
                enabled: true,
                title: specialOfferTitleValue,
                roomType: specialOfferRoomTypeValue,
                areaM2: specialOfferAreaValue,
                priceGBP: specialOfferPriceValue,
                downPaymentPercent: specialOfferDownPaymentValue,
                downPaymentAmount: specialOfferDownPaymentValue,
                installmentMonths: specialOfferInstallmentValue,
                locationLabel: specialOfferLocationLabelValue,
                locationMinutes: specialOfferLocationMinutesValue,
              }
            : null,
          specialOffers: isSpecialOfferType ? normalizedSpecialOffers : [],
        }
      : null;

    const data = {
      // For projects, keep existing values; for sale, use form values
      title: isProject
        ? property?.title || values.title
        : values.title,
      description: isProject
        ? (
            projeHakkinda?.description_tr ||
            projeHakkinda?.description_en ||
            projeHakkinda?.description_ru ||
            projeHakkinda?.description ||
            property?.description
          )
        : (values.description_tr || values.description_en || values.description_ru || values.description),
      description_en: isProject
        ? (projeHakkinda?.description_en || property?.description_en)
        : values.description_en,
      description_tr: isProject
        ? (projeHakkinda?.description_tr || projeHakkinda?.description || property?.description_tr)
        : values.description_tr,
      description_ru: isProject
        ? (projeHakkinda?.description_ru || property?.description_ru)
        : values.description_ru,
      price: isProject
        ? property?.price || 0
        : normalizedPrice,
      currency: isProject
        ? normalizeFiatCurrency(property?.currency || normalizedCurrency)
        : normalizedCurrency,
      country: isProject ? (property?.country || "Turkey TR") : values.country,
      city: isProject ? (property?.city || "") : values.city,
      address: isProject ? (property?.address || "") : values.address,
      propertyType: values.propertyType,
      category: isProject ? (property?.category || "residential") : values.category,
      image: imageURLs[0] || property?.image,
      images: imageURLs.length > 0 ? imageURLs : (property?.images || []),
      videos: videoURLs.length > 0 ? videoURLs : (property?.videos || []),
      facilities: {
        bedrooms: values.bedrooms || 0,
        parkings: values.parkings || 0,
        bathrooms: values.bathrooms || 0,
      },
      consultantId: selectedConsultantId || null,
      interiorFeatures: isProject
        ? filterAllowedFeatures(property?.interiorFeatures, ALL_INTERIOR_FEATURES)
        : filterAllowedFeatures(interiorFeatures, ALL_INTERIOR_FEATURES),
      exteriorFeatures: isProject
        ? filterAllowedFeatures(property?.exteriorFeatures, ALL_EXTERIOR_FEATURES)
        : filterAllowedFeatures(exteriorFeatures, ALL_EXTERIOR_FEATURES),
      muhitFeatures: isProject
        ? filterAllowedFeatures(property?.muhitFeatures, MUHIT_FEATURES)
        : filterAllowedFeatures(muhitFeatures, MUHIT_FEATURES),
      // Turkish real estate fields (only for sale)
      listingNo: isProject ? (property?.listingNo || "") : listingNo,
      listingDate: isProject ? property?.listingDate : listingDate,
      area: isProject ? (property?.area || { gross: 0, net: 0 }) : { gross: areaGross, net: areaNet },
      rooms: isProject ? (property?.rooms || "") : rooms,
      buildingAge: isProject ? (property?.buildingAge || 0) : buildingAge,
      floor: isProject ? (property?.floor || 0) : floor,
      totalFloors: isProject ? (property?.totalFloors || 0) : totalFloors,
      heating: isProject ? (property?.heating || "") : heating,
      kitchen: isProject ? (property?.kitchen || "") : kitchen,
      balcony: isProject ? (property?.balcony || false) : balcony,
      elevator: isProject ? (property?.elevator || false) : elevator,
      parking: isProject ? (property?.parking || "") : parkingType,
      furnished: isProject ? (property?.furnished || false) : furnished,
      usageStatus: isProject ? (property?.usageStatus || "") : usageStatus,
      siteName: isProject ? (property?.siteName || "") : siteName,
      dues: isProject ? (property?.dues || 0) : dues,
      mortgageEligible: isProject ? (property?.mortgageEligible || false) : mortgageEligible,
      deedStatus: isProject ? (property?.deedStatus || "") : deedStatus,
      imarDurumu: isProject ? (property?.imarDurumu || "") : imarDurumu,
      // Land/Arsa features (only for sale)
      altyapiFeatures: isProject ? (property?.altyapiFeatures || []) : altyapiFeatures,
      konumFeatures: isProject ? (property?.konumFeatures || []) : konumFeatures,
      genelOzellikler: isProject ? (property?.genelOzellikler || []) : genelOzellikler,
      manzaraFeatures: isProject ? (property?.manzaraFeatures || []) : manzaraFeatures,
      // Project-specific fields
      projectName: isProjectType
        ? projectName
        : "",
      ilanNo: isProjectType ? ilanNo : "",
      kampanya: isProjectType
        ? (kampanya || (isSpecialOfferType ? generatedCampaignText : ""))
        : "",
      deliveryDate: isProjectType ? deliveryDate : "",
      projectStatus: isProjectType ? projectStatus : "",
      listingStatus: normalizedListingStatus,
      gyo: isProjectType ? gyo : false,
      brochureUrl: isProjectType ? brochureUrl : "",
      mapImage: isProjectType ? mapImage : "",
      projeHakkinda: nextProjeHakkinda,
      dairePlanlari: isProjectType ? nextDairePlanlari : [],
      vaziyetPlani: isProjectType ? vaziyetPlani : "",
      iletisim: isProjectType ? iletisim : null,
      ozellikler: isProjectType ? ozellikler : null,
      // Project-specific features (Özellikler tabs)
      binaOzellikleri: isProject
        ? filterAllowedFeatures(projeBinaOzellikleri, PROJE_BINA_OZELLIKLERI)
        : [],
      disOzellikler: isProject
        ? filterAllowedFeatures(projeDisOzellikler, PROJE_DIS_OZELLIKLER)
        : [],
      engelliYasliUygun: isProject
        ? filterAllowedFeatures(
            projeEngelliYasliUygun,
            PROJE_ENGELLI_YASLI_UYGUN
          )
        : [],
      eglenceAlisveris: isProject
        ? filterAllowedFeatures(
            projeEglenceAlisveris,
            PROJE_EGLENCE_ALISVERIS
          )
        : [],
      guvenlik: isProject
        ? filterAllowedFeatures(projeGuvenlik, PROJE_GUVENLIK)
        : [],
      manzara: isProject
        ? filterAllowedFeatures(projeManzara, PROJE_MANZARA)
        : [],
      muhit: isProject
        ? filterAllowedFeatures(projeMuhit, PROJE_MUHIT)
        : [],
    };

    mutate(data);
  };

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={
        <Text fw={600} size="lg">
          Mülkü Düzenle
        </Text>
      }
      size="90rem"
      centered
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* Property Type */}
        <div className="mb-4">
          <Text size="sm" fw={500} mb={4}>
            Emlak Tipi <span className="text-red-500">*</span>
          </Text>
          <SegmentedControl
            fullWidth
            color={form.values.propertyType === "sale" ? "green" : "blue"}
            value={form.values.propertyType}
            onChange={(value) => form.setFieldValue("propertyType", value)}
            data={[
              {
                label: (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <MdSell size={18} />
                    <span>Satılık</span>
                  </div>
                ),
                value: "sale",
              },
              {
                label: (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <MdLocationCity size={18} />
                    <span>Yurt İçi Proje</span>
                  </div>
                ),
                value: "local-project",
              },
              {
                label: (
                  <div className="flex items-center justify-center gap-2 py-1">
                    <MdPublic size={18} />
                    <span>Yurt Dışı Proje</span>
                  </div>
                ),
                value: "international-project",
              },
            ]}
          />
        </div>

        {/* Show these sections only for SALE properties */}
        {form.values.propertyType === "sale" && (
          <>
            {/* Property Category */}
            <Select
              label="Emlak Kategorisi"
              placeholder="Kategori seçin"
              data={propertyCategories.map((cat) => ({
                value: cat.value,
                label: cat.label,
              }))}
              value={form.values.category}
              onChange={(value) => form.setFieldValue("category", value)}
              mb="md"
              withAsterisk
              renderOption={({ option }) => {
                const cat = propertyCategories.find(
                  (c) => c.value === option.value
                );
                const IconComponent = cat?.icon || FaHome;
                return (
                  <div className="flex items-center gap-2 py-1">
                    <IconComponent size={16} />
                    <span>{option.label}</span>
                  </div>
                );
              }}
            />

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                withAsterisk
                label="Başlık"
                placeholder="Mülk adı"
                {...form.getInputProps("title")}
              />
              <div>
                <Text size="sm" fw={500} mb={4}>
                  Fiat <span className="text-red-500">*</span>
                </Text>
                <SegmentedControl
                  fullWidth
                  value={normalizeFiatCurrency(form.values.currency)}
                  onChange={(nextCurrency) => {
                    const currentCurrency = normalizeFiatCurrency(form.values.currency);
                    const currentPrice = Number(form.values.price || 0);
                    const converted = convertAmount(currentPrice, currentCurrency, nextCurrency);
                    const convertedPrice = Number.isFinite(converted) ? Math.round(converted) : 0;
                    form.setFieldValue("currency", nextCurrency);
                    form.setFieldValue("price", convertedPrice);
                  }}
                  data={FIAT_CURRENCIES.map(({ code, symbol }) => ({
                    value: code,
                    label: `${code} (${symbol})`,
                  }))}
                />
                <NumberInput
                  withAsterisk
                  mt="sm"
                  label={`Fiyat (${FIAT_SYMBOLS[normalizeFiatCurrency(form.values.currency)] || normalizeFiatCurrency(form.values.currency)})`}
                  placeholder="999"
                  min={0}
                  thousandSeparator="."
                  decimalSeparator=","
                  value={form.values.price}
                  onChange={(value) => {
                    const numericValue = Number(value);
                    form.setFieldValue("price", Number.isFinite(numericValue) ? numericValue : 0);
                  }}
                  error={form.errors.price}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {FIAT_CURRENCIES.map(({ code, symbol }) => {
                    const converted = convertAmount(
                      Number(form.values.price || 0),
                      normalizeFiatCurrency(form.values.currency),
                      code
                    );
                    const displayValue = Number.isFinite(converted)
                      ? Math.round(converted).toLocaleString("tr-TR")
                      : "0";
                    return (
                      <Text
                        key={code}
                        size="xs"
                        c={code === normalizeFiatCurrency(form.values.currency) ? "dark" : "dimmed"}
                        fw={code === normalizeFiatCurrency(form.values.currency) ? 600 : 400}
                      >
                        {code}: {displayValue} {symbol}
                      </Text>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bilingual Description */}
            <div className="mt-4">
              <Text size="sm" fw={500} mb={4}>
                Açıklama <span className="text-red-500">*</span>
              </Text>
              <Tabs defaultValue="tr" variant="outline">
                <Tabs.List>
                  <Tabs.Tab value="tr" leftSection={<span>🇹🇷</span>}>
                    Türkçe
                  </Tabs.Tab>
                  <Tabs.Tab value="en" leftSection={<span>🇬🇧</span>}>
                    English
                  </Tabs.Tab>
                  <Tabs.Tab value="ru" leftSection={<span>🇷🇺</span>}>
                    Russian
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="tr" pt="xs">
                  <Textarea
                    withAsterisk
                    placeholder="Türkçe mülk açıklaması"
                    minRows={4}
                    {...form.getInputProps("description_tr")}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="en" pt="xs">
                  <Textarea
                    placeholder="English property description (optional)"
                    minRows={4}
                    {...form.getInputProps("description_en")}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="ru" pt="xs">
                  <Textarea
                    placeholder="Russian property description (optional)"
                    minRows={4}
                    {...form.getInputProps("description_ru")}
                  />
                </Tabs.Panel>
              </Tabs>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select
                withAsterisk
                label="Ülke"
                clearable
                searchable
                data={getAll()}
                {...form.getInputProps("country")}
              />
              <TextInput
                withAsterisk
                label="Şehir"
                placeholder="City"
                {...form.getInputProps("city")}
              />
              <TextInput
                withAsterisk
                label="Adres"
                placeholder="Address"
                {...form.getInputProps("address")}
              />
            </div>

            {/* Facilities */}
            <Text size="sm" fw={500} mt="lg" mb="xs">
              Olanaklar
            </Text>
            <div className="grid grid-cols-3 gap-4">
              <NumberInput
                label="Yatak Odası"
                min={0}
                {...form.getInputProps("bedrooms")}
              />
              <NumberInput
                label="Banyo"
                min={0}
                {...form.getInputProps("bathrooms")}
              />
              <NumberInput
                label="Otopark"
                min={0}
                {...form.getInputProps("parkings")}
              />
            </div>
          </>
        )}

        {/* Show these sections only for SALE properties */}
        {form.values.propertyType === "sale" && (
          <>
            {/* Consultant Selector */}
            <Select
              label="Danışman Ata"
              placeholder="Bu mülk için bir danışman seçin"
              description="Danışman, bu mülk için iletişim kişisi olarak gösterilecektir"
              data={consultantOptions}
              value={selectedConsultantId}
              onChange={(value) => setSelectedConsultantId(value || "")}
              clearable
              searchable
              disabled={consultantsLoading}
              mt="md"
              leftSection={<MdPerson size={16} />}
              renderOption={({ option }) => (
                <div className="flex items-center gap-2 py-1">
                  <Avatar src={option.image} size="sm" radius="xl" />
                  <div>
                    <Text size="sm" fw={500}>
                      {option.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {option.title}
                    </Text>
                  </div>
                </div>
              )}
            />

            <Divider my="lg" label="İlan Bilgileri" labelPosition="center" />

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="İlan No"
              placeholder="1275908801"
              value={listingNo}
              onChange={(e) => setListingNo(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <DateInput
              label="İlan Tarihi"
              placeholder="Tarih seçin"
              value={listingDate}
              onChange={setListingDate}
              valueFormat="DD MMMM YYYY"
            />
          </Grid.Col>
        </Grid>

        <Divider my="lg" label="Bina ve Daire Bilgileri" labelPosition="center" />

        <Grid>
          <Grid.Col span={4}>
            <NumberInput
              label="m² (Brüt)"
              placeholder="4500"
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              value={areaGross}
              onChange={setAreaGross}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <NumberInput
              label="m² (Net)"
              placeholder="4000"
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              value={areaNet}
              onChange={setAreaNet}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label="Oda Sayısı"
              placeholder="Seçin"
              data={roomOptions}
              value={rooms}
              onChange={setRooms}
              clearable
            />
          </Grid.Col>
        </Grid>

        <Grid mt="sm">
          <Grid.Col span={4}>
            <NumberInput
              label="Bina Yaşı"
              placeholder="5"
              min={0}
              value={buildingAge}
              onChange={setBuildingAge}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <NumberInput
              label="Bulunduğu Kat"
              placeholder="2"
              min={-2}
              value={floor}
              onChange={setFloor}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <NumberInput
              label="Kat Sayısı"
              placeholder="18"
              min={1}
              value={totalFloors}
              onChange={setTotalFloors}
            />
          </Grid.Col>
        </Grid>

        <Grid mt="sm">
          <Grid.Col span={4}>
            <Select
              label="Isıtma"
              placeholder="Seçin"
              data={heatingOptions}
              value={heating}
              onChange={setHeating}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label="Mutfak"
              placeholder="Seçin"
              data={kitchenOptions}
              value={kitchen}
              onChange={setKitchen}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label="Otopark Tipi"
              placeholder="Seçin"
              data={parkingOptions}
              value={parkingType}
              onChange={setParkingType}
              clearable
            />
          </Grid.Col>
        </Grid>

        <Divider my="lg" label="Özellikler" labelPosition="center" />

        <Paper p="md" withBorder>
          <Grid>
            <Grid.Col span={3}>
              <Switch
                label="Balkon"
                checked={balcony}
                onChange={(event) => setBalcony(event.currentTarget.checked)}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Switch
                label="Asansör"
                checked={elevator}
                onChange={(event) => setElevator(event.currentTarget.checked)}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Switch
                label="Eşyalı"
                checked={furnished}
                onChange={(event) => setFurnished(event.currentTarget.checked)}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Switch
                label="Krediye Uygun"
                checked={mortgageEligible}
                onChange={(event) => setMortgageEligible(event.currentTarget.checked)}
              />
            </Grid.Col>
          </Grid>
        </Paper>

        <Divider my="lg" label="Diğer Bilgiler" labelPosition="center" />

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="Site Adı"
              placeholder="Makyol Santral"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Aidat (TL)"
              placeholder="0"
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              value={dues}
              onChange={setDues}
            />
          </Grid.Col>
        </Grid>

        <Grid mt="sm">
          <Grid.Col span={3}>
            <Select
              label="Kullanım Durumu"
              placeholder="Seçin"
              data={usageStatusOptions}
              value={usageStatus}
              onChange={setUsageStatus}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <TextInput
              label="Tapu Durumu"
              placeholder="Tapu durumunu yazın"
              value={deedStatus}
              onChange={(e) => setDeedStatus(e.target.value)}
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <Select
              label="İmar Durumu"
              placeholder="Seçin"
              data={imarDurumuOptions}
              value={imarDurumu}
              onChange={setImarDurumu}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <Text size="sm" fw={500} mb={4}>
              Listing Durumu
            </Text>
            <Group gap="md" mt={8}>
              <Checkbox
                label="Ready"
                checked={listingStatus === "ready"}
                onChange={(event) => {
                  if (event.currentTarget.checked) {
                    setListingStatus("ready");
                  }
                }}
              />
              <Checkbox
                label="Off-plan"
                checked={listingStatus === "offplan"}
                onChange={(event) => {
                  if (event.currentTarget.checked) {
                    setListingStatus("offplan");
                  }
                }}
              />
            </Group>
          </Grid.Col>
        </Grid>

        {/* Arsa/Land Features Section */}
        <Divider my="lg" label="Arsa Özellikleri" labelPosition="center" />

        {/* Altyapı (Infrastructure) */}
        <Paper p="md" withBorder mb="md" className="bg-amber-50">
          <div className="flex items-center gap-2 mb-3">
            <BsLightningCharge className="text-amber-600" size={18} />
            <Text fw={600} c="dark">Altyapı</Text>
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full ml-auto">
              {altyapiFeatures.length} seçili
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {ALTYAPI_FEATURES.map((feature) => (
              <Checkbox
                key={feature}
                label={feature}
                size="xs"
                checked={altyapiFeatures.includes(feature)}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    setAltyapiFeatures([...altyapiFeatures, feature]);
                  } else {
                    setAltyapiFeatures(altyapiFeatures.filter((f) => f !== feature));
                  }
                }}
              />
            ))}
          </div>
        </Paper>

        {/* Konum (Location) */}
        <Paper p="md" withBorder mb="md" className="bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <BsGeoAlt className="text-blue-600" size={18} />
            <Text fw={600} c="dark">Konum</Text>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full ml-auto">
              {konumFeatures.length} seçili
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {KONUM_FEATURES.map((feature) => (
              <Checkbox
                key={feature}
                label={feature}
                size="xs"
                checked={konumFeatures.includes(feature)}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    setKonumFeatures([...konumFeatures, feature]);
                  } else {
                    setKonumFeatures(konumFeatures.filter((f) => f !== feature));
                  }
                }}
              />
            ))}
          </div>
        </Paper>

        {/* Genel Özellikler (General Features) */}
        <Paper p="md" withBorder mb="md" className="bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <BsGrid className="text-green-600" size={18} />
            <Text fw={600} c="dark">Genel Özellikler</Text>
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full ml-auto">
              {genelOzellikler.length} seçili
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {GENEL_OZELLIKLER.map((feature) => (
              <Checkbox
                key={feature}
                label={feature}
                size="xs"
                checked={genelOzellikler.includes(feature)}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    setGenelOzellikler([...genelOzellikler, feature]);
                  } else {
                    setGenelOzellikler(genelOzellikler.filter((f) => f !== feature));
                  }
                }}
              />
            ))}
          </div>
        </Paper>

        {/* Manzara (View) */}
        <Paper p="md" withBorder mb="md" className="bg-purple-50">
          <div className="flex items-center gap-2 mb-3">
            <BsEye className="text-purple-600" size={18} />
            <Text fw={600} c="dark">Manzara</Text>
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full ml-auto">
              {manzaraFeatures.length} seçili
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {MANZARA_FEATURES.map((feature) => (
              <Checkbox
                key={feature}
                label={feature}
                size="xs"
                checked={manzaraFeatures.includes(feature)}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    setManzaraFeatures([...manzaraFeatures, feature]);
                  } else {
                    setManzaraFeatures(manzaraFeatures.filter((f) => f !== feature));
                  }
                }}
              />
            ))}
          </div>
        </Paper>

        {/* Interior Features */}
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={toggleInterior}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BsHouseDoor className="text-green-600" size={18} />
              <Text fw={500} size="sm">
                İç Özellikler
              </Text>
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                {interiorFeatures.length} seçili
              </span>
            </div>
            {interiorOpened ? (
              <MdExpandLess size={20} />
            ) : (
              <MdExpandMore size={20} />
            )}
          </button>
          <Collapse in={interiorOpened}>
            <ScrollArea h={200} className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ALL_INTERIOR_FEATURES.map((feature) => (
                  <Checkbox
                    key={feature}
                    label={feature}
                    size="xs"
                    checked={interiorFeatures.includes(feature)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setInteriorFeatures([...interiorFeatures, feature]);
                      } else {
                        setInteriorFeatures(
                          interiorFeatures.filter((f) => f !== feature)
                        );
                      }
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </Collapse>
        </div>

        {/* Exterior Features */}
        <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={toggleExterior}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BsTree className="text-blue-600" size={18} />
              <Text fw={500} size="sm">
                Dış Özellikler
              </Text>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                {exteriorFeatures.length} seçili
              </span>
            </div>
            {exteriorOpened ? (
              <MdExpandLess size={20} />
            ) : (
              <MdExpandMore size={20} />
            )}
          </button>
          <Collapse in={exteriorOpened}>
            <ScrollArea h={200} className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ALL_EXTERIOR_FEATURES.map((feature) => (
                  <Checkbox
                    key={feature}
                    label={feature}
                    size="xs"
                    checked={exteriorFeatures.includes(feature)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setExteriorFeatures([...exteriorFeatures, feature]);
                      } else {
                        setExteriorFeatures(
                          exteriorFeatures.filter((f) => f !== feature)
                        );
                      }
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </Collapse>
        </div>

        {/* Muhit Features */}
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={toggleMuhit}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BsGeoAlt className="text-purple-600" size={18} />
              <Text fw={500} size="sm">
                Muhit
              </Text>
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                {muhitFeatures.length} seçili
              </span>
            </div>
            {muhitOpened ? (
              <MdExpandLess size={20} />
            ) : (
              <MdExpandMore size={20} />
            )}
          </button>
          <Collapse in={muhitOpened}>
            <ScrollArea h={200} className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MUHIT_FEATURES.map((feature) => (
                  <Checkbox
                    key={feature}
                    label={feature}
                    size="xs"
                    checked={muhitFeatures.includes(feature)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setMuhitFeatures([...muhitFeatures, feature]);
                      } else {
                        setMuhitFeatures(
                          muhitFeatures.filter((f) => f !== feature)
                        );
                      }
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </Collapse>
        </div>
          </>
        )}

        {/* Project-Specific Fields - local and international projects */}
        {(form.values.propertyType === "local-project" || form.values.propertyType === "international-project") && (
          <>
            <Divider my="lg" label="Proje Bilgileri" labelPosition="center" color="blue" />

            <Select
              label="Danışman Ata"
              placeholder="Bu proje için bir danışman seçin"
              description="Danışman, bu proje için iletişim kişisi olarak gösterilecektir"
              data={consultantOptions}
              value={selectedConsultantId}
              onChange={(value) => setSelectedConsultantId(value || "")}
              clearable
              searchable
              disabled={consultantsLoading}
              mt="md"
              leftSection={<MdPerson size={16} />}
              renderOption={({ option }) => (
                <div className="flex items-center gap-2 py-1">
                  <Avatar src={option.image} size="sm" radius="xl" />
                  <div>
                    <Text size="sm" fw={500}>
                      {option.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {option.title}
                    </Text>
                  </div>
                </div>
              )}
            />

            <TextInput
              label="Proje Adı"
              placeholder="Örn: Blue Coast Residence"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              mt="sm"
            />

            {/* İlan No & Kampanya */}
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="İlan Numarası"
                  placeholder="#1201651741"
                  value={ilanNo}
                  onChange={(e) => setIlanNo(e.target.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Kampanya Metni"
                  placeholder="2+1 DAİRELER %50 PESİN %50 36 AY VADE FARKSIZ TAKSİT İMKANI"
                  value={kampanya}
                  onChange={(e) => setKampanya(e.target.value)}
                />
              </Grid.Col>
            </Grid>

            <Checkbox
              label="Special Offer"
              mt="sm"
              checked={isSpecialOfferEnabled}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                setIsSpecialOfferEnabled(checked);
                if (checked && (specialOffers || []).length === 0) {
                  addSpecialOffer();
                }
              }}
            />

            {isSpecialOfferEnabled && (
              <Paper p="md" withBorder mt="sm" className="bg-rose-50 border-rose-200">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Text fw={700} c="red.8">
                    Special Offer
                  </Text>
                  <Button
                    variant="light"
                    color="red"
                    size="xs"
                    type="button"
                    onClick={addSpecialOffer}
                  >
                    + Special Offer Ekle
                  </Button>
                </div>

                {(specialOffers || []).length === 0 ? (
                  <Text c="dimmed" ta="center" py="sm">
                    Henüz special offer eklenmedi. &quot;Special Offer Ekle&quot; butonuna tıklayın.
                  </Text>
                ) : (
                  (specialOffers || []).map((offer, index) => (
                    <Paper key={offer.id || index} p="sm" withBorder mb="sm" className="bg-white">
                      <div className="mb-2 flex items-center justify-between">
                        <Text fw={600} size="sm">
                          Offer #{index + 1}
                        </Text>
                        <Button
                          variant="subtle"
                          color="red"
                          size="xs"
                          type="button"
                          onClick={() => removeSpecialOffer(index)}
                        >
                          Sil
                        </Button>
                      </div>

                      <Grid>
                        <Grid.Col span={6}>
                          <TextInput
                            label="Offer Title"
                            placeholder="Special Offer - Buy Smart!"
                            value={offer.title || ""}
                            onChange={(e) =>
                              updateSpecialOfferField(index, "title", e.target.value)
                            }
                          />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <TextInput
                            label="Unit Type"
                            placeholder="1+1"
                            value={offer.roomType || ""}
                            onChange={(e) =>
                              updateSpecialOfferField(index, "roomType", e.target.value)
                            }
                          />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <NumberInput
                            label="Area (m2)"
                            min={0}
                            value={offer.areaM2 ?? 0}
                            onChange={(value) =>
                              updateSpecialOfferField(index, "areaM2", Number(value) || 0)
                            }
                          />
                        </Grid.Col>
                      </Grid>

                      <Grid mt="xs">
                        <Grid.Col span={3}>
                          <NumberInput
                            label="Price (GBP)"
                            min={0}
                            thousandSeparator="."
                            decimalSeparator=","
                            value={offer.priceGBP ?? 0}
                            onChange={(value) =>
                              updateSpecialOfferField(index, "priceGBP", Number(value) || 0)
                            }
                          />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <NumberInput
                            label="Down Payment (GBP)"
                            min={0}
                            thousandSeparator="."
                            decimalSeparator=","
                            value={offer.downPaymentAmount ?? offer.downPaymentPercent ?? 0}
                            onChange={(value) => {
                              const nextValue = Number(value) || 0;
                              updateSpecialOfferField(index, "downPaymentPercent", nextValue);
                              updateSpecialOfferField(index, "downPaymentAmount", nextValue);
                            }}
                          />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <NumberInput
                            label="Installment (Months)"
                            min={0}
                            value={offer.installmentMonths ?? 0}
                            onChange={(value) =>
                              updateSpecialOfferField(
                                index,
                                "installmentMonths",
                                Number(value) || 0
                              )
                            }
                          />
                        </Grid.Col>
                        <Grid.Col span={3}>
                          <TextInput
                            label="Location Label"
                            placeholder="E5"
                            value={offer.locationLabel || ""}
                            onChange={(e) =>
                              updateSpecialOfferField(
                                index,
                                "locationLabel",
                                e.target.value
                              )
                            }
                          />
                        </Grid.Col>
                      </Grid>
                      <Grid mt="xs">
                        <Grid.Col span={3}>
                          <NumberInput
                            label="Location Minutes"
                            min={0}
                            value={offer.locationMinutes ?? 0}
                            onChange={(value) =>
                              updateSpecialOfferField(
                                index,
                                "locationMinutes",
                                Number(value) || 0
                              )
                            }
                          />
                        </Grid.Col>
                      </Grid>
                    </Paper>
                  ))
                )}
              </Paper>
            )}

            {/* Delivery Date & Project Status */}
            <Grid mt="sm">
              <Grid.Col span={3}>
                <TextInput
                  label="Teslim Tarihi"
                  placeholder="Mayıs 2027"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <Select
                  label="Proje Durumu"
                  placeholder="Seçin"
                  data={[
                    { value: "devam-ediyor", label: "Devam Ediyor" },
                    { value: "tamamlandi", label: "Tamamlandı" },
                  ]}
                  value={projectStatus}
                  onChange={(value) => {
                    const nextProjectStatus = value || "devam-ediyor";
                    setProjectStatus(nextProjectStatus);
                    const inferredListingStatus =
                      listingStatusFromProjectStatus(nextProjectStatus);
                    if (inferredListingStatus) {
                      setListingStatus(inferredListingStatus);
                    }
                  }}
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <Text size="sm" fw={500} mb={4}>
                  Listing Durumu
                </Text>
                <Group gap="md" mt={8}>
                  <Checkbox
                    label="Ready"
                    checked={listingStatus === "ready"}
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        setListingStatus("ready");
                        setProjectStatus(projectStatusFromListingStatus("ready"));
                      }
                    }}
                  />
                  <Checkbox
                    label="Off-plan"
                    checked={listingStatus === "offplan"}
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        setListingStatus("offplan");
                        setProjectStatus(projectStatusFromListingStatus("offplan"));
                      }
                    }}
                  />
                </Group>
              </Grid.Col>
              <Grid.Col span={3}>
                <Checkbox
                  label="GYO"
                  mt={36}
                  checked={gyo}
                  onChange={(e) => setGyo(e.currentTarget.checked)}
                />
              </Grid.Col>
            </Grid>

            {/* Proje Hakkında */}
            <Paper p="md" withBorder mt="md" className="bg-blue-50">
              <Text fw={600} size="sm" mb="md" c="blue">Proje Hakkında</Text>
              <Grid>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Proje Alanı (m²)"
                    placeholder="20500"
                    min={0}
                    thousandSeparator="."
                    decimalSeparator=","
                    value={projeHakkinda.projeAlani}
                    onChange={(value) => setProjeHakkinda({ ...projeHakkinda, projeAlani: value || 0 })}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Yeşil Alan (m²)"
                    placeholder="7500"
                    min={0}
                    thousandSeparator="."
                    decimalSeparator=","
                    value={projeHakkinda.yesilAlan}
                    onChange={(value) => setProjeHakkinda({ ...projeHakkinda, yesilAlan: value || 0 })}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <NumberInput
                    label="Konut Sayısı"
                    placeholder="884"
                    min={0}
                    value={projeHakkinda.konutSayisi}
                    onChange={(value) => setProjeHakkinda({ ...projeHakkinda, konutSayisi: value || 0 })}
                  />
                </Grid.Col>
              </Grid>
              <Grid mt="sm">
                <Grid.Col span={4}>
                  <Textarea
                    label="Proje Açıklaması (Türkçe)"
                    placeholder="Şehrin merkezinde, bahçeli bir yaşam..."
                    minRows={4}
                    value={projeHakkinda.description_tr}
                    onChange={(e) => setProjeHakkinda({ ...projeHakkinda, description_tr: e.target.value, description: e.target.value })}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Textarea
                    label="Project Description (English)"
                    placeholder="A garden life in the city center..."
                    minRows={4}
                    value={projeHakkinda.description_en}
                    onChange={(e) => setProjeHakkinda({ ...projeHakkinda, description_en: e.target.value })}
                  />
                </Grid.Col>
                <Grid.Col span={4}>
                  <Textarea
                    label="Project Description (Russian)"
                    placeholder="Description in Russian..."
                    minRows={4}
                    value={projeHakkinda.description_ru || ""}
                    onChange={(e) => setProjeHakkinda({ ...projeHakkinda, description_ru: e.target.value })}
                  />
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Vaziyet Planı & Harita Görseli Upload */}
            <Grid mt="md">
              <Grid.Col span={12}>
                <TextInput
                  label="Brochure URL / YouTube Link"
                  placeholder="https://www.youtube.com/watch?v=... or https://.../brochure.pdf"
                  value={brochureUrl}
                  onChange={(event) => setBrochureUrl(event.currentTarget.value)}
                  description="YouTube video link or PDF brochure for WhatsApp delivery."
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper p="md" withBorder className="bg-orange-50">
                  <Text fw={600} size="sm" c="orange" mb="sm">Vaziyet Planı</Text>
                  {vaziyetPlani ? (
                    <div className="relative">
                      <img
                        src={vaziyetPlani}
                        alt="Vaziyet Planı"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        size="xs"
                        color="red"
                        variant="filled"
                        className="absolute top-2 right-2"
                        onClick={() => setVaziyetPlani("")}
                      >
                        Kaldır
                      </Button>
                    </div>
                  ) : (
                    <Button
                      fullWidth
                      variant="outline"
                      color="orange"
                      leftSection={<MdOutlineCloudUpload size={18} />}
                      onClick={openVaziyetPlaniUpload}
                      loading={vaziyetPlaniUploading}
                    >
                      Vaziyet Planı Yükle
                    </Button>
                  )}
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper p="md" withBorder className="bg-blue-50">
                  <Text fw={600} size="sm" c="blue" mb="sm">Harita Görseli</Text>
                  {mapImage ? (
                    <div className="relative">
                      <img
                        src={mapImage}
                        alt="Harita Görseli"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        size="xs"
                        color="red"
                        variant="filled"
                        className="absolute top-2 right-2"
                        onClick={() => setMapImage("")}
                      >
                        Kaldır
                      </Button>
                    </div>
                  ) : (
                    <Button
                      fullWidth
                      variant="outline"
                      color="blue"
                      leftSection={<MdOutlineCloudUpload size={18} />}
                      onClick={openMapImageUpload}
                      loading={mapImageUploading}
                    >
                      Harita Görseli Yükle
                    </Button>
                  )}
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Daire Planları */}
            <Paper p="md" withBorder mt="md" className="bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <Text fw={600} size="sm" c="green">Daire Planları</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="green"
                  onClick={() =>
                    setDairePlanlari([
                      ...dairePlanlari,
                      {
                        id: Date.now(),
                        tip: "",
                        varyant: "",
                        fiyat: 0,
                        fiyatUSD: 0,
                        fiyatEUR: 0,
                        fiyatGBP: 0,
                        fiyatTRY: 0,
                        currency: floorPlanBaseCurrency,
                        metrekare: 0,
                        image: "",
                      },
                    ])
                  }
                >
                  + Plan Ekle
                </Button>
              </div>
              {dairePlanlari.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">Henüz daire planı eklenmedi</Text>
              ) : (
                dairePlanlari.map((plan, index) => (
                  <Paper key={plan.id || index} p="sm" withBorder mb="sm" className="bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <Text size="xs" fw={500}>Plan #{index + 1}</Text>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => setDairePlanlari(dairePlanlari.filter((_, i) => i !== index))}
                      >
                        Sil
                      </Button>
                    </div>
                    <Grid>
                      <Grid.Col span={2}>
                        <TextInput
                          size="xs"
                          label="Daire Tipi"
                          placeholder="2+1"
                          value={plan.tip}
                          onChange={(e) => {
                            const updated = [...dairePlanlari];
                            updated[index].tip = e.target.value;
                            setDairePlanlari(updated);
                          }}
                        />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <TextInput
                          size="xs"
                          label="Varyant"
                          placeholder="A"
                          value={plan.varyant}
                          onChange={(e) => {
                            const updated = [...dairePlanlari];
                            updated[index].varyant = e.target.value;
                            setDairePlanlari(updated);
                          }}
                        />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <NumberInput
                          size="xs"
                          label="USD ($)"
                          min={0}
                          thousandSeparator="."
                          decimalSeparator=","
                          value={getFloorPlanPriceByCurrency(plan, "USD")}
                          onChange={(value) =>
                            updateFloorPlanPrices(index, "USD", value)
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <NumberInput
                          size="xs"
                          label="EUR"
                          min={0}
                          thousandSeparator="."
                          decimalSeparator=","
                          value={getFloorPlanPriceByCurrency(plan, "EUR")}
                          onChange={(value) =>
                            updateFloorPlanPrices(index, "EUR", value)
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <NumberInput
                          size="xs"
                          label="GBP (\u00A3)"
                          min={0}
                          thousandSeparator="."
                          decimalSeparator=","
                          value={getFloorPlanPriceByCurrency(plan, "GBP")}
                          onChange={(value) =>
                            updateFloorPlanPrices(index, "GBP", value)
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <NumberInput
                          size="xs"
                          label="TRY (TL)"
                          min={0}
                          thousandSeparator="."
                          decimalSeparator=","
                          value={getFloorPlanPriceByCurrency(plan, "TRY")}
                          onChange={(value) =>
                            updateFloorPlanPrices(index, "TRY", value)
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={2}>
                        <NumberInput
                          size="xs"
                          label="m2"
                          min={0}
                          value={plan.metrekare}
                          onChange={(value) => {
                            const updated = [...dairePlanlari];
                            updated[index].metrekare = value || 0;
                            setDairePlanlari(updated);
                          }}
                        />
                      </Grid.Col>
                    </Grid>
                    {/* Floor Plan Image Upload */}
                    <div className="mt-3">
                      <Text size="xs" fw={500} mb="xs">Plan Görseli</Text>
                      {plan.image ? (
                        <div className="relative inline-block">
                          <img
                            src={plan.image}
                            alt={`Plan ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                          <Button
                            size="xs"
                            color="red"
                            variant="filled"
                            className="absolute -top-2 -right-2"
                            style={{ padding: '2px 6px', minWidth: 'auto' }}
                            onClick={() => {
                              const updated = [...dairePlanlari];
                              updated[index].image = "";
                              setDairePlanlari(updated);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          color="green"
                          leftSection={<MdOutlineCloudUpload size={14} />}
                          onClick={() => openFloorPlanUpload(index)}
                          loading={floorPlanUploading === index}
                        >
                          Görsel Yükle
                        </Button>
                      )}
                    </div>
                  </Paper>
                ))
              )}
            </Paper>

            {/* Full Özellikler Section for Projects - Tabbed Interface */}
            <Paper p="lg" withBorder mt="lg">
              <div className="flex items-center gap-2 mb-4">
                <BsBuilding size={24} className="text-gray-600" />
                <Text fw={700} size="lg">Özellikler</Text>
              </div>

              <Tabs defaultValue="bina" variant="outline">
                <Tabs.List>
                  <Tabs.Tab value="bina" leftSection={<BsBuilding size={14} />}>
                    Bina Özellikleri
                  </Tabs.Tab>
                  <Tabs.Tab value="dis" leftSection={<BsTree size={14} />}>
                    Dış Özellikler
                  </Tabs.Tab>
                  <Tabs.Tab value="engelli" leftSection={<FaWheelchair size={14} />}>
                    Engelliye ve Yaşlıya Uygun
                  </Tabs.Tab>
                  <Tabs.Tab value="eglence" leftSection={<FaShoppingCart size={14} />}>
                    Eğlence & Alışveriş
                  </Tabs.Tab>
                  <Tabs.Tab value="guvenlik" leftSection={<BsShield size={14} />}>
                    Güvenlik
                  </Tabs.Tab>
                  <Tabs.Tab value="manzara" leftSection={<BsEye size={14} />}>
                    Manzara
                  </Tabs.Tab>
                  <Tabs.Tab value="muhit" leftSection={<BsPeople size={14} />}>
                    Muhit
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="bina" pt="md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROJE_BINA_OZELLIKLERI.map((feature) => (
                      <Checkbox
                        key={feature}
                        label={feature}
                        size="sm"
                        checked={projeBinaOzellikleri.includes(feature)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setProjeBinaOzellikleri([...projeBinaOzellikleri, feature]);
                          } else {
                            setProjeBinaOzellikleri(projeBinaOzellikleri.filter((f) => f !== feature));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="dis" pt="md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROJE_DIS_OZELLIKLER.map((feature) => (
                      <Checkbox
                        key={feature}
                        label={feature}
                        size="sm"
                        checked={projeDisOzellikler.includes(feature)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setProjeDisOzellikler([...projeDisOzellikler, feature]);
                          } else {
                            setProjeDisOzellikler(projeDisOzellikler.filter((f) => f !== feature));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="engelli" pt="md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROJE_ENGELLI_YASLI_UYGUN.map((feature) => (
                      <Checkbox
                        key={feature}
                        label={feature}
                        size="sm"
                        checked={projeEngelliYasliUygun.includes(feature)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setProjeEngelliYasliUygun([...projeEngelliYasliUygun, feature]);
                          } else {
                            setProjeEngelliYasliUygun(projeEngelliYasliUygun.filter((f) => f !== feature));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="eglence" pt="md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROJE_EGLENCE_ALISVERIS.map((feature) => (
                      <Checkbox
                        key={feature}
                        label={feature}
                        size="sm"
                        checked={projeEglenceAlisveris.includes(feature)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setProjeEglenceAlisveris([...projeEglenceAlisveris, feature]);
                          } else {
                            setProjeEglenceAlisveris(projeEglenceAlisveris.filter((f) => f !== feature));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="guvenlik" pt="md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROJE_GUVENLIK.map((feature) => (
                      <Checkbox
                        key={feature}
                        label={feature}
                        size="sm"
                        checked={projeGuvenlik.includes(feature)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setProjeGuvenlik([...projeGuvenlik, feature]);
                          } else {
                            setProjeGuvenlik(projeGuvenlik.filter((f) => f !== feature));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="manzara" pt="md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROJE_MANZARA.map((feature) => (
                      <Checkbox
                        key={feature}
                        label={feature}
                        size="sm"
                        checked={projeManzara.includes(feature)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setProjeManzara([...projeManzara, feature]);
                          } else {
                            setProjeManzara(projeManzara.filter((f) => f !== feature));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Tabs.Panel>

                <Tabs.Panel value="muhit" pt="md">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {PROJE_MUHIT.map((feature) => (
                      <Checkbox
                        key={feature}
                        label={feature}
                        size="sm"
                        checked={projeMuhit.includes(feature)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setProjeMuhit([...projeMuhit, feature]);
                          } else {
                            setProjeMuhit(projeMuhit.filter((f) => f !== feature));
                          }
                        }}
                      />
                    ))}
                  </div>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </>
        )}

        {/* Combined Gallery - Images & Videos */}
        <Text size="sm" fw={500} mt="lg" mb="xs">
          Görseller ve Videolar / تصاویر و ویدیوها <span className="text-red-500">*</span>
          {(imageURLs.length > 0 || videoURLs.length > 0) && (
            <span className="text-gray-400 font-normal ml-2">
              ({imageURLs.length} resim{videoURLs.length > 0 ? `, ${videoURLs.length} video` : ''})
            </span>
          )}
        </Text>
        <div className="border border-gray-200 rounded-lg p-4">
          {imageURLs.length === 0 && videoURLs.length === 0 ? (
            <div className="flex gap-4">
              <div
                onClick={handleImageUpload}
                className="flex-1 flexCenter flex-col h-32 border-dashed border-2 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <MdOutlineCloudUpload size={32} color="grey" />
                <span className="text-sm text-gray-500">Resim Yükle</span>
              </div>
              <div
                onClick={handleVideoUpload}
                className="flex-1 flexCenter flex-col h-32 border-dashed border-2 border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50"
              >
                <MdVideocam size={32} color="#9333ea" />
                <span className="text-sm text-purple-600">Video Yükle</span>
              </div>
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              }}
            >
              {/* Videos First */}
              {videoURLs.map((url, index) => (
                <div
                  key={`video-${index}`}
                  className="relative rounded-lg overflow-hidden group bg-gradient-to-br from-purple-900 to-gray-900"
                  style={{ height: 96, minWidth: 100 }}
                >
                  <video
                    src={`${url}#t=0.1`}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    preload="auto"
                    playsInline
                    onLoadedData={(e) => {
                      e.target.style.opacity = "1";
                    }}
                    onMouseEnter={(e) => { try { e.target.play(); } catch {} }}
                    onMouseLeave={(e) => { try { e.target.pause(); e.target.currentTime = 0.1; } catch {} }}
                    style={{ opacity: 0, transition: "opacity 0.3s" }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <MdPlayCircleOutline size={28} color="white" className="opacity-90 drop-shadow-lg" />
                    <span className="text-white text-[10px] mt-1 opacity-80">Video {index + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVideo(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <AiOutlineClose size={12} />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-purple-600 text-white text-[10px] px-1 py-0.5 rounded">
                    Video {index + 1}
                  </span>
                </div>
              ))}
              
              {/* Images */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={imageURLs} strategy={rectSortingStrategy}>
                  {imageURLs.map((url, index) => (
                    <SortableImage
                      key={url}
                      url={url}
                      index={index}
                      onRemove={removeImage}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              
              {/* Add Image Button */}
              <div
                onClick={handleImageUpload}
                className="flexCenter flex-col h-24 border-dashed border-2 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <MdOutlineCloudUpload size={20} color="grey" />
                <span className="text-xs text-gray-500">Resim</span>
              </div>
              
              {/* Add Video Button */}
              <div
                onClick={handleVideoUpload}
                className="flexCenter flex-col h-24 border-dashed border-2 border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50"
              >
                <MdVideocam size={20} color="#9333ea" />
                <span className="text-xs text-purple-500">Video</span>
              </div>
            </div>
          )}
          {mediaUploading && <UploadProgressBar progress={uploadProgress} />}
        </div>

        {/* Actions */}
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={() => setOpened(false)}>
            İptal
          </Button>
          <Button type="submit" color="green" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader size="xs" color="white" mr={8} />
                Güncelleniyor...
              </>
            ) : (
              "Güncelle"
            )}
          </Button>
        </Group>
      </form>
    </Modal>
  );
};

EditPropertyModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  setOpened: PropTypes.func.isRequired,
  property: PropTypes.object,
  onSuccess: PropTypes.func,
};

export default EditPropertyModal;

