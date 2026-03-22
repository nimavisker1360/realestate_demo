import {
  Box,
  Button,
  Group,
  NumberInput,
  TextInput,
  Textarea,
  Text,
  Select,
  Avatar,
  Grid,
  Switch,
  Divider,
  Paper,
  Checkbox,
  Tabs,
  SegmentedControl,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { validateString } from "../utils/common";
import PropTypes from "prop-types";
import { useContext } from "react";
import { MdPerson } from "react-icons/md";
import { BsLightningCharge, BsGeoAlt, BsGrid, BsEye } from "react-icons/bs";
import { FaLandmark, FaHome, FaBriefcase } from "react-icons/fa";
import useConsultants from "../hooks/useConsultants";
import CurrencyContext from "../context/CurrencyContext";

// Property categories
const propertyCategories = [
  { value: "residential", label: "Konut", icon: FaHome },
  { value: "villa", label: "Vila", icon: FaHome },
  { value: "commercial", label: "Ticari", icon: FaBriefcase },
  { value: "land", label: "Arsa", icon: FaLandmark },
];

// Heating options
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

// Kitchen options
const kitchenOptions = [
  { value: "acik-amerikan", label: "Açık (Amerikan)" },
  { value: "kapali", label: "Kapalı" },
  { value: "laminat", label: "Laminat" },
  { value: "hilton", label: "Hilton" },
];

// Parking options
const parkingOptions = [
  { value: "kapali-otopark", label: "Kapalı Otopark" },
  { value: "acik-otopark", label: "Açık Otopark" },
  { value: "otopark-yok", label: "Otopark Yok" },
];

// Usage status options
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

// Room options
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

const BasicDetails = ({
  prevStep,
  nextStep,
  propertyDetails,
  setPropertyDetails,
}) => {
  const { data: consultants, isLoading: consultantsLoading } = useConsultants();
  const { convertAmount } = useContext(CurrencyContext);

  const form = useForm({
    initialValues: {
      title: propertyDetails.title,
      description: propertyDetails.description,
      description_en: propertyDetails.description_en || "",
      description_tr: propertyDetails.description_tr || "",
      description_ru: propertyDetails.description_ru || "",
      price: propertyDetails.price,
      currency: normalizeFiatCurrency(propertyDetails.currency),
      propertyType: propertyDetails.propertyType || "sale",
      category: propertyDetails.category || "residential",
      consultantId: propertyDetails.consultantId || "",
      // Turkish real estate fields
      listingNo: propertyDetails.listingNo || "",
      listingDate: propertyDetails.listingDate || null,
      areaGross: propertyDetails.area?.gross || 0,
      areaNet: propertyDetails.area?.net || 0,
      rooms: propertyDetails.rooms || "",
      buildingAge: propertyDetails.buildingAge || 0,
      floor: propertyDetails.floor || 0,
      totalFloors: propertyDetails.totalFloors || 0,
      bathrooms: propertyDetails.bathrooms || 0,
      heating: propertyDetails.heating || "",
      kitchen: propertyDetails.kitchen || "",
      balcony: propertyDetails.balcony || false,
      elevator: propertyDetails.elevator || false,
      parking: propertyDetails.parking || "",
      furnished: propertyDetails.furnished || false,
      usageStatus: propertyDetails.usageStatus || "",
      siteName: propertyDetails.siteName || "",
      dues: propertyDetails.dues || 0,
      mortgageEligible: propertyDetails.mortgageEligible || false,
      deedStatus: propertyDetails.deedStatus || "",
      imarDurumu: propertyDetails.imarDurumu || "",
      // Land/Arsa features
      altyapiFeatures: propertyDetails.altyapiFeatures || [],
      konumFeatures: propertyDetails.konumFeatures || [],
      genelOzellikler: propertyDetails.genelOzellikler || [],
      manzaraFeatures: propertyDetails.manzaraFeatures || [],
    },
    validate: {
      title: (value) => validateString(value),
      description_tr: (value) => validateString(value),
      price: (value) => (value < 999 ? "En az 999 olmalı" : null),
    },
  });

  const {
    title,
    description,
    description_en,
    description_tr,
    description_ru,
    price,
    currency,
    propertyType,
    category,
    consultantId,
    listingNo,
    listingDate,
    areaGross,
    areaNet,
    rooms,
    buildingAge,
    floor,
    totalFloors,
    bathrooms,
    heating,
    kitchen,
    balcony,
    elevator,
    parking,
    furnished,
    usageStatus,
    siteName,
    dues,
    mortgageEligible,
    deedStatus,
    imarDurumu,
    altyapiFeatures,
    konumFeatures,
    genelOzellikler,
    manzaraFeatures,
  } = form.values;
  const handleSubmit = () => {
    const { hasErrors } = form.validate();
    if (!hasErrors) {
      const normalizedCurrency = normalizeFiatCurrency(currency);
      const normalizedPrice = Math.round(Number(price || 0));
      setPropertyDetails((prev) => ({
        ...prev,
        title,
        description: description_tr || description_en || description_ru || description, // fallback for compatibility
        description_en,
        description_tr,
        description_ru,
        price: normalizedPrice,
        currency: normalizedCurrency,
        propertyType,
        category,
        consultantId: consultantId || null,
        // Turkish real estate fields
        listingNo,
        listingDate,
        area: { gross: areaGross, net: areaNet },
        rooms,
        buildingAge,
        floor,
        totalFloors,
        bathrooms,
        heating,
        kitchen,
        balcony,
        elevator,
        parking,
        furnished,
        usageStatus,
        siteName,
        dues,
        mortgageEligible,
        deedStatus,
        imarDurumu,
        altyapiFeatures,
        konumFeatures,
        genelOzellikler,
        manzaraFeatures,
      }));
      nextStep();
    }
  };

  // Prepare consultant options for select
  const consultantOptions =
    consultants?.map((c) => ({
      value: c.id,
      label: c.name,
      image: c.image,
      title: c.title,
    })) || [];

  return (
    <Box
      maw={"90%"}
      mx="auto"
      my={"md"}
      style={{ maxHeight: "70vh", overflowY: "auto" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* Property Category Selector */}
        <Select
          label="Emlak Kategorisi"
          placeholder="Kategori seçin"
          description="Mülk türünü seçin"
          data={propertyCategories.map((cat) => ({
            value: cat.value,
            label: cat.label,
          }))}
          value={category}
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

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              withAsterisk
              label="Başlık"
              placeholder="Mülk Adı"
              {...form.getInputProps("title")}
            />
          </Grid.Col>
          <Grid.Col span={6}>
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
          </Grid.Col>
        </Grid>

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

        {/* Consultant Selector */}
        <Select
          label="Danışman Ata"
          placeholder="Bu mülk için bir danışman seçin"
          description="Danışman, bu mülk için iletişim kişisi olarak gösterilecektir"
          data={consultantOptions}
          value={consultantId}
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

        <Divider my="lg" label="İlan Bilgileri" labelPosition="center" />

        <Grid>
          <Grid.Col span={6}>
            <TextInput
              label="İlan No"
              placeholder="1275908801"
              {...form.getInputProps("listingNo")}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <DateInput
              label="İlan Tarihi"
              placeholder="Tarih seçin"
              value={listingDate}
              onChange={(value) => form.setFieldValue("listingDate", value)}
              valueFormat="DD MMMM YYYY"
            />
          </Grid.Col>
        </Grid>

        <Divider
          my="lg"
          label="Bina ve Daire Bilgileri"
          labelPosition="center"
        />

        <Grid>
          <Grid.Col span={4}>
            <NumberInput
              label="m² (Brüt)"
              placeholder="4500"
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              {...form.getInputProps("areaGross")}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <NumberInput
              label="m² (Net)"
              placeholder="4000"
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              {...form.getInputProps("areaNet")}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label="Oda Sayısı"
              placeholder="Seçin"
              data={roomOptions}
              value={rooms}
              onChange={(value) => form.setFieldValue("rooms", value)}
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
              {...form.getInputProps("buildingAge")}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <NumberInput
              label="Bulunduğu Kat"
              placeholder="2"
              min={-2}
              {...form.getInputProps("floor")}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <NumberInput
              label="Kat Sayısı"
              placeholder="18"
              min={1}
              {...form.getInputProps("totalFloors")}
            />
          </Grid.Col>
        </Grid>

        <Grid mt="sm">
          <Grid.Col span={3}>
            <NumberInput
              label="Banyo Sayısı"
              placeholder="2"
              min={0}
              {...form.getInputProps("bathrooms")}
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <Select
              label="Isıtma"
              placeholder="Seçin"
              data={heatingOptions}
              value={heating}
              onChange={(value) => form.setFieldValue("heating", value)}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <Select
              label="Mutfak"
              placeholder="Seçin"
              data={kitchenOptions}
              value={kitchen}
              onChange={(value) => form.setFieldValue("kitchen", value)}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <Select
              label="Otopark"
              placeholder="Seçin"
              data={parkingOptions}
              value={parking}
              onChange={(value) => form.setFieldValue("parking", value)}
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
                onChange={(event) =>
                  form.setFieldValue("balcony", event.currentTarget.checked)
                }
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Switch
                label="Asansör"
                checked={elevator}
                onChange={(event) =>
                  form.setFieldValue("elevator", event.currentTarget.checked)
                }
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Switch
                label="Eşyalı"
                checked={furnished}
                onChange={(event) =>
                  form.setFieldValue("furnished", event.currentTarget.checked)
                }
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Switch
                label="Krediye Uygun"
                checked={mortgageEligible}
                onChange={(event) =>
                  form.setFieldValue(
                    "mortgageEligible",
                    event.currentTarget.checked
                  )
                }
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
              {...form.getInputProps("siteName")}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Aidat (TL)"
              placeholder="0"
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              {...form.getInputProps("dues")}
            />
          </Grid.Col>
        </Grid>

        <Grid mt="sm">
          <Grid.Col span={4}>
            <Select
              label="Kullanım Durumu"
              placeholder="Seçin"
              data={usageStatusOptions}
              value={usageStatus}
              onChange={(value) => form.setFieldValue("usageStatus", value)}
              clearable
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <TextInput
              label="Tapu Durumu"
              placeholder="Tapu durumunu yazın"
              {...form.getInputProps("deedStatus")}
            />
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label="İmar Durumu"
              placeholder="Seçin"
              data={imarDurumuOptions}
              value={imarDurumu}
              onChange={(value) => form.setFieldValue("imarDurumu", value)}
              clearable
            />
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
                    form.setFieldValue("altyapiFeatures", [...altyapiFeatures, feature]);
                  } else {
                    form.setFieldValue("altyapiFeatures", altyapiFeatures.filter((f) => f !== feature));
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
                    form.setFieldValue("konumFeatures", [...konumFeatures, feature]);
                  } else {
                    form.setFieldValue("konumFeatures", konumFeatures.filter((f) => f !== feature));
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
                    form.setFieldValue("genelOzellikler", [...genelOzellikler, feature]);
                  } else {
                    form.setFieldValue("genelOzellikler", genelOzellikler.filter((f) => f !== feature));
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
                    form.setFieldValue("manzaraFeatures", [...manzaraFeatures, feature]);
                  } else {
                    form.setFieldValue("manzaraFeatures", manzaraFeatures.filter((f) => f !== feature));
                  }
                }}
              />
            ))}
          </div>
        </Paper>

        <Group position="center" mt="xl">
          <Button variant="default" onClick={prevStep}>
            Geri
          </Button>
          <Button type="submit">İleri</Button>
        </Group>
      </form>
    </Box>
  );
};

BasicDetails.propTypes = {
  prevStep: PropTypes.func.isRequired,
  nextStep: PropTypes.func.isRequired,
  propertyDetails: PropTypes.object.isRequired,
  setPropertyDetails: PropTypes.func.isRequired,
};

export default BasicDetails;
