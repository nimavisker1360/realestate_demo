export const updateFavourites = (id, favourites) => {
  if (favourites.includes(id)) {
    return favourites.filter((resId) => resId !== id);
  } else {
    return [...favourites, id];
  }
};

export const checkFavourites = (id, favourites) => {
  return favourites?.includes(id) ? "#8ac243" : "white";
};

export const validateString = (value) => {
  return value?.length < 3 || value === null
    ? "Enter at least 3 characters"
    : null;
};

export const normalizeWhatsAppNumber = (value) => {
  const digits = value?.toString().replace(/\D/g, "") || "";
  return digits.startsWith("00") ? digits.slice(2) : digits;
};

export const normalizePhoneNumber = (value) => {
  const raw = value?.toString().trim() || "";
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;

  return digits;
};

export const buildTelHref = (value) => {
  const normalizedPhone = normalizePhoneNumber(value);
  return normalizedPhone ? `tel:${normalizedPhone}` : undefined;
};

export const buildEmailHref = (value) => {
  const email = value?.toString().trim();
  if (!email) return undefined;

  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: email,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
};
