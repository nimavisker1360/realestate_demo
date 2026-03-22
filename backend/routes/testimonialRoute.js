import express from "express";
import jwtCheck from "../config/authOConfig.js";
import {
  getAllTestimonials,
  submitTestimonial,
  getAllTestimonialsAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialPublish,
  reorderTestimonials,
} from "../controllers/testimonialCntrl.js";

const router = express.Router();

// Public
router.get("/all", getAllTestimonials);
router.post("/submit", submitTestimonial);

// Admin (protected)
router.get("/admin/all", jwtCheck, getAllTestimonialsAdmin);
router.post("/create", jwtCheck, createTestimonial);
router.put("/update/:id", jwtCheck, updateTestimonial);
router.delete("/delete/:id", jwtCheck, deleteTestimonial);
router.patch("/toggle/:id", jwtCheck, toggleTestimonialPublish);
router.put("/reorder", jwtCheck, reorderTestimonials);

export { router as testimonialRoute };
