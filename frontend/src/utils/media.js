const CLOUDINARY_HOST = "res.cloudinary.com";
const UPLOAD_SEGMENT = "/upload/";
const SIGNED_SEGMENT_PATTERN = /(^|\/)s--[^/]+--\//;

const splitCloudinaryUrl = (url) => {
  if (typeof url !== "string" || url.length === 0) return null;
  if (!url.includes(CLOUDINARY_HOST) || !url.includes(UPLOAD_SEGMENT)) return null;

  const [withoutHash, hashRaw] = url.split("#");
  const [withoutQuery, queryRaw] = withoutHash.split("?");
  const uploadIndex = withoutQuery.indexOf(UPLOAD_SEGMENT);

  if (uploadIndex === -1) return null;

  const prefix = withoutQuery.slice(0, uploadIndex + UPLOAD_SEGMENT.length);
  const suffix = withoutQuery.slice(uploadIndex + UPLOAD_SEGMENT.length);

  if (!suffix) return null;

  return {
    prefix,
    suffix,
    query: queryRaw ? `?${queryRaw}` : "",
    hash: hashRaw ? `#${hashRaw}` : "",
  };
};

const injectCloudinaryTransformation = (url, transformation) => {
  const parts = splitCloudinaryUrl(url);
  if (!parts || !transformation) return url;
  // Signed delivery URLs break if transformation segments are changed client-side.
  if (SIGNED_SEGMENT_PATTERN.test(parts.suffix)) return url;

  return `${parts.prefix}${transformation}/${parts.suffix}${parts.query}${parts.hash}`;
};

const toCloudinaryDimension = (value, key) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return `${key}_${Math.round(numeric)}`;
};

const forceJpgExtension = (url) => {
  const [withoutHash, hashRaw] = url.split("#");
  const [withoutQuery, queryRaw] = withoutHash.split("?");
  const hasExtension = /\.[a-z0-9]+$/i.test(withoutQuery);
  const normalizedPath = hasExtension
    ? withoutQuery.replace(/\.[a-z0-9]+$/i, ".jpg")
    : `${withoutQuery}.jpg`;
  const query = queryRaw ? `?${queryRaw}` : "";
  const hash = hashRaw ? `#${hashRaw}` : "";
  return `${normalizedPath}${query}${hash}`;
};

export const getOptimizedImageUrl = (
  url,
  { width, height, quality = "auto:good", format = "auto", crop = "fill" } = {}
) => {
  if (!url) return url;

  const transformations = [
    `q_${quality}`,
    `f_${format}`,
    "dpr_auto",
    width || height ? `c_${crop}` : null,
    width || height ? "g_auto" : null,
    toCloudinaryDimension(width, "w"),
    toCloudinaryDimension(height, "h"),
  ]
    .filter(Boolean)
    .join(",");

  return injectCloudinaryTransformation(url, transformations);
};

export const getOptimizedVideoUrl = (
  url,
  { width, height, quality = "auto:good", format = "auto" } = {}
) => {
  if (!url) return url;

  const transformations = [
    `q_${quality}`,
    `f_${format}`,
    "vc_auto",
    width || height ? "c_limit" : null,
    toCloudinaryDimension(width, "w"),
    toCloudinaryDimension(height, "h"),
  ]
    .filter(Boolean)
    .join(",");

  return injectCloudinaryTransformation(url, transformations);
};

export const getOptimizedVideoPosterUrl = (
  url,
  { width, height, quality = "auto:good" } = {}
) => {
  if (!url) return url;
  const cloudinaryParts = splitCloudinaryUrl(url);
  if (!cloudinaryParts) return "";
  if (SIGNED_SEGMENT_PATTERN.test(cloudinaryParts.suffix)) return "";
  const transformations = [
    "so_0",
    `q_${quality}`,
    "f_jpg",
    width || height ? "c_fill" : null,
    width || height ? "g_auto" : null,
    toCloudinaryDimension(width, "w"),
    toCloudinaryDimension(height, "h"),
  ]
    .filter(Boolean)
    .join(",");
  const transformed = `${cloudinaryParts.prefix}${transformations}/${cloudinaryParts.suffix}${cloudinaryParts.query}${cloudinaryParts.hash}`;

  return forceJpgExtension(transformed);
};
