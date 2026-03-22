export const inferAiSalesAgentPageType = (pathname = "") => {
  const normalized = String(pathname || "").trim();
  if (normalized === "/") return "home";
  if (normalized === "/listing") return "listing";
  if (normalized.startsWith("/listing/")) return "property_detail";
  if (normalized.startsWith("/projects/")) return "project_detail";
  if (normalized === "/contact") return "contact";
  if (normalized.includes("citizenship")) return "citizenship";
  if (normalized.includes("investment")) return "investment";
  return "default";
};

export const extractAiSalesAgentDetailKey = (pathname = "") => {
  const normalized = String(pathname || "").trim();
  if (!normalized.startsWith("/listing/") && !normalized.startsWith("/projects/")) {
    return "";
  }

  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
};

export const resolveAiSalesAgentPageContext = ({
  location,
  locale,
  pageEntity,
} = {}) => {
  const pathname = String(location?.pathname || "/").trim() || "/";
  const search = String(location?.search || "").trim();
  const pageType = inferAiSalesAgentPageType(pathname);
  const title =
    typeof document !== "undefined" ? String(document.title || "").trim() : "";
  const url =
    typeof window !== "undefined" && window.location?.href
      ? String(window.location.href)
      : `${pathname}${search}`;

  const currentProject = pageEntity
    ? {
        id: pageEntity.id || "",
        title: pageEntity.projectName || pageEntity.title || pageEntity.name || "",
        city: pageEntity.city || pageEntity.addressDetails?.city || "",
        district:
          pageEntity.addressDetails?.district || pageEntity.district || "",
        propertyType: pageEntity.propertyType || "",
      }
    : null;

  return {
    locale,
    pathname,
    search,
    url,
    title,
    pageType,
    currentProjectId: currentProject?.id || "",
    currentProjectName: currentProject?.title || "",
    currentProject,
  };
};
