import i18n from "../i18n";

const TURKISH_CHAR_REGEX = /[\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]/;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const joinBilingual = (trText, enText, separator = " / ") => {
  const tr = normalizeText(trText);
  const en = normalizeText(enText);
  if (tr && en) {
    return tr === en ? tr : `${tr}${separator}${en}`;
  }
  return tr || en || "";
};

const resolveTranslation = (key, options, lng) => {
  if (!key) return "";
  const translated = i18n.t(key, { ...options, lng });
  if (translated === key) {
    if (lng === "tr") {
      return options?.defaultValueTr || options?.defaultValue || "";
    }
    return options?.defaultValueEn || options?.defaultValue || "";
  }
  return translated;
};

export const bilingualKey = (key, options) => {
  const tr = resolveTranslation(key, options, "tr");
  const en = resolveTranslation(key, options, "en");
  return joinBilingual(tr, en);
};

export const bilingualText = (trText, enText) => joinBilingual(trText, enText);

export const bilingualFromMessage = (message, fallbackKey, options) => {
  const fallbackTr = fallbackKey
    ? resolveTranslation(fallbackKey, options, "tr")
    : "";
  const fallbackEn = fallbackKey
    ? resolveTranslation(fallbackKey, options, "en")
    : "";

  if (typeof message === "string" && message.trim()) {
    if (message.includes(" / ")) return message.trim();
    if (TURKISH_CHAR_REGEX.test(message)) {
      return joinBilingual(message, fallbackEn || message);
    }
    return joinBilingual(fallbackTr || message, message);
  }

  return joinBilingual(fallbackTr, fallbackEn);
};
