import express from "express";
import {
  getRecommendations,
  handoffEmail,
  handoffWhatsApp,
  sendMessage,
  startChat,
  submitLead,
} from "../controllers/aiSalesAgentController.js";

const router = express.Router();

router.post("/chat/start", startChat);
router.post("/chat/message", sendMessage);
router.post("/lead/submit", submitLead);
router.get("/recommendations", getRecommendations);
router.post("/recommendations", getRecommendations);
router.post("/handoff/whatsapp", handoffWhatsApp);
router.post("/handoff/email", handoffEmail);

export { router as aiSalesAgentRoute };
