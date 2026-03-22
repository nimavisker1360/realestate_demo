import { useState, useMemo, useContext, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import {
  Container,
  Button,
  TextInput,
  Popover,
  Checkbox,
  ScrollArea,
  Loader,
} from "@mantine/core";
import { MdSearch, MdKeyboardArrowDown, MdLocationOn, MdTune } from "react-icons/md";
import heroBg from "../assets/img4.png";
import cyprusHeroBg from "../assets/hero/Cyprus.jpg";
import dubaiHeroBg from "../assets/hero/Dubai.jpg";
import georgiaHeroBg from "../assets/hero/Georgia02.jpg";
import greeceHeroBg from "../assets/hero/greece.jpg";
import useProperties from "../hooks/useProperties";
import CurrencyContext from "../context/CurrencyContext";
import PropertiesMap from "../components/PropertiesMap";
import PropertyCard from "../components/PropertyCard";
import { getOptimizedImageUrl } from "../utils/media";
import { resolveProjectPath } from "../utils/seo";

// Turkish cities data
const TURKISH_CITIES = [
  { value: "", label: "Tüm Şehirler" },
  { value: "istanbul-tumu", label: "İstanbul (Tümü)" },
  { value: "istanbul-avrupa", label: "İstanbul (Avrupa)" },
  { value: "istanbul-anadolu", label: "İstanbul (Anadolu)" },
  { value: "ankara", label: "Ankara" },
  { value: "izmir", label: "İzmir" },
  { value: "adana", label: "Adana" },
  { value: "adiyaman", label: "Adıyaman" },
  { value: "afyonkarahisar", label: "Afyonkarahisar" },
  { value: "antalya", label: "Antalya" },
  { value: "bursa", label: "Bursa" },
  { value: "denizli", label: "Denizli" },
  { value: "diyarbakir", label: "Diyarbakır" },
  { value: "eskisehir", label: "Eskişehir" },
  { value: "gaziantep", label: "Gaziantep" },
  { value: "kayseri", label: "Kayseri" },
  { value: "kocaeli", label: "Kocaeli" },
  { value: "konya", label: "Konya" },
  { value: "mersin", label: "Mersin" },
  { value: "mugla", label: "Muğla" },
  { value: "sakarya", label: "Sakarya" },
  { value: "samsun", label: "Samsun" },
  { value: "trabzon", label: "Trabzon" },
];

// International countries data
const INTERNATIONAL_COUNTRIES = [
  { value: "", label: "All Countries" },
  {
    value: "cyprus",
    label: "Kıbrıs / Cyprus",
    aliases: [
      "kıbrıs",
      "kibris",
      "cyprus",
      "north cyprus",
      "northern cyprus",
      "kuzey kıbrıs",
      "kuzey kibris",
      "kktc",
    ],
  },
  {
    value: "greece",
    label: "Yunanistan / Greece",
    aliases: ["yunanistan", "greece", "hellas", "ellada"],
  },
  {
    value: "dubai",
    label: "Dubai / Dubai",
    aliases: ["dubai", "uae", "united arab emirates", "birlesik arap emirlikleri"],
  },
  {
    value: "georgia",
    label: "Gürcistan / Georgia",
    aliases: ["gürcistan", "gurcistan", "georgia", "sakartvelo"],
  },
];

// Districts/regions by international country
const INTERNATIONAL_DISTRICTS = {
  cyprus: [
    "Girne / Kyrenia",
    "İskele / Iskele",
    "Lefkoşa / Nicosia",
    "Gazimağusa / Famagusta",
  ],
  greece: [
    "Atina / Athens",
    "Selanik / Thessaloniki",
    "Girit / Crete",
    "Mikonos / Mykonos",
  ],
  dubai: [
    "Downtown Dubai / Downtown Dubai",
    "Dubai Marina / Dubai Marina",
    "Palm Jumeirah / Palm Jumeirah",
    "JVC / Jumeirah Village Circle",
  ],
  georgia: [
    "Tiflis / Tbilisi",
    "Batum / Batumi",
    "Kutaisi / Kutaisi",
  ],
};

const INTERNATIONAL_HERO_IMAGES = {
  cyprus: cyprusHeroBg,
  greece: greeceHeroBg,
  dubai: dubaiHeroBg,
  georgia: georgiaHeroBg,
};

// Districts by city
const CITY_DISTRICTS = {
  "istanbul-tumu": [
    "Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler",
    "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü",
    "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt",
    "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane",
    "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer",
    "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla",
    "Ümraniye", "Üsküdar", "Zeytinburnu"
  ],
  "istanbul-avrupa": [
    "Arnavutköy", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir",
    "Bayrampaşa", "Beşiktaş", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca",
    "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören",
    "Kağıthane", "Küçükçekmece", "Sarıyer", "Silivri", "Sultangazi", "Şişli", "Zeytinburnu"
  ],
  "istanbul-anadolu": [
    "Adalar", "Ataşehir", "Beykoz", "Çekmeköy", "Kadıköy", "Kartal", "Maltepe",
    "Pendik", "Sancaktepe", "Sultanbeyli", "Şile", "Tuzla", "Ümraniye", "Üsküdar"
  ],
  "ankara": [
    "Akyurt", "Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya",
    "Çubuk", "Elmadağ", "Etimesgut", "Evren", "Gölbaşı", "Güdül", "Haymana",
    "Kalecik", "Kahramankazan", "Keçiören", "Kızılcahamam", "Mamak", "Nallıhan",
    "Polatlı", "Pursaklar", "Sincan", "Şereflikoçhisar", "Yenimahalle"
  ],
  "izmir": [
    "Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova",
    "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe",
    "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Kiraz",
    "Konak", "Menderes", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar",
    "Selçuk", "Tire", "Torbalı", "Urla"
  ],
  "antalya": [
    "Akseki", "Aksu", "Alanya", "Demre", "Döşemealtı", "Elmalı", "Finike",
    "Gazipaşa", "Gündoğmuş", "İbradı", "Kaş", "Kemer", "Kepez", "Konyaaltı",
    "Korkuteli", "Kumluca", "Manavgat", "Muratpaşa", "Serik"
  ],
  "bursa": [
    "Büyükorhan", "Gemlik", "Gürsu", "Harmancık", "İnegöl", "İznik", "Karacabey",
    "Keles", "Kestel", "Mudanya", "Mustafakemalpaşa", "Nilüfer", "Orhaneli",
    "Orhangazi", "Osmangazi", "Yenişehir", "Yıldırım"
  ],
  "adana": [
    "Aladağ", "Ceyhan", "Çukurova", "Feke", "İmamoğlu", "Karaisalı", "Karataş",
    "Kozan", "Pozantı", "Saimbeyli", "Sarıçam", "Seyhan", "Tufanbeyli", "Yumurtalık", "Yüreğir"
  ],
  "konya": [
    "Ahırlı", "Akören", "Akşehir", "Altınekin", "Beyşehir", "Bozkır", "Cihanbeyli",
    "Çeltik", "Çumra", "Derbent", "Derebucak", "Doğanhisar", "Emirgazi", "Ereğli",
    "Güneysınır", "Hadim", "Halkapınar", "Hüyük", "Ilgın", "Kadınhanı", "Karapınar",
    "Karatay", "Kulu", "Meram", "Sarayönü", "Selçuklu", "Seydişehir", "Taşkent",
    "Tuzlukçu", "Yalıhüyük", "Yunak"
  ],
  "gaziantep": [
    "Araban", "İslahiye", "Karkamış", "Nizip", "Nurdağı", "Oğuzeli", "Şahinbey", "Şehitkamil", "Yavuzeli"
  ],
  "mersin": [
    "Akdeniz", "Anamur", "Aydıncık", "Bozyazı", "Çamlıyayla", "Erdemli", "Gülnar",
    "Mezitli", "Mut", "Silifke", "Tarsus", "Toroslar", "Yenişehir"
  ],
  "kocaeli": [
    "Başiskele", "Çayırova", "Darıca", "Derince", "Dilovası", "Gebze", "Gölcük",
    "İzmit", "Kandıra", "Karamürsel", "Kartepe", "Körfez"
  ],
  "kayseri": [
    "Akkışla", "Bünyan", "Develi", "Felahiye", "Hacılar", "İncesu", "Kocasinan",
    "Melikgazi", "Özvatan", "Pınarbaşı", "Sarıoğlan", "Sarız", "Talas", "Tomarza", "Yahyalı", "Yeşilhisar"
  ],
  "denizli": [
    "Acıpayam", "Babadağ", "Baklan", "Bekilli", "Beyağaç", "Bozkurt", "Buldan",
    "Çal", "Çameli", "Çardak", "Çivril", "Güney", "Honaz", "Kale", "Merkezefendi",
    "Pamukkale", "Sarayköy", "Serinhisar", "Tavas"
  ],
  "eskisehir": [
    "Alpu", "Beylikova", "Çifteler", "Günyüzü", "Han", "İnönü", "Mahmudiye",
    "Mihalgazi", "Mihalıççık", "Odunpazarı", "Sarıcakaya", "Seyitgazi", "Sivrihisar", "Tepebaşı"
  ],
  "diyarbakir": [
    "Bağlar", "Bismil", "Çermik", "Çınar", "Çüngüş", "Dicle", "Eğil", "Ergani",
    "Hani", "Hazro", "Kayapınar", "Kocaköy", "Kulp", "Lice", "Silvan", "Sur", "Yenişehir"
  ],
  "samsun": [
    "Alaçam", "Asarcık", "Atakum", "Ayvacık", "Bafra", "Canik", "Çarşamba",
    "Havza", "İlkadım", "Kavak", "Ladik", "Ondokuzmayıs", "Salıpazarı", "Tekkeköy", "Terme", "Vezirköprü", "Yakakent"
  ],
  "trabzon": [
    "Akçaabat", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı",
    "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Ortahisar", "Sürmene", "Şalpazarı", "Tonya", "Vakfıkebir", "Yomra"
  ],
  "sakarya": [
    "Adapazarı", "Akyazı", "Arifiye", "Erenler", "Ferizli", "Geyve", "Hendek",
    "Karapürçek", "Karasu", "Kaynarca", "Kocaali", "Pamukova", "Sapanca", "Serdivan", "Söğütlü", "Taraklı"
  ],
  "mugla": [
    "Bodrum", "Dalaman", "Datça", "Fethiye", "Kavaklıdere", "Köyceğiz", "Marmaris",
    "Menteşe", "Milas", "Ortaca", "Seydikemer", "Ula", "Yatağan"
  ],
  "adiyaman": [
    "Besni", "Çelikhan", "Gerger", "Gölbaşı", "Kahta", "Merkez", "Samsat", "Sincik", "Tut"
  ],
  "afyonkarahisar": [
    "Başmakçı", "Bayat", "Bolvadin", "Çay", "Çobanlar", "Dazkırı", "Dinar", "Emirdağ",
    "Evciler", "Hocalar", "İhsaniye", "İscehisar", "Kızılören", "Merkez", "Sandıklı",
    "Sinanpaşa", "Sultandağı", "Şuhut"
  ],
};

// Room options
const ROOM_OPTIONS = [
  { value: "1+0", label: "Stüdyo (1+0)" },
  { value: "1+1", label: "1+1" },
  { value: "1.5+1", label: "1.5+1" },
  { value: "2+0", label: "2+0" },
  { value: "2+1", label: "2+1" },
  { value: "2.5+1", label: "2.5+1" },
  { value: "2+2", label: "2+2" },
  { value: "3+0", label: "3+0" },
  { value: "3+1", label: "3+1" },
  { value: "3.5+1", label: "3.5+1" },
  { value: "3+2", label: "3+2" },
  { value: "4+1", label: "4+1" },
  { value: "4+2", label: "4+2" },
  { value: "5+1", label: "5+1" },
  { value: "5+2", label: "5+2" },
];

// Project status options
const PROJECT_STATUS = [
  { value: "devam-ediyor", label: "Devam Ediyor" },
  { value: "tamamlandi", label: "Tamamlandı" },
];

const GBP_SYMBOL = "\u00A3";
const USD_SYMBOL = "$";

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

const normalizeProjectType = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (
    normalized === "international" ||
    normalized === "internationalproject" ||
    normalized === "international-project"
  ) {
    return "international-project";
  }
  if (normalized === "special-offer") {
    return "special-offer";
  }
  return "local-project";
};

const LocalProjects = ({ projectType = "local-project", heroTitle = null }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hotOffersQuery = String(searchParams.get("hotOffers") || "")
    .trim()
    .toLowerCase();
  const isHotOffersMode = hotOffersQuery === "1" || hotOffersQuery === "true";
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;
  const { t, i18n } = useTranslation();
  const { data: allProperties, isLoading } = useProperties();
  const resolvedProjectType =
    projectType === "local-project"
      ? normalizeProjectType(searchParams.get("projectType") || projectType)
      : projectType;
  const isSpecialOffersPage = resolvedProjectType === "special-offer";
  const isInternationalPage = resolvedProjectType === "international-project";
  const useUsdPriceFilter =
    resolvedProjectType === "local-project" && !isHotOffersMode;
  const priceFilterCurrency = useUsdPriceFilter ? "USD" : "GBP";
  const priceFilterSymbol = useUsdPriceFilter ? USD_SYMBOL : GBP_SYMBOL;
  const cityOptions = isInternationalPage ? INTERNATIONAL_COUNTRIES : TURKISH_CITIES;
  const districtOptionsByCity = isInternationalPage
    ? INTERNATIONAL_DISTRICTS
    : CITY_DISTRICTS;

  // Filter projects from all properties
  const localProjects = useMemo(() => {
    if (!allProperties) return [];
    
    // In Hot Offers mode include local + international projects
    const filtered = allProperties.filter((p) => {
      if (isHotOffersMode) {
        return (
          p.propertyType === "local-project" ||
          p.propertyType === "international-project"
        );
      }
      return p.propertyType === resolvedProjectType;
    });
    
    return filtered.map((p) => {
      const specialOffers = Array.isArray(p.projeHakkinda?.specialOffers)
        ? p.projeHakkinda.specialOffers.filter((offer) => hasSpecialOfferData(offer))
        : [];
      const legacySpecialOffer = p.projeHakkinda?.specialOffer || {};
      const activeSpecialOffer =
        specialOffers.length > 0
          ? specialOffers[0]
          : hasSpecialOfferData(legacySpecialOffer)
          ? legacySpecialOffer
          : {};
      const hasSpecialOffer = hasSpecialOfferData(activeSpecialOffer);
      const floorPlanPrices =
        p.dairePlanlari
          ?.map((d) => Number(d.fiyat || d.fiyatUSD || 0))
          .filter((price) => price > 0) || [];
      const specialOfferPrice = Number(activeSpecialOffer.priceGBP || activeSpecialOffer.priceUSD || 0);
      const startingPrice =
        Number(p.price || 0) > 0
          ? Number(p.price || 0)
          : specialOfferPrice > 0
          ? specialOfferPrice
          : floorPlanPrices.length > 0
          ? Math.min(...floorPlanPrices)
          : 0;
      const startingCurrency =
        Number(p.price || 0) > 0
          ? p.currency || baseCurrency
          : specialOfferPrice > 0
          ? "GBP"
          : p.currency || baseCurrency;

      const roomTypes = [
        ...(p.dairePlanlari?.map((d) => d.tip).filter(Boolean) || []),
        ...(activeSpecialOffer.roomType ? [activeSpecialOffer.roomType] : []),
      ].filter((value, index, arr) => arr.indexOf(value) === index);

      const areaValues = [
        ...(p.dairePlanlari?.map((d) => Number(d.metrekare || 0)) || []),
        ...(Number(activeSpecialOffer.areaM2 || 0) > 0
          ? [Number(activeSpecialOffer.areaM2)]
          : []),
      ].filter((value) => value > 0);

      const areaMin = areaValues.length > 0 ? Math.min(...areaValues) : 0;
      const areaMax = areaValues.length > 0 ? Math.max(...areaValues) : 0;

      return {
        id: p.id,
        projectPath: resolveProjectPath(p),
        name: activeSpecialOffer.title || p.title,
        city: p.city || "",
        country: p.country || (p.propertyType === "international-project" ? "" : "Turkey"),
        district: p.address || "",
        address: p.address || "",
        rooms: roomTypes,
        areaMin,
        areaMax,
        price: startingPrice,
        currency: startingCurrency,
        deliveryDate: p.deliveryDate || "",
        status: p.projectStatus || "devam-ediyor",
        image: p.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop",
        propertyType: p.propertyType,
        projeHakkinda: p.projeHakkinda,
        dairePlanlari: p.dairePlanlari,
        vaziyetPlani: p.vaziyetPlani,
        ozellikler: p.ozellikler,
        kampanya: p.kampanya,
        mapImage: p.mapImage,
        gyo: Boolean(p.gyo),
        hasSpecialOffer,
        specialOffers,
        specialOffer: {
          title: activeSpecialOffer.title || p.projectName || p.title || "",
          roomType: activeSpecialOffer.roomType || roomTypes[0] || "",
          areaM2: Number(activeSpecialOffer.areaM2 || areaMin || 0),
          priceGBP: specialOfferPrice || startingPrice || 0,
          downPaymentAmount: Number(
            activeSpecialOffer.downPaymentAmount ??
              activeSpecialOffer.downPaymentPercent ??
              0
          ),
          downPaymentPercent: Number(activeSpecialOffer.downPaymentPercent || 0),
          installmentMonths: Number(activeSpecialOffer.installmentMonths || 0),
          locationLabel: activeSpecialOffer.locationLabel || "",
          locationMinutes: Number(activeSpecialOffer.locationMinutes || 0),
        },
      };
    }).filter((project) => (isHotOffersMode ? project.hasSpecialOffer : true));
  }, [allProperties, resolvedProjectType, baseCurrency, isHotOffersMode]);

  // Filter states
  const [selectedCity, setSelectedCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [districtSearch, setDistrictSearch] = useState("");
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [roomSearch, setRoomSearch] = useState("");
  const [projectCategory, setProjectCategory] = useState(
    isSpecialOffersPage ? "special-offer" : ""
  );
  const [hotLocationQuery, setHotLocationQuery] = useState("");
  const [hotPropertyTypeFilter, setHotPropertyTypeFilter] = useState("all");
  const [hotPriceMin, setHotPriceMin] = useState("");
  const [hotPriceMax, setHotPriceMax] = useState("");
  const [priceMinGBP, setPriceMinGBP] = useState("");
  const [priceMaxGBP, setPriceMaxGBP] = useState("");
  const activeHeroBg =
    isInternationalPage && selectedCity
      ? INTERNATIONAL_HERO_IMAGES[selectedCity] || heroBg
      : heroBg;
  const getProjectPathById = (projectId) => {
    const normalized = String(projectId || "").trim();
    if (!normalized) return "/projects";
    const matched = filteredProjects.find(
      (project) => String(project.id || "").trim() === normalized
    );
    return (
      matched?.projectPath ||
      `/projects/${encodeURIComponent(`project-${normalized}`)}`
    );
  };

  useEffect(() => {
    setSelectedCity("");
    setCitySearch("");
    setSelectedDistricts([]);
    setDistrictSearch("");
    setSelectedRooms([]);
    setRoomSearch("");
    setProjectCategory(isSpecialOffersPage ? "special-offer" : "");
    setHotLocationQuery("");
    setHotPropertyTypeFilter("all");
    setHotPriceMin("");
    setHotPriceMax("");
    setPriceMinGBP("");
    setPriceMaxGBP("");
  }, [resolvedProjectType, isSpecialOffersPage, isHotOffersMode]);

  // Popover states
  const [cityPopoverOpened, setCityPopoverOpened] = useState(false);
  const [districtPopoverOpened, setDistrictPopoverOpened] = useState(false);
  const [roomPopoverOpened, setRoomPopoverOpened] = useState(false);
  const [statusPopoverOpened, setStatusPopoverOpened] = useState(false);
  const [pricePopoverOpened, setPricePopoverOpened] = useState(false);
  const [hotStatusPopoverOpened, setHotStatusPopoverOpened] = useState(false);
  const [hotUsePopoverOpened, setHotUsePopoverOpened] = useState(false);
  const [hotPricePopoverOpened, setHotPricePopoverOpened] = useState(false);
  const [hotRoomsPopoverOpened, setHotRoomsPopoverOpened] = useState(false);
  const getCityLabel = (city) =>
    isInternationalPage && city?.value === ""
      ? t("localProjects.allCountries")
      : city?.label || "";

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!citySearch) return cityOptions;
    return cityOptions.filter((city) =>
      getCityLabel(city).toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [citySearch, cityOptions, isInternationalPage, t]);

  // Get districts for selected city
  const currentCityDistricts = useMemo(() => {
    return districtOptionsByCity[selectedCity] || [];
  }, [selectedCity, districtOptionsByCity]);

  // Filter districts based on search
  const filteredDistricts = useMemo(() => {
    if (!districtSearch) return currentCityDistricts;
    return currentCityDistricts.filter((district) =>
      district.toLowerCase().includes(districtSearch.toLowerCase())
    );
  }, [districtSearch, currentCityDistricts]);

  // Filter rooms based on search
  const filteredRooms = useMemo(() => {
    if (!roomSearch) return ROOM_OPTIONS;
    return ROOM_OPTIONS.filter((room) =>
      room.label.toLowerCase().includes(roomSearch.toLowerCase())
    );
  }, [roomSearch]);

  const clearAllFilters = () => {
    setSelectedCity("");
    setCitySearch("");
    setSelectedDistricts([]);
    setDistrictSearch("");
    setSelectedRooms([]);
    setRoomSearch("");
    setPriceMinGBP("");
    setPriceMaxGBP("");
    setProjectCategory(isSpecialOffersPage || isHotOffersMode ? "special-offer" : "");
    setHotLocationQuery("");
    setHotPropertyTypeFilter("all");
    setHotPriceMin("");
    setHotPriceMax("");

    // Close all filter popovers after reset
    setCityPopoverOpened(false);
    setDistrictPopoverOpened(false);
    setRoomPopoverOpened(false);
    setPricePopoverOpened(false);
    setStatusPopoverOpened(false);
    setHotStatusPopoverOpened(false);
    setHotUsePopoverOpened(false);
    setHotPricePopoverOpened(false);
    setHotRoomsPopoverOpened(false);
  };

  const toggleDistrict = (district) => {
    setSelectedDistricts((prev) =>
      prev.includes(district)
        ? prev.filter((d) => d !== district)
        : [...prev, district]
    );
  };

  const toggleRoom = (room) => {
    setSelectedRooms((prev) =>
      prev.includes(room)
        ? prev.filter((r) => r !== room)
        : [...prev, room]
    );
  };

  // Check if selected city has districts
  const hasDistricts = currentCityDistricts.length > 0;

  // Clear districts when city changes
  const handleCityChange = (cityValue) => {
    setSelectedCity(cityValue);
    setSelectedDistricts([]); // Reset districts when city changes
  };

  // Helper function to normalize city name for comparison
  const normalizeCityName = (cityName) => {
    if (!cityName) return "";
    return cityName
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .trim();
  };

  // Filter projects based on selected filters
  const filteredProjects = useMemo(() => {
    return localProjects.filter((project) => {
      // Filter by city
      if (selectedCity) {
        const selectedOption = cityOptions.find((city) => city.value === selectedCity);
        const searchableProjectLocation = normalizeCityName(
          [project.city, project.district, project.address].filter(Boolean).join(" ")
        );

        if (isInternationalPage) {
          const countryAliases = selectedOption?.aliases || [];
          if (
            countryAliases.length > 0 &&
            !countryAliases.some((alias) =>
              searchableProjectLocation.includes(normalizeCityName(alias))
            )
          ) {
            return false;
          }
        } else {
          const projectCity = normalizeCityName(project.city);
          const selectedCityBase = selectedCity.replace(/-tumu|-avrupa|-anadolu/g, "");
          const normalizedSelectedCity = normalizeCityName(selectedCityBase);

          // Check if project city contains the selected city
          if (!projectCity.includes(normalizedSelectedCity)) {
            return false;
          }

          // For Istanbul sub-regions, check the district
          if (selectedCity === "istanbul-avrupa" || selectedCity === "istanbul-anadolu") {
            const projectDistrict = normalizeCityName(project.district || project.address);
            const istanbulEuropeDistricts = CITY_DISTRICTS["istanbul-avrupa"].map((d) =>
              normalizeCityName(d)
            );
            const istanbulAsiaDistricts = CITY_DISTRICTS["istanbul-anadolu"].map((d) =>
              normalizeCityName(d)
            );

            if (selectedCity === "istanbul-avrupa") {
              const isInEurope = istanbulEuropeDistricts.some((d) =>
                projectDistrict.includes(d)
              );
              if (!isInEurope) return false;
            } else if (selectedCity === "istanbul-anadolu") {
              const isInAsia = istanbulAsiaDistricts.some((d) =>
                projectDistrict.includes(d)
              );
              if (!isInAsia) return false;
            }
          }
        }
      }

      // Filter by district
      if (selectedDistricts.length > 0) {
        const projectAddress = normalizeCityName(project.address || project.district || project.city);
        const matchesDistrict = selectedDistricts.some((district) => {
          const districtAliases = district
            .split("/")
            .map((value) => normalizeCityName(value.trim()))
            .filter(Boolean);
          return districtAliases.some((alias) => projectAddress.includes(alias));
        });
        if (!matchesDistrict) return false;
      }

      const projectPrice = Number(project.price || 0);
      const projectCurrency = String(project.currency || baseCurrency).toUpperCase();
      const projectPriceForFilter = convertAmount(
        projectPrice,
        projectCurrency,
        priceFilterCurrency
      );

      if (isHotOffersMode) {
        const searchableLocation = normalizeCityName(
          [
            project.name,
            project.address,
            project.district,
            project.city,
            project.country,
          ]
            .filter(Boolean)
            .join(" ")
        );

        if (
          hotLocationQuery &&
          !searchableLocation.includes(normalizeCityName(hotLocationQuery))
        ) {
          return false;
        }

        if (
          hotPropertyTypeFilter !== "all" &&
          project.propertyType !== hotPropertyTypeFilter
        ) {
          return false;
        }

        if (hotPriceMin && projectPriceForFilter < Number(hotPriceMin)) {
          return false;
        }
        if (hotPriceMax && projectPriceForFilter > Number(hotPriceMax)) {
          return false;
        }
      }

      if (!isHotOffersMode) {
        if (priceMinGBP && projectPriceForFilter < Number(priceMinGBP)) {
          return false;
        }
        if (priceMaxGBP && projectPriceForFilter > Number(priceMaxGBP)) {
          return false;
        }
      }

      // Filter by room types
      if (selectedRooms.length > 0) {
        const projectRooms = (project.rooms || []).map((room) =>
          String(room || "").trim()
        );
        const matchesRoom = selectedRooms.some((room) =>
          projectRooms.some((projectRoom) => projectRoom.includes(room))
        );
        if (!matchesRoom) return false;
      }

      // Filter by category/status tabs
      if (projectCategory === "special-offer" && !project.hasSpecialOffer) {
        return false;
      }
      if (projectCategory === "devam-ediyor" && project.status !== "devam-ediyor") {
        return false;
      }
      if (projectCategory === "tamamlandi" && project.status !== "tamamlandi") {
        return false;
      }

      return true;
    });
  }, [
    cityOptions,
    hotLocationQuery,
    hotPriceMax,
    hotPriceMin,
    hotPropertyTypeFilter,
    isHotOffersMode,
    isInternationalPage,
    localProjects,
    baseCurrency,
    convertAmount,
    priceFilterCurrency,
    priceMaxGBP,
    priceMinGBP,
    projectCategory,
    selectedCity,
    selectedDistricts,
    selectedRooms,
  ]);

  const mapProjects = useMemo(
    () =>
      filteredProjects.map((project) => ({
        id: project.id,
        title: project.name,
        image: project.image,
        address: project.address || project.district || "",
        city: project.city || "",
        country: project.country || "",
        price: Number(project.price || 0),
        currency: project.currency || baseCurrency,
      })),
    [filteredProjects, baseCurrency]
  );

  const hotOffersCards = useMemo(
    () =>
      filteredProjects.map((project) => ({
        id: project.id,
        title: project.name,
        image: project.image,
        address: project.address || project.district || "",
        city: project.city || "",
        country: project.country || "",
        description: project.kampanya || "",
        price: Number(project.price || 0),
        currency: project.currency || baseCurrency,
        propertyType: project.propertyType,
        category: project.propertyType,
        offBadge: true,
        dairePlanlari: project.dairePlanlari || [],
      })),
    [filteredProjects, baseCurrency]
  );

  if (isHotOffersMode) {
    const hotStatusLabel =
      !projectCategory
        ? t("listing.all")
        : projectCategory === "devam-ediyor"
        ? t("localProjects.ongoing")
        : projectCategory === "tamamlandi"
        ? t("localProjects.completed")
        : t("listing.all");
    const hotPropertyTypeLabel =
      hotPropertyTypeFilter === "all"
        ? t("listing.propertyUses")
        : hotPropertyTypeFilter === "local-project"
        ? t("nav.localProjects")
        : t("nav.internationalProjects");

    return (
      <div className="min-h-screen pt-24 bg-white">
        <div className="border-y border-slate-200 bg-[#f4f5f7]">
          <div className="w-full px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1 max-w-[420px]">
                <MdLocationOn
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  type="text"
                  value={hotLocationQuery}
                  onChange={(e) => setHotLocationQuery(e.target.value)}
                  placeholder={t("listing.locationPlaceholder")}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-10 text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
                <MdSearch
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setHotLocationQuery("");
                  setHotPropertyTypeFilter("all");
                  setHotPriceMin("");
                  setHotPriceMax("");
                  setSelectedCity("");
                  setSelectedDistricts([]);
                  setSelectedRooms([]);
                  setPriceMinGBP("");
                  setPriceMaxGBP("");
                  setProjectCategory("");
                }}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#0f1f3a] bg-[#0f1f3a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#152a4c]"
              >
                <MdTune size={16} />
                <span>{t("listing.allFilters")}</span>
              </button>

              <Popover
                opened={hotStatusPopoverOpened}
                onChange={setHotStatusPopoverOpened}
                width={170}
                position="bottom-start"
                shadow="md"
              >
                <Popover.Target>
                  <button
                    type="button"
                    onClick={() => setHotStatusPopoverOpened((o) => !o)}
                    className="inline-flex h-12 min-w-[86px] items-center justify-between gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700"
                  >
                    <span>{hotStatusLabel}</span>
                    <MdKeyboardArrowDown
                      size={18}
                      className={`${hotStatusPopoverOpened ? "" : "rotate-180"} transition-transform`}
                    />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-1">
                  <div
                    className={`cursor-pointer rounded px-3 py-2 text-sm ${
                      !projectCategory ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      setProjectCategory("");
                      setHotStatusPopoverOpened(false);
                    }}
                  >
                    {t("listing.all")}
                  </div>
                  <div
                    className={`cursor-pointer rounded px-3 py-2 text-sm ${
                      projectCategory === "devam-ediyor"
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      setProjectCategory("devam-ediyor");
                      setHotStatusPopoverOpened(false);
                    }}
                  >
                    {t("localProjects.ongoing")}
                  </div>
                  <div
                    className={`cursor-pointer rounded px-3 py-2 text-sm ${
                      projectCategory === "tamamlandi"
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      setProjectCategory("tamamlandi");
                      setHotStatusPopoverOpened(false);
                    }}
                  >
                    {t("localProjects.completed")}
                  </div>
                </Popover.Dropdown>
              </Popover>

              <Popover
                opened={hotUsePopoverOpened}
                onChange={setHotUsePopoverOpened}
                width={210}
                position="bottom-start"
                shadow="md"
              >
                <Popover.Target>
                  <button
                    type="button"
                    onClick={() => setHotUsePopoverOpened((o) => !o)}
                    className="inline-flex h-12 min-w-[150px] items-center justify-between gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700"
                  >
                    <span className="truncate">{hotPropertyTypeLabel}</span>
                    <MdKeyboardArrowDown
                      size={18}
                      className={`${hotUsePopoverOpened ? "" : "rotate-180"} transition-transform`}
                    />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-1">
                  <div
                    className={`cursor-pointer rounded px-3 py-2 text-sm ${
                      hotPropertyTypeFilter === "all"
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      setHotPropertyTypeFilter("all");
                      setHotUsePopoverOpened(false);
                    }}
                  >
                    {t("listing.all")}
                  </div>
                  <div
                    className={`cursor-pointer rounded px-3 py-2 text-sm ${
                      hotPropertyTypeFilter === "local-project"
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      setHotPropertyTypeFilter("local-project");
                      setHotUsePopoverOpened(false);
                    }}
                  >
                    {t("nav.localProjects")}
                  </div>
                  <div
                    className={`cursor-pointer rounded px-3 py-2 text-sm ${
                      hotPropertyTypeFilter === "international-project"
                        ? "bg-blue-600 text-white"
                        : "text-slate-700 hover:bg-blue-50"
                    }`}
                    onClick={() => {
                      setHotPropertyTypeFilter("international-project");
                      setHotUsePopoverOpened(false);
                    }}
                  >
                    {t("nav.internationalProjects")}
                  </div>
                </Popover.Dropdown>
              </Popover>

              <Popover
                opened={hotPricePopoverOpened}
                onChange={setHotPricePopoverOpened}
                width={280}
                position="bottom-start"
                shadow="md"
              >
                <Popover.Target>
                  <button
                    type="button"
                    onClick={() => setHotPricePopoverOpened((o) => !o)}
                    className="inline-flex h-12 min-w-[100px] items-center justify-between gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700"
                  >
                    <span>{`${t("listing.price")} (${priceFilterSymbol})`}</span>
                    <MdKeyboardArrowDown
                      size={18}
                      className={`${hotPricePopoverOpened ? "" : "rotate-180"} transition-transform`}
                    />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-3">
                  <div className="mb-2 text-xs text-slate-500">{`${t("listing.priceRange")} (${priceFilterSymbol})`}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hotPriceMin}
                      onChange={(e) => setHotPriceMin(e.target.value)}
                      placeholder={`${t("listing.minPrice")} (${priceFilterSymbol})`}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      value={hotPriceMax}
                      onChange={(e) => setHotPriceMax(e.target.value)}
                      placeholder={`${t("listing.maxPrice")} (${priceFilterSymbol})`}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setHotPricePopoverOpened(false)}
                    className="mt-3 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t("listing.applyFilters")}
                  </button>
                </Popover.Dropdown>
              </Popover>

              <Popover
                opened={hotRoomsPopoverOpened}
                onChange={setHotRoomsPopoverOpened}
                width={220}
                position="bottom-start"
                shadow="md"
              >
                <Popover.Target>
                  <button
                    type="button"
                    onClick={() => setHotRoomsPopoverOpened((o) => !o)}
                    className="inline-flex h-12 min-w-[110px] items-center justify-between gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-700"
                  >
                    <span>
                      {selectedRooms.length > 0
                        ? `${selectedRooms.length} ${t("localProjects.rooms")}`
                        : t("listing.rooms")}
                    </span>
                    <MdKeyboardArrowDown
                      size={18}
                      className={`${hotRoomsPopoverOpened ? "" : "rotate-180"} transition-transform`}
                    />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-2">
                  <ScrollArea h={220}>
                    {ROOM_OPTIONS.map((room) => (
                      <Checkbox
                        key={room.value}
                        label={room.label}
                        size="xs"
                        checked={selectedRooms.includes(room.value)}
                        onChange={() => toggleRoom(room.value)}
                        className="py-1"
                      />
                    ))}
                  </ScrollArea>
                </Popover.Dropdown>
              </Popover>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-[60%] h-[360px] lg:h-[calc(100vh-170px)]">
            <PropertiesMap
              properties={mapProjects}
              onPropertyClick={(id) => navigate(getProjectPathById(id))}
              resizeKey={filteredProjects.length}
            />
          </div>

          <div className="w-full lg:w-[40%] h-auto lg:h-[calc(100vh-170px)] bg-white border-l border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <h1 className="text-2xl font-bold text-slate-900">{t("footer.hotOffers")}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {filteredProjects.length} {t("localProjects.projectsFound")}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
              {hotOffersCards.length > 0 ? (
                hotOffersCards.map((project) => (
                  <div key={project.id} className="relative">
                    <PropertyCard property={project} />
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>{t("localProjects.noProjectsFound")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#f7f3ea]">
      {/* Hero Section - Compact */}
      <Container size="lg" className="py-4">
        <div className="relative rounded-xl overflow-hidden h-auto min-h-[450px] md:min-h-[280px]">
          {/* Background Image */}
          <img
            src={activeHeroBg}
            alt="Konut Projeleri"
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/30" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-4 py-6 md:py-4">
            <h1 className="text-white text-xl md:text-2xl font-medium mb-6 text-center drop-shadow-lg">
              {heroTitle ||
                (isSpecialOffersPage
                  ? t("nav.featuredProperties")
                  : isHotOffersMode
                  ? t("footer.hotOffers")
                  : isInternationalPage
                  ? t("nav.internationalProjects")
                  : t("localProjects.heroTitle"))}
            </h1>

            {/* Search Box */}
            <div className="bg-white rounded-lg border-[3px] border-slate-200 shadow-[0_20px_55px_rgba(15,23,42,0.28)] ring-2 ring-white/70 flex flex-col md:flex-row items-stretch md:items-center divide-y md:divide-y-0 md:divide-x divide-gray-200 w-full max-w-4xl mx-4">
              {/* City Select */}
              <Popover
                opened={cityPopoverOpened}
                onChange={setCityPopoverOpened}
                width={220}
                position="bottom-start"
                shadow="md"
              >
                <Popover.Target>
                  <button
                    className="flex items-center justify-between gap-2 px-4 py-3 md:py-2.5 md:min-w-[140px] transition-colors w-full md:w-auto"
                    onClick={() => setCityPopoverOpened((o) => !o)}
                  >
                    <span className="text-sm text-gray-700">
                      {getCityLabel(cityOptions.find((c) => c.value === selectedCity)) ||
                        t("localProjects.city")}
                    </span>
                    <MdKeyboardArrowDown className="text-gray-400" size={18} />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-0">
                  <div className="p-2 border-b">
                    <TextInput
                      placeholder={`${t("localProjects.search")}...`}
                      size="xs"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      rightSection={<MdSearch size={14} />}
                    />
                  </div>
                  <ScrollArea h={200} className="p-1">
                    {filteredCities.map((city) => (
                      <div
                        key={city.value}
                        className={`px-3 py-1.5 text-sm cursor-pointer rounded hover:bg-blue-50 ${
                          selectedCity === city.value ? "bg-blue-500 text-white hover:bg-blue-500" : "text-gray-700"
                        }`}
                        onClick={() => {
                          handleCityChange(city.value);
                          setCityPopoverOpened(false);
                          setCitySearch("");
                        }}
                      >
                        {getCityLabel(city)}
                      </div>
                    ))}
                  </ScrollArea>
                </Popover.Dropdown>
              </Popover>

              {/* District Select */}
              <Popover
                opened={districtPopoverOpened}
                onChange={setDistrictPopoverOpened}
                width={220}
                position="bottom-start"
                shadow="md"
                disabled={!hasDistricts}
              >
                <Popover.Target>
                  <button
                    className={`flex items-center justify-between gap-2 px-4 py-3 md:py-2.5 md:min-w-[100px] transition-colors w-full md:w-auto ${
                      !hasDistricts ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() =>
                      hasDistricts && setDistrictPopoverOpened((o) => !o)
                    }
                  >
                    <span className="text-sm text-gray-700">
                      {selectedDistricts.length > 0
                        ? `${selectedDistricts.length} ${t("localProjects.district")}`
                        : t("localProjects.district")}
                    </span>
                    <MdKeyboardArrowDown className="text-gray-400" size={18} />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-0">
                  <div className="p-2 border-b">
                    <TextInput
                      placeholder={t("localProjects.district")}
                      size="xs"
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                      rightSection={<MdSearch size={14} />}
                    />
                  </div>
                  <ScrollArea h={200} className="p-2">
                    {filteredDistricts.map((district) => (
                      <Checkbox
                        key={district}
                        label={district}
                        size="xs"
                        checked={selectedDistricts.includes(district)}
                        onChange={() => toggleDistrict(district)}
                        className="py-1"
                      />
                    ))}
                  </ScrollArea>
                </Popover.Dropdown>
              </Popover>

              {/* Room Select */}
              <Popover
                opened={roomPopoverOpened}
                onChange={setRoomPopoverOpened}
                width={180}
                position="bottom-start"
                shadow="md"
              >
                <Popover.Target>
                  <button
                    className="flex items-center justify-between gap-2 px-4 py-3 md:py-2.5 md:min-w-[110px] transition-colors w-full md:w-auto"
                    onClick={() => setRoomPopoverOpened((o) => !o)}
                  >
                    <span className="text-sm text-gray-700">
                      {selectedRooms.length > 0 ? `${selectedRooms.length} ${t("localProjects.rooms")}` : t("localProjects.selectRooms")}
                    </span>
                    <MdKeyboardArrowDown className="text-gray-400" size={18} />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-0">
                  <div className="p-2 border-b">
                    <TextInput
                      placeholder={t("localProjects.rooms")}
                      size="xs"
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      rightSection={<MdSearch size={14} />}
                    />
                  </div>
                  <ScrollArea h={200} className="p-2">
                    {filteredRooms.map((room) => (
                      <Checkbox
                        key={room.value}
                        label={room.label}
                        size="xs"
                        checked={selectedRooms.includes(room.value)}
                        onChange={() => toggleRoom(room.value)}
                        className="py-1"
                      />
                    ))}
                  </ScrollArea>
                </Popover.Dropdown>
              </Popover>

              {/* Price Select */}
              <Popover
                opened={pricePopoverOpened}
                onChange={setPricePopoverOpened}
                width={260}
                position="bottom-start"
                shadow="md"
              >
                <Popover.Target>
                  <button
                    className="flex items-center justify-between gap-2 px-4 py-3 md:py-2.5 md:min-w-[120px] transition-colors w-full md:w-auto"
                    onClick={() => setPricePopoverOpened((o) => !o)}
                  >
                    <span className="text-sm text-gray-700">
                      {priceMinGBP || priceMaxGBP
                        ? `${priceFilterSymbol}${priceMinGBP || "0"} - ${priceFilterSymbol}${priceMaxGBP || "∞"}`
                        : `${t("listing.price")} (${priceFilterSymbol})`}
                    </span>
                    <MdKeyboardArrowDown className="text-gray-400" size={18} />
                  </button>
                </Popover.Target>
                <Popover.Dropdown className="p-3">
                  <div className="mb-2 text-xs text-slate-500">{`${t("listing.priceRange")} (${priceFilterSymbol})`}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceMinGBP}
                      onChange={(e) => setPriceMinGBP(e.target.value)}
                      placeholder={`${t("listing.minPrice")} (${priceFilterSymbol})`}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      value={priceMaxGBP}
                      onChange={(e) => setPriceMaxGBP(e.target.value)}
                      placeholder={`${t("listing.maxPrice")} (${priceFilterSymbol})`}
                      className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPricePopoverOpened(false)}
                    className="mt-3 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t("listing.applyFilters")}
                  </button>
                </Popover.Dropdown>
              </Popover>

              {/* Project Status Select */}
              {!isHotOffersMode && (
                <Popover
                  opened={statusPopoverOpened}
                  onChange={setStatusPopoverOpened}
                  width={160}
                  position="bottom-start"
                  shadow="md"
                >
                  <Popover.Target>
                    <button
                      className="flex items-center justify-between gap-2 px-4 py-3 md:py-2.5 md:min-w-[120px] transition-colors w-full md:w-auto"
                      onClick={() => setStatusPopoverOpened((o) => !o)}
                    >
                      <span className="text-sm text-gray-700">
                        {projectCategory
                          ? projectCategory === "devam-ediyor"
                            ? t("localProjects.ongoing")
                            : projectCategory === "tamamlandi"
                            ? t("localProjects.completed")
                            : t("nav.featuredProperties")
                          : t("localProjects.projectStatus")}
                      </span>
                      <MdKeyboardArrowDown className="text-gray-400" size={18} />
                    </button>
                  </Popover.Target>
                  <Popover.Dropdown className="p-1">
                    {PROJECT_STATUS.map((status) => (
                      <div
                        key={status.value}
                        className={`px-3 py-1.5 text-sm cursor-pointer rounded hover:bg-blue-50 ${
                          projectCategory === status.value ? "bg-blue-500 text-white hover:bg-blue-500" : "text-gray-700"
                        }`}
                        onClick={() => {
                          setProjectCategory(status.value);
                          setStatusPopoverOpened(false);
                        }}
                      >
                        {status.value === "devam-ediyor" ? t("localProjects.ongoing") : t("localProjects.completed")}
                      </div>
                    ))}
                    <div
                      className={`px-3 py-1.5 text-sm cursor-pointer rounded hover:bg-blue-50 ${
                        projectCategory === "special-offer" ? "bg-blue-500 text-white hover:bg-blue-500" : "text-gray-700"
                      }`}
                      onClick={() => {
                        setProjectCategory("special-offer");
                        setStatusPopoverOpened(false);
                      }}
                    >
                      {t("nav.featuredProperties")}
                    </div>
                    <div
                      className={`px-3 py-1.5 text-sm cursor-pointer rounded hover:bg-blue-50 ${
                        !projectCategory ? "bg-blue-500 text-white hover:bg-blue-500" : "text-gray-700"
                      }`}
                      onClick={() => {
                        setProjectCategory("");
                        setStatusPopoverOpened(false);
                      }}
                    >
                      {t("localProjects.allProjects")}
                    </div>
                  </Popover.Dropdown>
                </Popover>
              )}

              {/* Clear Filters Button */}
              <Button
                color="blue"
                size="sm"
                className="rounded-none md:rounded-r-md rounded-b-md w-full md:w-auto"
                style={{ height: "46px" }}
                onClick={clearAllFilters}
              >
                {t("localProjects.clearAll", "Clear Filters")}
              </Button>
            </div>
          </div>
        </div>
      </Container>

      {/* Projects Listing Section */}
      <Container size="lg" className="py-8">
        {/* Active Filters Summary */}
        {(selectedCity || selectedDistricts.length > 0 || priceMinGBP || priceMaxGBP) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-slate-500 text-sm">{t("localProjects.activeFilters")}:</span>
            
            {selectedCity && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs">
                {getCityLabel(cityOptions.find((c) => c.value === selectedCity))}
                <button
                  onClick={() => handleCityChange("")}
                  className="ml-1 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            
            {selectedDistricts.map(district => (
              <span key={district} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-xs">
                {district}
                <button
                  onClick={() => toggleDistrict(district)}
                  className="ml-1 hover:text-emerald-900"
                >
                  ×
                </button>
              </span>
            ))}

            {(priceMinGBP || priceMaxGBP) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded text-xs">
                {`${priceFilterSymbol}${priceMinGBP || "0"} - ${priceFilterSymbol}${priceMaxGBP || "∞"}`}
                <button
                  onClick={() => {
                    setPriceMinGBP("");
                    setPriceMaxGBP("");
                  }}
                  className="ml-1 hover:text-amber-900"
                >
                  Ã—
                </button>
              </span>
            )}
            
            <button
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-700 underline ml-2"
            >
              {t("localProjects.clearAll")}
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="text-slate-600 text-sm mb-4">
          {filteredProjects.length} {t("localProjects.projectsFound")}
        </div>

        {/* Tabs */}
        {!isHotOffersMode && (
          <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                !projectCategory
                  ? "text-slate-900 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setProjectCategory("")}
            >
              {t("localProjects.allProjects")}
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                projectCategory === "devam-ediyor"
                  ? "text-slate-900 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setProjectCategory("devam-ediyor")}
            >
              {t("localProjects.ongoing")}
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                projectCategory === "tamamlandi"
                  ? "text-slate-900 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setProjectCategory("tamamlandi")}
            >
              {t("localProjects.completed")}
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                projectCategory === "special-offer"
                  ? "text-slate-900 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setProjectCategory("special-offer")}
            >
              {t("nav.featuredProperties")}
            </button>
          </div>
        )}

        {/* Project Cards */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader size="lg" />
          </div>
        ) : (
        <div
          className={
            isHotOffersMode
              ? "grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
              : "space-y-3"
          }
        >
          {isHotOffersMode && (
            <div className="lg:col-span-7 h-[420px] lg:h-[680px] rounded-xl overflow-hidden border border-slate-200 bg-white sticky top-28">
              <PropertiesMap
                properties={mapProjects}
                onPropertyClick={(id) => navigate(getProjectPathById(id))}
                resizeKey={filteredProjects.length}
              />
            </div>
          )}
          <div
            className={
              isHotOffersMode
                ? "lg:col-span-5 space-y-3 max-h-[680px] overflow-y-auto pr-1"
                : "space-y-3"
            }
          >
          {filteredProjects.map((project) => (
              <div
                key={project.id}
                className={`overflow-hidden transition-shadow cursor-pointer border ${
                  isSpecialOffersPage
                    ? "bg-white rounded-xl border-rose-200 hover:shadow-lg hover:shadow-rose-100"
                    : "bg-white rounded-md border-gray-200 hover:shadow-md"
                }`}
                onClick={() =>
                  navigate(
                    project.projectPath ||
                      `/projects/${encodeURIComponent(`project-${project.id}`)}`
                  )
                }
              >
                <div className={`flex flex-col md:flex-row ${isSpecialOffersPage ? "relative" : ""}`}>
                  {/* Project Image */}
                  <div className={`relative w-full flex-shrink-0 ${isSpecialOffersPage ? "md:w-52 h-32 md:h-24" : "md:w-40 h-32 md:h-24"}`}>
                    <img
                      src={getOptimizedImageUrl(project.image, { width: 520, height: 320 })}
                      alt={project.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    {(isSpecialOffersPage || project.hasSpecialOffer) && (
                      <div className="absolute left-3 top-3 rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
                        {isSpecialOffersPage ? "SPECIAL OFFER" : "OFF"}
                      </div>
                    )}
                  </div>

                  {/* Project Info */}
                  <div className={`flex-1 ${isSpecialOffersPage ? "p-3" : "p-3"}`}>
                    {isSpecialOffersPage ? (
                      <>
                        <div className="mb-2 flex flex-wrap items-center gap-5 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  project.projectPath ||
                                    `/projects/${encodeURIComponent(
                                      `project-${project.id}`
                                    )}`
                                );
                              }}
                              className="text-blue-500 underline hover:text-blue-600 transition-colors"
                            >
                              {project.city}, {project.district}
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>{project.specialOffer?.roomType || project.rooms.join(" ") || "-"}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            <span>
                              {project.specialOffer?.areaM2 > 0
                                ? `${project.specialOffer.areaM2} m²`
                                : project.areaMin === project.areaMax
                                ? `${project.areaMin} m²`
                                : `${project.areaMin} - ${project.areaMax} m²`}{" "}
                              <span className="text-gray-400">({t("localProjects.gross")})</span>
                            </span>
                          </div>
                        </div>

                        {project.kampanya && (
                          <div className="mb-2 line-clamp-1 text-xs text-rose-700">
                            {project.kampanya}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            {project.price > 0 ? (
                              <>
                                <span className="text-gray-500 font-normal">{t("localProjects.startingFrom", "Başlangıç")}: </span>
                                <span className="text-sm font-semibold text-gray-800">
                                  {formatMoney(
                                    convertAmount(
                                      project.price,
                                      project.currency || "USD",
                                      "TRY"
                                    ),
                                    "TRY",
                                    "tr-TR"
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-500">
                                {t("localProjects.contactForPrice", "Fiyat için iletişime geçin")}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {project.deliveryDate}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                    {/* Top Row: Location, Rooms, Area */}
                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-2">
                      {/* Location */}
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              project.projectPath ||
                                `/projects/${encodeURIComponent(
                                  `project-${project.id}`
                                )}`
                            );
                          }}
                          className="text-blue-500 underline hover:text-blue-600 transition-colors"
                        >
                          {project.city}, {project.district}
                        </button>
                      </div>

                      {/* Room Types */}
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{project.rooms.join(" ") || "-"}</span>
                      </div>

                      {/* Area */}
                      <div className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span>
                          {project.areaMin === project.areaMax
                            ? `${project.areaMin} m²`
                            : `${project.areaMin} - ${project.areaMax} m²`}{" "}
                          <span className="text-gray-400">({t("localProjects.gross")})</span>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Price and Delivery */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-800">
                        {project.price > 0 ? (
                          <>
                            <span className="text-gray-500 font-normal">{t("localProjects.startingFrom", "Başlangıç")}: </span>
                            {formatMoney(
                              convertAmount(
                                project.price,
                                project.currency || baseCurrency,
                                displayCurrency
                              ),
                              displayCurrency,
                              i18n.language === "tr" ? "tr-TR" : "en-US"
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500">{t("localProjects.contactForPrice", "Fiyat için iletişime geçin")}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {project.deliveryDate}
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                  {project.gyo && (
                    <div className="flex items-center justify-end md:justify-center px-3 pb-3 md:pb-0">
                      <div className="min-w-[60px] rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1 text-center text-xs font-semibold text-white">
                        GYO
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Show message if no projects */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>{t("localProjects.noProjectsFound")}</p>
          </div>
        )}
      </Container>
    </div>
  );
};

LocalProjects.propTypes = {
  projectType: PropTypes.string,
  heroTitle: PropTypes.string,
};

export default LocalProjects;
