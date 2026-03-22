import { Router } from "express";
import multer from "multer";
import { put } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

router.post("/client", async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "image/bmp", "image/tiff", "image/svg+xml", "image/avif",
            "image/heic", "image/heif", "image/x-icon",
            "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
            "video/x-matroska", "video/x-m4v", "video/ogg", "video/3gpp",
            "video/x-flv",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 500 * 1024 * 1024,
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Client upload completed:", blob.url);
      },
    });
    res.json(jsonResponse);
  } catch (error) {
    console.error("Client upload error:", error);
    res.status(400).json({ error: error.message });
  }
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const blob = await put(req.file.originalname, req.file.buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    res.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

router.post("/multiple", upload.array("files", 30), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }

    const results = await Promise.all(
      req.files.map((file) =>
        put(file.originalname, file.buffer, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        })
      )
    );

    res.json({ urls: results.map((r) => r.url) });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

export { router as uploadRoute };
