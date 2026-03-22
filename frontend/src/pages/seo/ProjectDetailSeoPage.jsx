import { useEffect, useMemo } from "react";
import { useQuery } from "react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProjectDetail from "../ProjectDetail";
import SEO from "../../components/SEO";
import JsonLd from "../../components/JsonLd";
import { getProperty } from "../../utils/api";
import {
  SITE_URL,
  extractObjectId,
  resolveProjectPath,
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

const normalizePathname = (pathname, fallbackPath) => {
  const value = String(pathname || fallbackPath || "/").trim();
  if (!value) return fallbackPath || "/";
  return value.startsWith("/") ? value : `/${value}`;
};

const getDistrictFromAddress = (address) => {
  const addressText = pickText(address);
  if (!addressText) return "";
  const [firstPart] = addressText.split(",");
  return pickText(firstPart);
};

const toRoomSummary = (plans = []) => {
  const roomTypes = Array.from(
    new Set(
      plans
        .map((item) => pickText(item?.tip, item?.roomType))
        .filter(Boolean)
    )
  );
  return roomTypes.slice(0, 3).join(", ");
};

const toMainArea = (property) => {
  const planAreas =
    property?.dairePlanlari
      ?.map((item) => toPositiveNumber(item?.metrekare))
      .filter(Boolean) || [];
  if (planAreas.length > 0) return Math.min(...planAreas);
  return (
    toPositiveNumber(property?.area?.gross) ||
    toPositiveNumber(property?.area?.net) ||
    toPositiveNumber(property?.area?.m2) ||
    toPositiveNumber(property?.m2)
  );
};

const resolveProjectSchemaType = (project) => {
  const explicitSchemaType = pickText(
    project?.schemaType,
    project?.schema?.type
  ).toLowerCase();
  if (explicitSchemaType === "apartmentcomplex") return "ApartmentComplex";
  if (explicitSchemaType === "residence") return "Residence";

  const planCount = Array.isArray(project?.dairePlanlari)
    ? project.dairePlanlari.length
    : 0;
  const unitCount = toPositiveNumber(
    project?.unitCount ?? project?.totalUnits ?? project?.numberOfUnits
  );
  if (planCount > 1 || (unitCount !== null && unitCount > 1)) {
    return "ApartmentComplex";
  }
  return "Residence";
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

const ProjectDetailSeoPage = () => {
  const { projectSlugOrId: routeProjectSlugOrId = "" } = useParams();
  const navigate = useNavigate();
  const projectLookupKey = useMemo(() => {
    const normalized = String(routeProjectSlugOrId || "").trim();
    if (!normalized) return "";
    return extractObjectId(normalized) || normalized;
  }, [routeProjectSlugOrId]);
  const location = useLocation();
  const { data: project } = useQuery(
    ["project-seo", projectLookupKey],
    () => getProperty(projectLookupKey),
    {
      enabled: Boolean(projectLookupKey),
    }
  );
  useEffect(() => {
    const routeValue = String(routeProjectSlugOrId || "").trim();
    if (!routeValue || !project) return;
    const targetPath = resolveProjectPath(project);
    if (!targetPath || targetPath === location.pathname) return;
    navigate(targetPath, { replace: true });
  }, [location.pathname, navigate, project, routeProjectSlugOrId]);

  const city = pickText(project?.city, project?.addressDetails?.city);
  const district = pickText(
    project?.addressDetails?.district,
    project?.district,
    getDistrictFromAddress(project?.address)
  );
  const projectTitle = pickText(
    project?.projectName,
    project?.title,
    project?.name,
    "Project"
  );
  const locationLabel = pickText(`${city} ${district}`) || "Turkey";

  const normalizedPathname = normalizePathname(
    location.pathname,
    `/projects/${routeProjectSlugOrId}`
  );
  const canonicalUrl = `${SITE_URL}${normalizedPathname}`;

  const fallbackTitle = "Project Detail | Turkey | demo";
  const seoTitle = project
    ? `${projectTitle} | ${locationLabel} | Project | demo`
    : fallbackTitle;

  const sourceDescription = pickText(
    project?.projeHakkinda?.description_en,
    project?.projeHakkinda?.description,
    project?.projeHakkinda?.description_tr,
    project?.projeHakkinda?.description_ru,
    project?.description_en,
    project?.description,
    project?.description_tr,
    project?.description_ru
  );

  const roomSummary = toRoomSummary(project?.dairePlanlari);
  const areaValue = toMainArea(project);
  const numericPrice = toPositiveNumber(project?.price);
  const priceLabel =
    numericPrice && pickText(project?.currency)
      ? `${numericPrice.toLocaleString()} ${pickText(project?.currency)}`
      : numericPrice
      ? `${numericPrice.toLocaleString()}`
      : "";
  const projectStatus = pickText(project?.projectStatus, project?.listingStatus);
  const deliveryDate = pickText(project?.deliveryDate);

  const descriptionParts = [
    roomSummary ? `Layouts: ${roomSummary}` : "",
    areaValue ? `Area from ${areaValue} m2` : "",
    locationLabel ? `in ${locationLabel}` : "",
    priceLabel ? `Starting from ${priceLabel}` : "",
    projectStatus ? `Status: ${projectStatus}` : "",
    deliveryDate ? `Delivery: ${deliveryDate}` : "",
    sourceDescription ? stripHtml(sourceDescription) : "",
  ].filter(Boolean);

  const seoDescription =
    truncateText(descriptionParts.join(". "), 170) ||
    "Explore this project detail and contact demo for current availability and pricing.";

  const primaryImage = project?.images?.[0] || project?.image || "/og-image.png";

  const projectSchema = useMemo(() => {
    if (!project) return null;

    const geo = extractGeo(project);
    const images = [
      ...(Array.isArray(project?.images) ? project.images : []),
      pickText(project?.image),
    ]
      .filter(Boolean)
      .map((item) => toAbsoluteUrl(item));

    const schema = {
      "@context": "https://schema.org",
      "@type": resolveProjectSchemaType(project),
    };

    const name = pickText(project?.projectName, project?.title, project?.name);
    if (name) schema.name = name;
    if (sourceDescription) schema.description = stripHtml(sourceDescription);
    schema.url = canonicalUrl;
    if (images.length > 0) schema.image = images;

    const address = {
      "@type": "PostalAddress",
    };
    const streetAddress = pickText(project?.address);
    const addressLocality = city;
    const addressRegion = district;
    const addressCountry = pickText(project?.country);
    if (streetAddress) address.streetAddress = streetAddress;
    if (addressLocality) address.addressLocality = addressLocality;
    if (addressRegion) address.addressRegion = addressRegion;
    if (addressCountry) address.addressCountry = addressCountry;
    if (Object.keys(address).length > 1) schema.address = address;

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
    const price = toPositiveNumber(project?.price);
    if (price) offers.price = price;
    const priceCurrency = pickText(project?.currency);
    if (priceCurrency) offers.priceCurrency = priceCurrency;
    const availability = resolveAvailability(project);
    if (availability) offers.availability = availability;
    offers.url = canonicalUrl;
    if (Object.keys(offers).length > 1) schema.offers = offers;

    const roomCount = toPositiveNumber(
      project?.dairePlanlari?.[0]?.tip?.split("+")?.[0]
    );
    if (roomCount) schema.numberOfRooms = roomCount;
    if (areaValue) {
      schema.floorSize = {
        "@type": "QuantitativeValue",
        value: Number(areaValue),
        unitCode: "MTK",
      };
    }

    return schema;
  }, [areaValue, canonicalUrl, city, district, project, sourceDescription]);

  const breadcrumbSchema = useMemo(
    () => ({
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
          name: "Projects",
          item: `${SITE_URL}/projects`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: projectTitle,
          item: canonicalUrl,
        },
      ],
    }),
    [canonicalUrl, projectTitle]
  );

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonicalUrl}
        ogImage={primaryImage}
        type="product"
      />
      <JsonLd data={projectSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ProjectDetail />
    </>
  );
};

export default ProjectDetailSeoPage;
