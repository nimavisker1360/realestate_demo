import express from "express";
import { getIstanbulMarketAnalytics } from "../controllers/marketCntrl.js";

const router = express.Router();

router.get("/istanbul", getIstanbulMarketAnalytics);

export { router as marketRoute };

