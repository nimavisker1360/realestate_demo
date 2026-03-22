import express from "express";
import {
  createResidency,
  getAllResidencies,
  getResidency,
  getResidenciesByConsultant,
  updateResidency,
  deleteResidency,
} from "../controllers/resdCntrl.js";
import jwtCheck from "../config/authOConfig.js";

const router = express.Router();

router.post("/create", jwtCheck, createResidency);
router.get("/allresd", getAllResidencies);
router.get("/consultant/:consultantId", getResidenciesByConsultant);
router.get("/:id", getResidency);
router.put("/update/:id", jwtCheck, updateResidency);
router.delete("/delete/:id", jwtCheck, deleteResidency);

export { router as residencyRoute };
