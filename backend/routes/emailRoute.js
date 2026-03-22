import express from "express";
import jwtCheck from "../config/authOConfig.js";
import { requireAdminUser } from "../middleware/requireAdminUser.js";
import {
  sendEmail,
  getAllMessages,
  deleteMessage,
  markAsRead,
  updateLeadStatus,
} from "../controllers/emailCntrl.js";

const router = express.Router();

// POST /api/email/send
router.post("/send", sendEmail);

// GET /api/email/messages
router.get("/messages", jwtCheck, requireAdminUser, getAllMessages);

// DELETE /api/email/messages/:id
router.delete("/messages/:id", jwtCheck, requireAdminUser, deleteMessage);

// PUT /api/email/messages/:id/read
router.put("/messages/:id/read", jwtCheck, requireAdminUser, markAsRead);

// PUT /api/email/messages/:id/status
router.put("/messages/:id/status", jwtCheck, requireAdminUser, updateLeadStatus);

export { router as emailRoute };
