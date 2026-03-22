import { useState, useContext } from "react";
import {
  Box,
  Button,
  Group,
  NumberInput,
  TextInput,
  Select,
  Textarea,
  Text,
  Grid,
  Avatar,
  Paper,
  Divider,
  ActionIcon,
  Checkbox,
  Tabs,
  Image,
  ScrollArea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import PropTypes from "prop-types";
import {
  MdDelete,
  MdAdd,
  MdOutlineCloudUpload,
  MdClose,
  MdInfo,
  MdMap,
  MdLocationOn,
  MdPerson,
} from "react-icons/md";
import { BsBuilding, BsGrid, BsShield, BsTree, BsEye, BsPeople } from "react-icons/bs";
import { FaWheelchair, FaShoppingCart } from "react-icons/fa";
import useConsultants from "../hooks/useConsultants";
import CurrencyContext from "../context/CurrencyContext";
import { pickAndUploadImages } from "../utils/blobUpload";
import UploadProgressBar from "./UploadProgressBar";

// Feature categories for projects
const BINA_OZELLIKLERI = [
  "Akıllı Ev",
  "Alarm (Yangın)",
  "Intercom Sistemi",
  "Kablo TV",
  "Jeneratör",
  "Ses Yalıtımı",
  "Su Deposu",
];

const DIS_OZELLIKLER = [
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

const ENGELLI_YASLI_UYGUN = [
  "Engelli Asansörü",
  "Engelli Rampası",
  "Engelli WC",
  "Yaşlı Dostu Tasarım",
  "Görme Engelli Yardımcıları",
];

const EGLENCE_ALISVERIS = [
  "AVM / Shopping Mall",
  "Restoran / Restaurant",
  "Cafe",
  "Sinema / Cinema",
  "Fitness Salonu / Gym",
  "Çocuk Kulübü / Kids Club",
];

const GUVENLIK = [
  "24 Saat Güvenlik",
  "Güvenlik Kamerası",
  "Kartlı Giriş Sistemi",
  "Yangın Merdiveni",
  "Yangın Söndürme Sistemi",
];

const MANZARA = [
  "Şehir Manzarası",
  "Deniz Manzarası",
  "Göl Manzarası",
  "Orman Manzarası",
  "Havuz Manzarası",
  "Bahçe Manzarası",
];

const MUHIT = [
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

const FIAT_CURRENCIES = ["USD", "EUR", "GBP", "TRY"];
const FLOOR_PLAN_PRICE_FIELDS = {
  USD: "fiyatUSD",
  EUR: "fiyatEUR",
  GBP: "fiyatGBP",
  TRY: "fiyatTRY",
};

const normalizeFiatCurrency = (currencyCode) => {
  const defaultFromEnv = String(
    import.meta.env.VITE_DEFAULT_FIAT_CURRENCY || "USD"
  ).toUpperCase();
  const fallback = FIAT_CURRENCIES.includes(defaultFromEnv)
    ? defaultFromEnv
    : "USD";
  const normalized = String(currencyCode || "").toUpperCase();
  return FIAT_CURRENCIES.includes(normalized) ? normalized : fallback;
};

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

const getInitialSpecialOffers = (propertyDetails = {}) => {
  const specialOffers = Array.isArray(propertyDetails.projeHakkinda?.specialOffers)
    ? propertyDetails.projeHakkinda.specialOffers
        .filter((offer) => offer && typeof offer === "object")
        .map((offer) => createSpecialOfferDraft(offer))
    : [];

  if (specialOffers.length > 0) return specialOffers;

  if (hasSpecialOfferData(propertyDetails.projeHakkinda?.specialOffer)) {
    return [createSpecialOfferDraft(propertyDetails.projeHakkinda.specialOffer)];
  }

  return [
    createSpecialOfferDraft({
      title: propertyDetails.projectName || "",
      roomType: propertyDetails.dairePlanlari?.[0]?.tip || "",
      areaM2: propertyDetails.dairePlanlari?.[0]?.metrekare || 0,
      priceGBP:
        propertyDetails.dairePlanlari?.[0]?.fiyatGBP ||
        propertyDetails.dairePlanlari?.[0]?.fiyatUSD ||
        propertyDetails.dairePlanlari?.[0]?.fiyat ||
        0,
      downPaymentPercent: 0,
      installmentMonths: 0,
      locationLabel: "",
      locationMinutes: 0,
    }),
  ];
};

const hasAnySpecialOfferData = (specialOffers = []) =>
  Array.isArray(specialOffers) &&
  specialOffers.some((offer) => hasSpecialOfferData(offer));

const formatUsdAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const ProjectDetails = ({
  prevStep,
  nextStep,
  propertyDetails,
  setPropertyDetails,
}) => {
  const [imageUploading, setImageUploading] = useState(false);
  const [mapImageUploading, setMapImageUploading] = useState(false);
  const [floorPlanUploading, setFloorPlanUploading] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const { data: consultants, isLoading: consultantsLoading } = useConsultants();
  const { convertAmount } = useContext(CurrencyContext);
  const floorPlanBaseCurrency = normalizeFiatCurrency(propertyDetails.currency);
  const isSpecialOfferType = propertyDetails.propertyType === "special-offer";
  const initialSpecialOffers = getInitialSpecialOffers(propertyDetails);
  const [isSpecialOfferEnabled, setIsSpecialOfferEnabled] = useState(() =>
    isSpecialOfferType ||
    hasAnySpecialOfferData(propertyDetails.projeHakkinda?.specialOffers) ||
    hasSpecialOfferData(propertyDetails.projeHakkinda?.specialOffer)
  );
  const isSpecialOfferActive = isSpecialOfferType || isSpecialOfferEnabled;

  const form = useForm({
    initialValues: {
      // Proje Adı
      projectName: propertyDetails.projectName || "",
      // İlan Numarası
      ilanNo: propertyDetails.ilanNo || "",
      // Danışman
      consultantId: propertyDetails.consultantId || "",
      // Proje Hakkında
      projeAlani: propertyDetails.projeHakkinda?.projeAlani || 0,
      yesilAlan: propertyDetails.projeHakkinda?.yesilAlan || 0,
      konutSayisi: propertyDetails.projeHakkinda?.konutSayisi || 0,
      projeAciklama_tr: propertyDetails.projeHakkinda?.description_tr || propertyDetails.projeHakkinda?.description || "",
      projeAciklama_en: propertyDetails.projeHakkinda?.description_en || "",
      projeAciklama_ru: propertyDetails.projeHakkinda?.description_ru || "",
      // Kampanya
      kampanya: propertyDetails.kampanya || "",
      // Teslim Tarihi ve Proje Durumu
      deliveryDate: propertyDetails.deliveryDate || "",
      projectStatus: propertyDetails.projectStatus || "devam-ediyor",
      listingStatus:
        normalizeListingStatus(propertyDetails.listingStatus) ||
        listingStatusFromProjectStatus(propertyDetails.projectStatus) ||
        "offplan",
      gyo: Boolean(propertyDetails.gyo),
      // Facilities
      bedrooms: propertyDetails.facilities?.bedrooms || 0,
      bathrooms: propertyDetails.facilities?.bathrooms || 0,
      parkings: propertyDetails.facilities?.parkings || 0,
      // Yakın Mesafeler
      yakinMesafeler: propertyDetails.projeHakkinda?.yakinMesafeler || [],
      // Daire Planları
      dairePlanlari: (propertyDetails.dairePlanlari || []).map((plan) => ({
        ...plan,
        currency: normalizeFiatCurrency(
          plan?.currency || propertyDetails.currency
        ),
      })),
      // Vaziyet Planı
      vaziyetPlani: propertyDetails.vaziyetPlani || "",
      // Harita Görseli
      brochureUrl: propertyDetails.brochureUrl || "",
      mapImage: propertyDetails.mapImage || "",
      specialOffers: initialSpecialOffers,
      // Özellikler
      binaOzellikleri: propertyDetails.ozellikler?.binaOzellikleri || [],
      disOzellikler: propertyDetails.ozellikler?.disOzellikler || [],
      engelliYasliUygun: propertyDetails.ozellikler?.engelliYasliUygun || [],
      eglenceAlisveris: propertyDetails.ozellikler?.eglenceAlisveris || [],
      guvenlik: propertyDetails.ozellikler?.guvenlik || [],
      manzara: propertyDetails.ozellikler?.manzara || [],
      muhit: propertyDetails.ozellikler?.muhit || [],
    },
  });

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
    const plans = [...form.values.dairePlanlari];
    const currentPlan = { ...(plans[index] || {}) };
    const sourceValue = toRoundedPrice(value);

    FIAT_CURRENCIES.forEach((currencyCode) => {
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
    plans[index] = currentPlan;
    form.setFieldValue("dairePlanlari", plans);
  };

  const openSitePlanUpload = async () => {
    try {
      setImageUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({
        multiple: false,
        onProgress: setUploadProgress,
      });
      if (urls.length) form.setFieldValue("vaziyetPlani", urls[0]);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setImageUploading(false);
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
      if (urls.length) form.setFieldValue("mapImage", urls[0]);
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
        const plans = [...form.values.dairePlanlari];
        plans[index].image = urls[0];
        form.setFieldValue("dairePlanlari", plans);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setFloorPlanUploading(null);
      setUploadProgress(null);
    }
  };

  const addFloorPlan = () => {
    const newPlan = {
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
    };
    form.setFieldValue("dairePlanlari", [...form.values.dairePlanlari, newPlan]);
  };

  const addYakinMesafe = () => {
    form.setFieldValue("yakinMesafeler", [...form.values.yakinMesafeler, { yer: "", mesafe: "" }]);
  };

  const removeYakinMesafe = (index) => {
    const mesafeler = form.values.yakinMesafeler.filter((_, i) => i !== index);
    form.setFieldValue("yakinMesafeler", mesafeler);
  };

  const removeFloorPlan = (index) => {
    const plans = form.values.dairePlanlari.filter((_, i) => i !== index);
    form.setFieldValue("dairePlanlari", plans);
  };

  const addSpecialOffer = () => {
    const firstOffer = form.values.specialOffers?.[0] || {};
    const newOffer = createSpecialOfferDraft({
      title: form.values.projectName || firstOffer.title || "",
      roomType: firstOffer.roomType || form.values.dairePlanlari?.[0]?.tip || "",
      areaM2:
        Number(firstOffer.areaM2) ||
        Number(form.values.dairePlanlari?.[0]?.metrekare || 0),
      priceGBP:
        Number(firstOffer.priceGBP || firstOffer.priceUSD) ||
        Number(
          form.values.dairePlanlari?.[0]?.fiyatGBP ||
            form.values.dairePlanlari?.[0]?.fiyatUSD ||
            form.values.dairePlanlari?.[0]?.fiyat ||
            0
        ),
      downPaymentPercent: Number(firstOffer.downPaymentPercent || 0),
      installmentMonths: Number(firstOffer.installmentMonths || 0),
      locationLabel: "",
      locationMinutes: 0,
    });
    form.setFieldValue("specialOffers", [
      ...(form.values.specialOffers || []),
      newOffer,
    ]);
  };

  const removeSpecialOffer = (index) => {
    const offers = (form.values.specialOffers || []).filter((_, i) => i !== index);
    form.setFieldValue("specialOffers", offers);
  };

  const updateSpecialOfferField = (index, field, value) => {
    const offers = [...(form.values.specialOffers || [])];
    offers[index] = {
      ...(offers[index] || createSpecialOfferDraft()),
      [field]: value,
    };
    form.setFieldValue("specialOffers", offers);
  };

  const handleSubmit = () => {
    const normalizedSpecialOffers = (form.values.specialOffers || [])
      .map((offer) => {
        const downPaymentValue = Number(
          offer?.downPaymentAmount ?? offer?.downPaymentPercent
        ) || 0;
        return {
          ...createSpecialOfferDraft(offer),
          enabled: true,
          title: String(offer?.title || form.values.projectName || "").trim(),
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
    const specialPriceGBP = primarySpecialOffer?.priceGBP || primarySpecialOffer?.priceUSD || 0;
    const specialAreaM2 = Number(primarySpecialOffer?.areaM2 || 0);
    const specialDownPaymentPercent = Number(
      primarySpecialOffer?.downPaymentPercent || 0
    );
    const specialInstallmentMonths = Number(
      primarySpecialOffer?.installmentMonths || 0
    );
    const specialOfferTitleValue = String(primarySpecialOffer?.title || "").trim();
    const normalizedListingStatus =
      normalizeListingStatus(form.values.listingStatus) ||
      listingStatusFromProjectStatus(form.values.projectStatus) ||
      "offplan";

    const nextFloorPlans = [...form.values.dairePlanlari];

    let nextYakinMesafeler = form.values.yakinMesafeler.filter(
      (m) => m.yer.trim() !== ""
    );
    if (isSpecialOfferActive && normalizedSpecialOffers.length > 0) {
      const offerLocationSet = new Set(
        normalizedSpecialOffers
          .map((offer) => String(offer.locationLabel || "").toLowerCase())
          .filter(Boolean)
      );
      nextYakinMesafeler = nextYakinMesafeler.filter(
        (item) =>
          !offerLocationSet.has(String(item?.yer || "").trim().toLowerCase())
      );

      normalizedSpecialOffers.forEach((offer) => {
        if (!offer.locationLabel) return;
        nextYakinMesafeler.push({
          yer: offer.locationLabel,
          mesafe: `${offer.locationMinutes} min`,
        });
      });
    }

    const generatedCampaign = [];
    if (specialDownPaymentPercent > 0) {
      generatedCampaign.push(
        `${formatUsdAmount(specialDownPaymentPercent)} down payment`
      );
    }
    if (specialInstallmentMonths > 0) {
      generatedCampaign.push(`${specialInstallmentMonths} months installments`);
    }

    setPropertyDetails((prev) => ({
      ...prev,
      title:
        isSpecialOfferType && isSpecialOfferActive && primarySpecialOffer
          ? specialOfferTitleValue || prev.title
          : prev.title,
      projectName: form.values.projectName,
      price:
        isSpecialOfferType && isSpecialOfferActive && primarySpecialOffer
          ? specialPriceGBP
          : prev.price,
      currency:
        isSpecialOfferType && isSpecialOfferActive && primarySpecialOffer
          ? "GBP"
          : prev.currency,
      ilanNo: form.values.ilanNo,
      consultantId: form.values.consultantId || null,
      projeHakkinda: {
        projeAlani: form.values.projeAlani,
        yesilAlan: form.values.yesilAlan,
        konutSayisi: form.values.konutSayisi,
        description:
          form.values.projeAciklama_tr ||
          form.values.projeAciklama_en ||
          form.values.projeAciklama_ru ||
          "",
        description_tr: form.values.projeAciklama_tr,
        description_en: form.values.projeAciklama_en,
        description_ru: form.values.projeAciklama_ru,
        yakinMesafeler: nextYakinMesafeler,
        specialOffer:
          isSpecialOfferActive && primarySpecialOffer
            ? primarySpecialOffer
            : null,
        specialOffers: isSpecialOfferActive ? normalizedSpecialOffers : [],
      },
      kampanya:
        form.values.kampanya ||
        (isSpecialOfferActive ? generatedCampaign.join(" - ") : ""),
      deliveryDate: form.values.deliveryDate,
      projectStatus:
        form.values.projectStatus ||
        projectStatusFromListingStatus(normalizedListingStatus),
      listingStatus: normalizedListingStatus,
      gyo: form.values.gyo,
      facilities: {
        bedrooms: form.values.bedrooms || 0,
        bathrooms: form.values.bathrooms || 0,
        parkings: form.values.parkings || 0,
      },
      dairePlanlari: nextFloorPlans,
      vaziyetPlani: form.values.vaziyetPlani,
      brochureUrl: form.values.brochureUrl,
      mapImage: form.values.mapImage,
      ozellikler: {
        binaOzellikleri: form.values.binaOzellikleri,
        disOzellikler: form.values.disOzellikler,
        engelliYasliUygun: form.values.engelliYasliUygun,
        eglenceAlisveris: form.values.eglenceAlisveris,
        guvenlik: form.values.guvenlik,
        manzara: form.values.manzara,
        muhit: form.values.muhit,
      },
    }));
    nextStep();
  };

  const consultantOptions =
    consultants?.map((c) => ({
      value: c.id,
      label: c.name,
      image: c.image,
      title: c.title,
    })) || [];

  return (
    <Box maw={"95%"} mx="auto" my={"md"}>
      <ScrollArea h="65vh" offsetScrollbars>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Checkbox
            label="Special Offer"
            mb="sm"
            checked={isSpecialOfferActive}
            disabled={isSpecialOfferType}
            onChange={(e) => {
              const checked = e.currentTarget.checked;
              setIsSpecialOfferEnabled(checked);
              if (checked && (form.values.specialOffers || []).length === 0) {
                addSpecialOffer();
              }
            }}
          />

          {isSpecialOfferActive && (
            <Paper p="lg" withBorder mb="lg" className="bg-red-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Text fw={700} size="lg" c="red">
                    Special Offer
                  </Text>
                </div>
                <Button
                  leftSection={<MdAdd size={18} />}
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={addSpecialOffer}
                  type="button"
                >
                  Special Offer Ekle
                </Button>
              </div>

              {(form.values.specialOffers || []).length === 0 ? (
                <Text c="dimmed" ta="center" py="md">
                  Henüz special offer eklenmedi. &quot;Special Offer Ekle&quot; butonuna tıklayın.
                </Text>
              ) : (
                (form.values.specialOffers || []).map((offer, index) => (
                  <Paper key={offer.id || index} p="md" withBorder mb="sm" className="bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <Text fw={600}>Offer #{index + 1}</Text>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => removeSpecialOffer(index)}
                      >
                        <MdDelete size={18} />
                      </ActionIcon>
                    </div>

                    <Grid>
                      <Grid.Col span={6}>
                        <TextInput
                          label="Offer Title"
                          placeholder="TOPKAPI"
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
                          placeholder="69"
                          min={0}
                          value={offer.areaM2 ?? 0}
                          onChange={(value) =>
                            updateSpecialOfferField(index, "areaM2", value)
                          }
                        />
                      </Grid.Col>
                    </Grid>

                    <Grid mt="sm">
                      <Grid.Col span={3}>
                        <NumberInput
                          label="Price (GBP)"
                          placeholder="299000"
                          min={0}
                          thousandSeparator="."
                          decimalSeparator=","
                          value={offer.priceGBP ?? 0}
                          onChange={(value) =>
                            updateSpecialOfferField(index, "priceGBP", value)
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <NumberInput
                          label="Down Payment (GBP)"
                          placeholder="149500"
                          min={0}
                          thousandSeparator="."
                          decimalSeparator=","
                          value={
                            offer.downPaymentAmount ??
                            offer.downPaymentPercent ??
                            0
                          }
                          onChange={(value) => {
                            updateSpecialOfferField(index, "downPaymentPercent", value);
                            updateSpecialOfferField(index, "downPaymentAmount", value);
                          }}
                        />
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <NumberInput
                          label="Installment (Months)"
                          placeholder="18"
                          min={0}
                          value={offer.installmentMonths ?? 0}
                          onChange={(value) =>
                            updateSpecialOfferField(index, "installmentMonths", value)
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

                    <Grid mt="sm">
                      <Grid.Col span={3}>
                        <NumberInput
                          label="Location Minutes"
                          placeholder="0"
                          min={0}
                          value={offer.locationMinutes ?? 0}
                          onChange={(value) =>
                            updateSpecialOfferField(index, "locationMinutes", value)
                          }
                        />
                      </Grid.Col>
                    </Grid>
                  </Paper>
                ))
              )}
            </Paper>
          )}

{/* İLAN NUMARASI (Listing Number) */}
          <Paper p="lg" withBorder mb="lg" className="bg-orange-50">
            <div className="flex items-center gap-2 mb-4">
              <Text fw={700} size="lg" c="orange"># İlan Numarası</Text>
            </div>
            <Select
              label="Danışman Ata"
              placeholder="Bu proje için bir danışman seçin"
              description="Danışman, bu proje için iletişim kişisi olarak gösterilecektir"
              data={consultantOptions}
              value={form.values.consultantId}
              onChange={(value) => form.setFieldValue("consultantId", value)}
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
              description="Projeyi listede göstermek için bir ad girin"
              mt="sm"
              {...form.getInputProps("projectName")}
            />
            <TextInput
              label="İlan No"
              placeholder="#1201651741"
              description="Proje ilan numarasını girin (örn: #1201651741)"
              {...form.getInputProps("ilanNo")}
            />
          </Paper>

          {/* PROJE HAKKINDA (About Project) */}
          <Paper p="lg" withBorder mb="lg" className="bg-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <MdInfo size={24} className="text-blue-600" />
              <Text fw={700} size="lg" c="blue">Proje Hakkında</Text>
            </div>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="Proje Alanı (m²)"
                  placeholder="20500"
                  min={0}
                  thousandSeparator="."
                  decimalSeparator=","
                  {...form.getInputProps("projeAlani")}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Yeşil Alan (m²)"
                  placeholder="7500"
                  min={0}
                  thousandSeparator="."
                  decimalSeparator=","
                  {...form.getInputProps("yesilAlan")}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Konut Sayısı"
                  placeholder="884"
                  min={0}
                  {...form.getInputProps("konutSayisi")}
                />
              </Grid.Col>
            </Grid>

            {/* Proje Açıklaması - İki Dil */}
            <Grid mt="md">
              <Grid.Col span={4}>
                <Textarea
                  label="Proje Açıklaması (Türkçe)"
                  placeholder="Şehrin merkezinde, bahçeli bir yaşam!&#10;&#10;Şehrin tam kalbinde, keyifli bir yaşam sizi bekliyor..."
                  minRows={6}
                  {...form.getInputProps("projeAciklama_tr")}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <Textarea
                  label="Project Description (English)"
                  placeholder="A garden life in the city center!&#10;&#10;An enjoyable life awaits you in the heart of the city..."
                  minRows={6}
                  {...form.getInputProps("projeAciklama_en")}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <Textarea
                  label="Project Description (Russian)"
                  placeholder="Description in Russian..."
                  minRows={6}
                  {...form.getInputProps("projeAciklama_ru")}
                />
              </Grid.Col>
            </Grid>

            {/* Kampanya */}
            <TextInput
              label="Kampanya Metni"
              placeholder="2+1 DAİRELER %50 PESİN %50 36 AY VADE FARKSIZ TAKSİT İMKANI"
              mt="md"
              {...form.getInputProps("kampanya")}
            />

            {/* Teslim Tarihi ve Proje Durumu */}
            <Grid mt="md">
              <Grid.Col span={3}>
                <TextInput
                  label="Teslim Tarihi"
                  placeholder="Mayis 2027"
                  {...form.getInputProps("deliveryDate")}
                />
              </Grid.Col>
              <Grid.Col span={3}>
                <Select
                  label="Proje Durumu"
                  placeholder="Secin"
                  data={[
                    { value: "devam-ediyor", label: "Devam Ediyor" },
                    { value: "tamamlandi", label: "Tamamlandi" },
                  ]}
                  value={form.values.projectStatus || "devam-ediyor"}
                  onChange={(value) => {
                    const nextProjectStatus = value || "devam-ediyor";
                    form.setFieldValue("projectStatus", nextProjectStatus);
                    const inferredListingStatus =
                      listingStatusFromProjectStatus(nextProjectStatus);
                    if (inferredListingStatus) {
                      form.setFieldValue("listingStatus", inferredListingStatus);
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
                    checked={form.values.listingStatus === "ready"}
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        form.setFieldValue("listingStatus", "ready");
                        form.setFieldValue(
                          "projectStatus",
                          projectStatusFromListingStatus("ready")
                        );
                      }
                    }}
                  />
                  <Checkbox
                    label="Off-plan"
                    checked={form.values.listingStatus === "offplan"}
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        form.setFieldValue("listingStatus", "offplan");
                        form.setFieldValue(
                          "projectStatus",
                          projectStatusFromListingStatus("offplan")
                        );
                      }
                    }}
                  />
                </Group>
              </Grid.Col>
              <Grid.Col span={3}>
                <Checkbox
                  label="GYO"
                  mt={36}
                  {...form.getInputProps("gyo", { type: "checkbox" })}
                />
              </Grid.Col>
            </Grid>

            {/* Yakın Mesafeler */}
            <Divider my="md" label="Yakın Mesafeler" labelPosition="center" />
            <div className="space-y-2">
              {form.values.yakinMesafeler.map((mesafe, index) => (
                <Group key={index}>
                  <TextInput
                    placeholder="Yer adı (örn: D-100)"
                    value={mesafe.yer}
                    onChange={(e) => {
                      const mesafeler = [...form.values.yakinMesafeler];
                      mesafeler[index].yer = e.target.value;
                      form.setFieldValue("yakinMesafeler", mesafeler);
                    }}
                    style={{ flex: 2 }}
                  />
                  <TextInput
                    placeholder="Mesafe (örn: 1 km)"
                    value={mesafe.mesafe}
                    onChange={(e) => {
                      const mesafeler = [...form.values.yakinMesafeler];
                      mesafeler[index].mesafe = e.target.value;
                      form.setFieldValue("yakinMesafeler", mesafeler);
                    }}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => removeYakinMesafe(index)}
                  >
                    <MdDelete size={18} />
                  </ActionIcon>
                </Group>
              ))}
              <Button
                variant="subtle"
                color="blue"
                size="xs"
                leftSection={<MdAdd size={14} />}
                onClick={addYakinMesafe}
              >
                Mesafe Ekle
              </Button>
            </div>
          </Paper>

          {/* OLANAKLAR (Facilities) */}
          <Paper p="lg" withBorder mb="lg" className="bg-teal-50">
            <div className="flex items-center gap-2 mb-4">
              <BsBuilding size={24} className="text-teal-600" />
              <Text fw={700} size="lg" c="teal">Olanaklar / Facilities</Text>
            </div>

            <Grid>
              <Grid.Col span={4}>
                <NumberInput
                  label="Yatak Odası"
                  placeholder="0"
                  min={0}
                  {...form.getInputProps("bedrooms")}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Banyo"
                  placeholder="0"
                  min={0}
                  {...form.getInputProps("bathrooms")}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <NumberInput
                  label="Otopark"
                  placeholder="0"
                  min={0}
                  {...form.getInputProps("parkings")}
                />
              </Grid.Col>
            </Grid>
          </Paper>

          {/* DAİRE PLANLARI (Floor Plans) */}
          <Paper p="lg" withBorder mb="lg" className="bg-green-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BsGrid size={24} className="text-green-600" />
                <Text fw={700} size="lg" c="green">Daire Planları</Text>
              </div>
              <Button
                leftSection={<MdAdd size={18} />}
                variant="light"
                color="green"
                size="sm"
                onClick={addFloorPlan}
              >
                Plan Ekle
              </Button>
            </div>

            {form.values.dairePlanlari.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                Henüz daire planı eklenmedi. &quot;Plan Ekle&quot; butonuna tıklayın.
              </Text>
            ) : (
              form.values.dairePlanlari.map((plan, index) => (
                <Paper key={index} p="md" withBorder mb="md" className="bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <Text fw={600}>Plan #{index + 1}</Text>
                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={() => removeFloorPlan(index)}
                    >
                      <MdDelete size={18} />
                    </ActionIcon>
                  </div>

                  <div className="flex gap-4">
                    {/* Floor Plan Image Upload */}
                    <div className="flex-shrink-0">
                      {plan.image ? (
                        <div className="relative">
                          <Image
                            src={plan.image}
                            w={120}
                            h={120}
                            fit="cover"
                            radius="md"
                          />
                          <ActionIcon
                            color="red"
                            variant="filled"
                            size="sm"
                            className="absolute -top-2 -right-2"
                            onClick={() => {
                              const plans = [...form.values.dairePlanlari];
                              plans[index].image = "";
                              form.setFieldValue("dairePlanlari", plans);
                            }}
                          >
                            <MdClose size={14} />
                          </ActionIcon>
                        </div>
                      ) : (
                        <Button
                          variant="light"
                          color="green"
                          w={120}
                          h={120}
                          onClick={() => openFloorPlanUpload(index)}
                          disabled={floorPlanUploading === index}
                          p={0}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <MdOutlineCloudUpload size={24} />
                            <Text size="xs" ta="center">Plan Görseli</Text>
                          </div>
                        </Button>
                      )}
                    </div>

                    {/* Floor Plan Details */}
                    <div className="flex-1">
                      <Grid>
                        <Grid.Col span={2}>
                          <TextInput
                            label="Daire Tipi"
                            placeholder="2+1"
                            value={plan.tip}
                            onChange={(e) => {
                              const plans = [...form.values.dairePlanlari];
                              plans[index].tip = e.target.value;
                              form.setFieldValue("dairePlanlari", plans);
                            }}
                          />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <TextInput
                            label="Varyant"
                            placeholder="A"
                            value={plan.varyant}
                            onChange={(e) => {
                              const plans = [...form.values.dairePlanlari];
                              plans[index].varyant = e.target.value;
                              form.setFieldValue("dairePlanlari", plans);
                            }}
                          />
                        </Grid.Col>
                        <Grid.Col span={2}>
                          <NumberInput
                            label="USD ($)"
                            placeholder="10.850.000"
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
                            label="EUR"
                            placeholder="9.950.000"
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
                            label="GBP (\u00A3)"
                            placeholder="8.450.000"
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
                            label="TRY (TL)"
                            placeholder="405.000.000"
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
                            label="Metrekare (m2)"
                            placeholder="57"
                            min={0}
                            value={plan.metrekare}
                            onChange={(value) => {
                              const plans = [...form.values.dairePlanlari];
                              plans[index].metrekare = value || 0;
                              form.setFieldValue("dairePlanlari", plans);
                            }}
                          />
                        </Grid.Col>
                      </Grid>
                    </div>
                  </div>
                </Paper>
              ))
            )}
          </Paper>

          {/* VAZİYET PLANI (Site Plan) */}
          <Paper p="lg" withBorder mb="lg" className="bg-purple-50">
            <div className="flex items-center gap-2 mb-4">
              <MdMap size={24} className="text-purple-600" />
              <Text fw={700} size="lg" c="grape">Vaziyet Planı</Text>
            </div>

            <div className="flex items-start gap-4">
              {form.values.vaziyetPlani ? (
                <div className="relative">
                  <Image
                    src={form.values.vaziyetPlani}
                    w={300}
                    h={200}
                    fit="cover"
                    radius="md"
                  />
                  <ActionIcon
                    color="red"
                    variant="filled"
                    className="absolute -top-2 -right-2"
                    onClick={() => form.setFieldValue("vaziyetPlani", "")}
                  >
                    <MdClose size={16} />
                  </ActionIcon>
                </div>
              ) : (
                <Button
                  variant="light"
                  color="grape"
                  h={200}
                  w={300}
                  onClick={openSitePlanUpload}
                  disabled={imageUploading}
                >
                  <div className="flex flex-col items-center gap-2">
                    <MdOutlineCloudUpload size={40} />
                    <Text size="sm">Vaziyet Planı Yükle</Text>
                  </div>
                </Button>
              )}
              {imageUploading && <UploadProgressBar progress={uploadProgress} />}
            </div>
          </Paper>

          {/* HARİTA GÖRSELİ (Map Image) */}
          <Paper p="lg" withBorder mb="lg" className="bg-amber-50">
            <div className="flex items-center gap-2 mb-4">
              <MdInfo size={24} className="text-amber-600" />
              <Text fw={700} size="lg" c="yellow.8">Brochure / YouTube</Text>
            </div>

            <TextInput
              label="Brochure URL / YouTube Link"
              placeholder="https://www.youtube.com/watch?v=... or https://.../brochure.pdf"
              value={form.values.brochureUrl}
              onChange={(event) =>
                form.setFieldValue("brochureUrl", event.currentTarget.value)
              }
              description="YouTube video link or PDF brochure for WhatsApp delivery."
            />
          </Paper>

          <Paper p="lg" withBorder mb="lg" className="bg-cyan-50">
            <div className="flex items-center gap-2 mb-4">
              <MdLocationOn size={24} className="text-cyan-600" />
              <Text fw={700} size="lg" c="cyan">Konum / Harita Görseli</Text>
            </div>

            <div className="flex items-start gap-4">
              {form.values.mapImage ? (
                <div className="relative">
                  <Image
                    src={form.values.mapImage}
                    w={400}
                    h={250}
                    fit="cover"
                    radius="md"
                  />
                  <ActionIcon
                    color="red"
                    variant="filled"
                    className="absolute -top-2 -right-2"
                    onClick={() => form.setFieldValue("mapImage", "")}
                  >
                    <MdClose size={16} />
                  </ActionIcon>
                </div>
              ) : (
                <Button
                  variant="light"
                  color="cyan"
                  h={250}
                  w={400}
                  onClick={openMapImageUpload}
                  disabled={mapImageUploading}
                >
                  <div className="flex flex-col items-center gap-2">
                    <MdOutlineCloudUpload size={40} />
                    <Text size="sm">Harita Görseli Yükle</Text>
                    <Text size="xs" c="dimmed">Google Maps screenshot veya harita görseli</Text>
                  </div>
                </Button>
              )}
              {mapImageUploading && <UploadProgressBar progress={uploadProgress} />}
            </div>
          </Paper>

          {/* ÖZELLİKLER (Features) */}
          <Paper p="lg" withBorder mb="lg">
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
                  {BINA_OZELLIKLERI.map((feature) => (
                    <Checkbox
                      key={feature}
                      label={feature}
                      size="sm"
                      checked={form.values.binaOzellikleri.includes(feature)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          form.setFieldValue("binaOzellikleri", [...form.values.binaOzellikleri, feature]);
                        } else {
                          form.setFieldValue("binaOzellikleri", form.values.binaOzellikleri.filter((f) => f !== feature));
                        }
                      }}
                    />
                  ))}
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="dis" pt="md">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {DIS_OZELLIKLER.map((feature) => (
                    <Checkbox
                      key={feature}
                      label={feature}
                      size="sm"
                      checked={form.values.disOzellikler.includes(feature)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          form.setFieldValue("disOzellikler", [...form.values.disOzellikler, feature]);
                        } else {
                          form.setFieldValue("disOzellikler", form.values.disOzellikler.filter((f) => f !== feature));
                        }
                      }}
                    />
                  ))}
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="engelli" pt="md">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ENGELLI_YASLI_UYGUN.map((feature) => (
                    <Checkbox
                      key={feature}
                      label={feature}
                      size="sm"
                      checked={form.values.engelliYasliUygun.includes(feature)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          form.setFieldValue("engelliYasliUygun", [...form.values.engelliYasliUygun, feature]);
                        } else {
                          form.setFieldValue("engelliYasliUygun", form.values.engelliYasliUygun.filter((f) => f !== feature));
                        }
                      }}
                    />
                  ))}
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="eglence" pt="md">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {EGLENCE_ALISVERIS.map((feature) => (
                    <Checkbox
                      key={feature}
                      label={feature}
                      size="sm"
                      checked={form.values.eglenceAlisveris.includes(feature)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          form.setFieldValue("eglenceAlisveris", [...form.values.eglenceAlisveris, feature]);
                        } else {
                          form.setFieldValue("eglenceAlisveris", form.values.eglenceAlisveris.filter((f) => f !== feature));
                        }
                      }}
                    />
                  ))}
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="guvenlik" pt="md">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {GUVENLIK.map((feature) => (
                    <Checkbox
                      key={feature}
                      label={feature}
                      size="sm"
                      checked={form.values.guvenlik.includes(feature)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          form.setFieldValue("guvenlik", [...form.values.guvenlik, feature]);
                        } else {
                          form.setFieldValue("guvenlik", form.values.guvenlik.filter((f) => f !== feature));
                        }
                      }}
                    />
                  ))}
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="manzara" pt="md">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {MANZARA.map((feature) => (
                    <Checkbox
                      key={feature}
                      label={feature}
                      size="sm"
                      checked={form.values.manzara.includes(feature)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          form.setFieldValue("manzara", [...form.values.manzara, feature]);
                        } else {
                          form.setFieldValue("manzara", form.values.manzara.filter((f) => f !== feature));
                        }
                      }}
                    />
                  ))}
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="muhit" pt="md">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {MUHIT.map((feature) => (
                    <Checkbox
                      key={feature}
                      label={feature}
                      size="sm"
                      checked={form.values.muhit.includes(feature)}
                      onChange={(e) => {
                        if (e.currentTarget.checked) {
                          form.setFieldValue("muhit", [...form.values.muhit, feature]);
                        } else {
                          form.setFieldValue("muhit", form.values.muhit.filter((f) => f !== feature));
                        }
                      }}
                    />
                  ))}
                </div>
              </Tabs.Panel>
            </Tabs>
          </Paper>

          <Group justify="center" mt="xl">
            <Button variant="default" onClick={prevStep}>
              Geri
            </Button>
            <Button type="submit" color="blue">
              İleri
            </Button>
          </Group>
        </form>
      </ScrollArea>
    </Box>
  );
};

ProjectDetails.propTypes = {
  prevStep: PropTypes.func.isRequired,
  nextStep: PropTypes.func.isRequired,
  propertyDetails: PropTypes.object.isRequired,
  setPropertyDetails: PropTypes.func.isRequired,
};

export default ProjectDetails;
