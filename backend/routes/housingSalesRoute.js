import express from "express";
import {
  getHousingSalesSummary,
  getHousingSalesByProvince,
  getHousingSalesByDistrict,
  getProvinces,
  getYears,
  getTurkeyStats,
} from "../controllers/housingSalesCntrl.js";

const router = express.Router();

// Public routes (no auth required for statistics)
router.get("/summary", getHousingSalesSummary);
router.get("/by-province", getHousingSalesByProvince);
router.get("/by-district", getHousingSalesByDistrict);
router.get("/provinces", getProvinces);
router.get("/years", getYears);
router.get("/turkey-stats", getTurkeyStats);

export { router as housingSalesRoute };
