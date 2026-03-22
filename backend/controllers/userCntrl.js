import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

const buildUserCreateData = (payload = {}) => ({
  email: normalizeEmail(payload.email),
  name: payload.name || null,
  image: payload.image || null,
  phone: payload.phone || null,
  address: payload.address || null,
  bookedVisits: [],
  favResidenciesID: [],
});

const findOrCreateUser = async (email) => {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: buildUserCreateData({ email }),
  });
};

export const createUser = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: req.body?.name || undefined,
      image: req.body?.image || undefined,
      phone: req.body?.phone || undefined,
      address: req.body?.address || undefined,
    },
    create: buildUserCreateData({ ...req.body, email }),
  });

  if (!existingUser) {
    return res.status(201).send({
      message: "User registered successfully",
      user,
    });
  }

  return res.status(200).send({
    message: "User already registered",
    user,
  });
});

export const bookVisit = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { date } = req.body;
  const { id } = req.params;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await findOrCreateUser(email);

    if (user.bookedVisits.some((visit) => visit.id === id)) {
      return res.status(400).json({
        message: "This residency visit is already booked",
      });
    }

    await prisma.user.update({
      where: { email },
      data: {
        bookedVisits: { push: { id, date } },
      },
    });

    return res.send("Visit booked successfully");
  } catch (err) {
    throw new Error(err.message);
  }
});

export const allBookings = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  try {
    if (!email) {
      return res.status(200).send({ bookedVisits: [] });
    }

    const bookings = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        bookedVisits: true,
      },
    });

    return res.status(200).send(bookings || { bookedVisits: [] });
  } catch (err) {
    throw new Error(err.message);
  }
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { id } = req.params;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { bookedVisits: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const index = user.bookedVisits.findIndex((visit) => visit.id === id);
    if (index === -1) {
      return res.status(400).json({
        message: "Booking not found",
      });
    }

    user.bookedVisits.splice(index, 1);
    await prisma.user.update({
      where: { email },
      data: { bookedVisits: user.bookedVisits },
    });

    return res.send("Booking cancelled successfully");
  } catch (err) {
    throw new Error(err.message);
  }
});

export const toFav = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { rid } = req.params;

  try {
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await findOrCreateUser(email);

    if (user.favResidenciesID.includes(rid)) {
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          favResidenciesID: {
            set: user.favResidenciesID.filter((id) => id !== rid),
          },
        },
      });

      return res.send({
        message: "Residency removed from favorites successfully",
        user: updatedUser,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        favResidenciesID: { push: rid },
      },
    });

    return res.send({
      message: "Residency added to favorites successfully",
      user: updatedUser,
    });
  } catch (err) {
    throw new Error(err.message);
  }
});

export const getAllFav = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  try {
    if (!email) {
      return res.status(200).send({ favResidenciesID: [] });
    }

    const favResd = await prisma.user.findUnique({
      where: { email },
      select: { favResidenciesID: true },
    });

    return res.status(200).send(favResd || { favResidenciesID: [] });
  } catch (err) {
    throw new Error(err.message);
  }
});

export const checkAdmin = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { isAdmin: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ isAdmin: false, message: "User not found" });
    }

    return res.status(200).json({ isAdmin: user.isAdmin || false });
  } catch (err) {
    throw new Error(err.message);
  }
});

export const setAdmin = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { adminSecret } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });

    return res.status(200).json({ message: "User is now admin", user });
  } catch (err) {
    throw new Error(err.message);
  }
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        address: true,
        profileComplete: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    throw new Error(err.message);
  }
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { name, image, phone, address } = req.body;

  try {
    const profileComplete = !!(name && image && phone && address);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        name,
        image,
        phone,
        address,
        profileComplete,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        phone: updatedUser.phone,
        address: updatedUser.address,
        profileComplete: updatedUser.profileComplete,
      },
    });
  } catch (err) {
    throw new Error(err.message);
  }
});

export const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        address: true,
        profileComplete: true,
        isAdmin: true,
        bookedVisits: true,
        favResidenciesID: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      totalUsers: users.length,
      users,
    });
  } catch (err) {
    throw new Error(err.message);
  }
});

export const getAllUsersBookings = asyncHandler(async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        bookedVisits: {
          isEmpty: false,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bookedVisits: true,
      },
    });

    const allBookingIds = users.flatMap((user) =>
      user.bookedVisits.map((booking) => booking.id)
    );

    const residencies = await prisma.residency.findMany({
      where: {
        id: {
          in: allBookingIds,
        },
      },
      select: {
        id: true,
        title: true,
        address: true,
        city: true,
        country: true,
        image: true,
        price: true,
      },
    });

    const residencyMap = {};
    residencies.forEach((residency) => {
      residencyMap[residency.id] = residency;
    });

    const allBookings = [];
    users.forEach((user) => {
      user.bookedVisits.forEach((booking) => {
        const residency = residencyMap[booking.id];
        allBookings.push({
          bookingId: `${user.id}-${booking.id}`,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
          property: residency || {
            id: booking.id,
            title: "Property Not Found",
          },
          date: booking.date,
        });
      });
    });

    allBookings.sort((a, b) => {
      const dateA = a.date.split("/").reverse().join("");
      const dateB = b.date.split("/").reverse().join("");
      return dateB.localeCompare(dateA);
    });

    return res.status(200).json({
      totalBookings: allBookings.length,
      bookings: allBookings,
    });
  } catch (err) {
    console.error("Error fetching all bookings:", err);
    throw new Error(err.message);
  }
});

export const deleteUser = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.params?.email);

  try {
    await prisma.user.delete({
      where: { email },
    });

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    throw new Error(err.message);
  }
});
