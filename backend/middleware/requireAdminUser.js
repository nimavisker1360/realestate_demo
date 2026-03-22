import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";

const getAuthenticatedEmail = (req) => {
  const payload = req?.auth?.payload;
  if (!payload || typeof payload !== "object") return "";

  const candidates = [
    payload.email,
    payload["https://hbrealstate.com/email"],
    payload["https://www.hbrealstate.com/email"],
  ];

  for (const value of candidates) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) return normalized;
  }

  return "";
};

export const requireAdminUser = asyncHandler(async (req, res, next) => {
  const email = getAuthenticatedEmail(req);
  if (!email) {
    return res.status(403).json({
      success: false,
      message: "Admin access requires an authenticated email claim.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      isAdmin: true,
    },
  });

  if (!user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  req.adminUser = user;
  next();
});
