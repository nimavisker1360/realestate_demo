import express from "express";
import { assistantChat, assistantSendResults, assistantTranscribe } from "../controllers/assistantCntrl.js";

const router = express.Router();

router.post("/chat", assistantChat);
router.post("/send-results", assistantSendResults);
router.post("/transcribe", assistantTranscribe);

export { router as assistantRoute };
