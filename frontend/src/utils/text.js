export const fixMojibake = (value) => {
  if (typeof value !== "string" || value.length === 0) return value;
  // Heuristic: mojibake from UTF-8 interpreted as Latin-1 often includes these.
  if (!/[ÃÂ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return value;
  }
};
