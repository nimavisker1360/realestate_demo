export const SUPPORTED_LANGUAGE_CODES = ["en", "tr", "ru"];
export const DEFAULT_LANGUAGE_CODE = "en";

export const normalizeLanguageCode = (value, options = {}) => {
  const fallbackToDefault = options.fallback !== false;
  const normalized = String(value || "").trim().toLowerCase();

  if (/^tr(?:[_-].*)?$/.test(normalized)) return "tr";
  if (/^ru(?:[_-].*)?$/.test(normalized)) return "ru";
  if (/^en(?:[_-].*)?$/.test(normalized)) return "en";

  return fallbackToDefault ? DEFAULT_LANGUAGE_CODE : "";
};

export const extractLanguageFromPath = (pathname = "/") => {
  const firstSegment = String(pathname || "/")
    .split("/")
    .filter(Boolean)[0];

  if (!firstSegment) return "";
  const normalized = normalizeLanguageCode(firstSegment, { fallback: false });

  return SUPPORTED_LANGUAGE_CODES.includes(normalized) ? normalized : "";
};

export const stripLanguageFromPath = (pathname = "/") => {
  const path = String(pathname || "/");
  const languageFromPath = extractLanguageFromPath(path);

  if (!languageFromPath) return path || "/";

  const parts = path.split("/");
  const rest = parts.slice(2).join("/");

  return rest ? `/${rest}` : "/";
};

export const buildLocalizedPath = ({
  pathname = "/",
  search = "",
  hash = "",
  language = DEFAULT_LANGUAGE_CODE,
}) => {
  const normalizedLanguage = normalizeLanguageCode(language);
  const withoutLanguage = stripLanguageFromPath(pathname);
  const normalizedPath =
    withoutLanguage && withoutLanguage !== "/" ? withoutLanguage : "";

  return `/${normalizedLanguage}${normalizedPath}${search || ""}${hash || ""}`;
};

export const resolvePreferredLanguage = (value) =>
  normalizeLanguageCode(value);
