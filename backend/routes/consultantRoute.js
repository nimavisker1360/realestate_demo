import express from "express";
import {
  getAllConsultants,
  getConsultant,
  createConsultant,
  updateConsultant,
  deleteConsultant,
  toggleAvailability,
  reorderConsultants,
} from "../controllers/consultantCntrl.js";
import jwtCheck from "../config/authOConfig.js";

const router = express.Router();

// Public routes
router.get("/all", getAllConsultants);
router.get("/:id", getConsultant);

// Protected routes (admin only)
router.post("/create", jwtCheck, createConsultant);
router.put("/update/:id", jwtCheck, updateConsultant);
router.delete("/delete/:id", jwtCheck, deleteConsultant);
router.patch("/toggle/:id", jwtCheck, toggleAvailability);
router.put("/reorder", jwtCheck, reorderConsultants);

export { router as consultantRoute };
