import { useEffect, useMemo } from "react";
import { useQuery } from "react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Property from "../Property";
import PropertyGridCard from "../../components/PropertyGridCard";
import SEO from "../../components/SEO";
import JsonLd from "../../components/JsonLd";
import useProperties from "../../hooks/useProperties";
import { getProperty } from "../../utils/api";
import {
  SITE_URL,
  extractObjectId,
  resolvePropertyPath,
  stripHtml,
  toAbsoluteUrl,
  truncateText,
} from "../../utils/seo";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const pickText = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
};

const toRoomsCount = (roomsValue) => {
  if (roomsValue === null || roomsValue === undefined) return null;
  if (typeof roomsValue === "number" && roomsValue > 0) return roomsValue;
  const text = String(roomsValue).trim();
  if (!text) return null;
  const match = text.match(/^(\d+)/);
  if (!match) return null;
  return toPositiveNumber(match[1]);
};

const pushIfPresent = (target, key, value) => {
  if (value === null || value === undefined) return;
  if (typeof value === "string" && !value.trim()) return;
  if (Array.isArray(value) && value.length === 0) return;
  target[key] = value;
};

const extractGeo = (property) => {
  const candidates = [
    property?.geo,
    property?.coordinates,
    property?.location,
    property?.iletisim?.koordinatlar,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate) && candidate.length >= 2) {
      const lat = toNumber(candidate[0]);
      const lng = toNumber(candidate[1]);
      if (lat !== null && lng !== null) return { lat, lng };
    }
    const lat = toNumber(
      candidate?.lat ?? candidate?.latitude ?? candidate?.y ?? candidate?.Lat
    );
    const lng = toNumber(
      candidate?.lng ??
        candidate?.lon ??
        candidate?.long ??
        candidate?.longitude ??
        candidate?.x ??
        candidate?.Lng
    );
    if (lat !== null && lng !== null) return { lat, lng };
  }

  const fallbackLat = toNumber(property?.lat ?? property?.latitude);
  const fallbackLng = toNumber(
    property?.lng ?? property?.lon ?? property?.long ?? property?.longitude
  );
  if (fallbackLat !== null && fallbackLng !== null) {
    return { lat: fallbackLat, lng: fallbackLng };
  }

  return null;
};

const normalizePathname = (pathname, fallbackPath) => {
  const value = String(pathname || fallbackPath || "/").trim();
  if (!value) return fallbackPath || "/";
  return value.startsWith("/") ? value : `/${value}`;
};

const resolveAvailability = (property) => {
  const explicitAvailability = pickText(property?.availability);
  if (explicitAvailability) {
    return explicitAvailability.startsWith("http")
      ? explicitAvailability
      : `https://schema.org/${explicitAvailability}`;
  }

  const listingStatus = pickText(property?.listingStatus).toLowerCase();
  if (listingStatus === "ready") return "https://schema.org/InStock";
  if (listingStatus === "offplan") return "https://schema.org/PreOrder";

  return "";
};

const PropertySeoPage = () => {
  const { propertyId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const propertyLookupKey = useMemo(() => {
    const normalized = String(propertyId || "").trim();
    if (!normalized) return "";
    return extractObjectId(normalized) || normalized;
  }, [propertyId]);

  const { data: property } = useQuery(["resd", propertyLookupKey], () =>
    getProperty(propertyLookupKey),
    {
      enabled: Boolean(propertyLookupKey),
    }
  );
  const { data: allProperties = [] } = useProperties();

  useEffect(() => {
    const routeValue = String(propertyId || "").trim();
    if (!routeValue || !property) return;

    const targetPath = resolvePropertyPath(property);
    if (!targetPath || targetPath === location.pathname) return;

    navigate(targetPath, { replace: true });
  }, [location.pathname, navigate, property, propertyId]);

  const district = pickText(
    property?.addressDetails?.district,
    property?.district,
    property?.ilce
  );
  const city = pickText(property?.city, property?.addressDetails?.city);
  const titleOrName = pickText(property?.title, property?.name, "Property");
  const locationLabel = pickText(`${city} ${district}`) || "Turkey";

  const normalizedPathname = normalizePathname(location.pathname, `/listing/${propertyId}`);
  const canonicalUrl = `${SITE_URL}${normalizedPathname}`;

  const fallbackTitle = "Property Detail | Turkey | For Sale | demo";
  const propertyTitle = property
    ? `${titleOrName} | ${locationLabel} | For Sale | demo`
    : fallbackTitle;

  const sourceDescription =
    property?.description_en ||
    property?.description ||
    property?.description_tr ||
    property?.description_ru ||
    "";

  const roomsText = pickText(property?.rooms);
  const bedroomCount = toPositiveNumber(property?.facilities?.bedrooms);
  const roomLabel =
    roomsText || (bedroomCount ? `${bedroomCount} bedroom` : "");
  const highlightTokens = [
    pickText(property?.category),
    pickText(property?.usageStatus),
    pickText(property?.deedStatus),
    pickText(property?.siteName),
  ].filter(Boolean);
  const highlights = highlightTokens.slice(0, 2).join(", ");
  const numericPrice = toPositiveNumber(property?.price);
  const priceLabel =
    numericPrice && pickText(property?.currency)
      ? `${numericPrice.toLocaleString()} ${pickText(property?.currency)}`
      : numericPrice
      ? `${numericPrice.toLocaleString()}`
      : "";

  const descriptionParts = [
    roomLabel ? `${roomLabel} property` : "",
    locationLabel ? `in ${locationLabel}` : "",
    priceLabel ? `priced at ${priceLabel}` : "",
    highlights ? `Highlights: ${highlights}` : "",
    sourceDescription ? stripHtml(sourceDescription) : "",
  ].filter(Boolean);

  const propertyDescription =
    truncateText(
      descriptionParts.join(". "),
      170
    ) ||
    "Explore this property detail and contact demo for current price and availability.";

  const primaryImage = property?.images?.[0] || property?.image || "/og-image.png";

  const realEstateSchema = useMemo(() => {
    if (!property) return null;

    const geo = extractGeo(property);
    const numberOfRooms =
      toRoomsCount(property?.rooms) ||
      toPositiveNumber(property?.facilities?.bedrooms);
    const areaValue =
      toPositiveNumber(property?.area?.gross) ||
      toPositiveNumber(property?.area?.net) ||
      toPositiveNumber(property?.area?.m2) ||
      toPositiveNumber(property?.m2);
    const images = [
      ...(Array.isArray(property?.images) ? property.images : []),
      pickText(property?.image),
    ]
      .filter(Boolean)
      .map((item) => toAbsoluteUrl(item));

    const schema = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
    };

    pushIfPresent(schema, "name", pickText(property?.title, property?.name));
    pushIfPresent(schema, "description", stripHtml(sourceDescription));
    pushIfPresent(schema, "url", canonicalUrl);
    if (images.length > 0) {
      schema.image = images;
    }

    const address = {
      "@type": "PostalAddress",
    };
    pushIfPresent(address, "streetAddress", pickText(property?.address));
    pushIfPresent(address, "addressLocality", city);
    pushIfPresent(
      address,
      "addressRegion",
      pickText(
        property?.addressDetails?.district,
        property?.district,
        property?.ilce,
        property?.addressRegion
      )
    );
    pushIfPresent(address, "addressCountry", pickText(property?.country));
    if (Object.keys(address).length > 1) {
      schema.address = address;
    }

    if (geo) {
      schema.geo = {
        "@type": "GeoCoordinates",
        latitude: geo.lat,
        longitude: geo.lng,
      };
    }

    const offers = {
      "@type": "Offer",
    };
    pushIfPresent(offers, "price", toPositiveNumber(property?.price));
    pushIfPresent(offers, "priceCurrency", pickText(property?.currency));
    pushIfPresent(offers, "availability", resolveAvailability(property));
    pushIfPresent(offers, "url", canonicalUrl);
    if (Object.keys(offers).length > 1) {
      schema.offers = offers;
    }

    pushIfPresent(schema, "numberOfRooms", numberOfRooms);
    if (areaValue) {
      schema.floorSize = {
        "@type": "QuantitativeValue",
        value: Number(areaValue),
        unitCode: "MTK",
      };
    }

    return schema;
  }, [
    canonicalUrl,
    city,
    property,
    sourceDescription,
  ]);

  const breadcrumbSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Listing",
          item: `${SITE_URL}/listing`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: pickText(property?.title, property?.name, "Property"),
          item: canonicalUrl,
        },
      ],
    };
  }, [canonicalUrl, property?.name, property?.title]);

  const relatedProperties = useMemo(() => {
    if (!property || !Array.isArray(allProperties)) return [];
    if (
      property.propertyType === "local-project" ||
      property.propertyType === "international-project"
    ) {
      return [];
    }

    const ranked = allProperties
      .filter(
        (item) =>
          item?.id &&
          item.id !== property.id &&
          item.propertyType !== "local-project" &&
          item.propertyType !== "international-project"
      )
      .map((item) => {
        let score = 0;
        if (item.city && property.city && item.city === property.city) score += 3;
        if (item.country && property.country && item.country === property.country)
          score += 2;
        if (item.category && property.category && item.category === property.category)
          score += 2;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    return ranked.slice(0, 4).map((entry) => entry.item);
  }, [allProperties, property]);

  return (
    <>
      <SEO
        title={propertyTitle}
        description={propertyDescription}
        canonical={canonicalUrl}
        ogImage={primaryImage}
        type="product"
      />
      <JsonLd data={realEstateSchema} />
      <JsonLd data={breadcrumbSchema} />

      <Property />

      {relatedProperties.length > 0 && (
        <section className="max-padd-container pb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Related properties</h2>
            <p className="text-sm text-gray-500">
              Similar options in nearby locations and price ranges.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProperties.map((item) => (
              <PropertyGridCard key={item.id} property={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
};

export default PropertySeoPage;
