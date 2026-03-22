import express from "express";
import {
  getAllBlogs,
  getAllBlogsAdmin,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  togglePublish,
  reorderBlogs,
  generateAIBlog,
  generateMultipleAIBlogs,
} from "../controllers/blogCntrl.js";
import jwtCheck from "../config/authOConfig.js";

const router = express.Router();

// Public routes
router.get("/all", getAllBlogs);
router.get("/:id", getBlog);

// Admin routes (protected)
router.get("/admin/all", jwtCheck, getAllBlogsAdmin);
router.post("/create", jwtCheck, createBlog);
router.put("/update/:id", jwtCheck, updateBlog);
router.delete("/delete/:id", jwtCheck, deleteBlog);
router.patch("/toggle/:id", jwtCheck, togglePublish);
router.put("/reorder", jwtCheck, reorderBlogs);

// AI Generation routes (protected)
router.post("/generate-ai", jwtCheck, generateAIBlog);
router.post("/generate-ai-multiple", jwtCheck, generateMultipleAIBlogs);

export { router as blogRoute };
