import { upload } from "@vercel/blob/client";

const IMAGE_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.heic,.heif,.avif,.ico";
const VIDEO_ACCEPT = ".mp4,.webm,.mov,.avi,.mkv,.m4v,.ogv,.3gp,.flv";

const HANDLE_UPLOAD_URL =
  (import.meta.env.VITE_API_URL || "/api") + "/upload/client";

export async function uploadFileToBlob(file, onProgress) {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: HANDLE_UPLOAD_URL,
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round(e.percentage))
      : undefined,
  });
  return blob.url;
}

export async function uploadFilesToBlob(files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const blob = await upload(files[i].name, files[i], {
      access: "public",
      handleUploadUrl: HANDLE_UPLOAD_URL,
      onUploadProgress: onProgress
        ? (e) => {
            const fileProgress = e.percentage;
            const overall = Math.round(
              ((i * 100 + fileProgress) / files.length)
            );
            onProgress(overall);
          }
        : undefined,
    });
    urls.push(blob.url);
  }
  return urls;
}

export function openFileDialog({ accept, multiple = false }) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept || "";
    input.multiple = multiple;
    input.onchange = () => resolve(Array.from(input.files));
    input.click();
  });
}

export async function pickAndUploadImages({ multiple = true, onProgress } = {}) {
  const files = await openFileDialog({
    accept: IMAGE_ACCEPT,
    multiple,
  });
  if (!files.length) return [];

  if (files.length === 1) {
    const url = await uploadFileToBlob(files[0], onProgress);
    return [url];
  }
  return uploadFilesToBlob(files, onProgress);
}

export async function pickAndUploadVideos({ multiple = true, onProgress } = {}) {
  const files = await openFileDialog({
    accept: VIDEO_ACCEPT,
    multiple,
  });
  if (!files.length) return [];

  if (files.length === 1) {
    const url = await uploadFileToBlob(files[0], onProgress);
    return [url];
  }
  return uploadFilesToBlob(files, onProgress);
}

export { IMAGE_ACCEPT, VIDEO_ACCEPT };
