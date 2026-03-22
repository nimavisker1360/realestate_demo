import express from "express";
import {
  allBookings,
  bookVisit,
  createUser,
  cancelBooking,
  toFav,
  getAllFav,
  checkAdmin,
  setAdmin,
  getAllUsersBookings,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
} from "../controllers/userCntrl.js";
import jwtCheck from "../config/authOConfig.js";

const router = express.Router();

router.post(
  "/register",
  (req, res, next) => {
    console.log("🚀 Request received at /api/user/register");
    console.log("📦 Body:", req.body);
    next();
  },
  createUser
);
router.post("/bookVisit/:id", jwtCheck, bookVisit);
router.post("/allBookings", allBookings);
router.post("/removeBooking/:id",jwtCheck, cancelBooking);
router.post("/toFav/:rid",jwtCheck, toFav);
router.post("/allFav",jwtCheck, getAllFav);
router.post("/checkAdmin", jwtCheck, checkAdmin);
router.post("/setAdmin", setAdmin);
router.get("/admin/allBookings", jwtCheck, getAllUsersBookings);

// Profile routes
router.post("/profile", jwtCheck, getUserProfile);
router.put("/profile", jwtCheck, updateUserProfile);

// Admin routes
router.get("/admin/allUsers", jwtCheck, getAllUsers);

export { router as userRoute }; 
