import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";

// Get all consultants
export const getAllConsultants = asyncHandler(async (req, res) => {
  try {
    const consultants = await prisma.consultant.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.status(200).json(consultants);
  } catch (err) {
    throw new Error(err.message);
  }
});

// Get single consultant
export const getConsultant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const consultant = await prisma.consultant.findUnique({
      where: { id },
    });
    if (!consultant) {
      return res.status(404).json({ message: "Consultant not found" });
    }
    res.status(200).json(consultant);
  } catch (err) {
    throw new Error(err.message);
  }
});

// Create consultant (admin only)
export const createConsultant = asyncHandler(async (req, res) => {
  const { data } = req.body;
  console.log("Creating consultant with data:", data);

  try {
    const consultant = await prisma.consultant.create({
      data: {
        name: data.name,
        title: data.title,
        title_en: data.title_en || data.title,
        title_tr: data.title_tr || data.title,
        specialty: data.specialty,
        specialty_en: data.specialty_en || data.specialty,
        specialty_tr: data.specialty_tr || data.specialty,
        experience: data.experience,
        languages: data.languages || [],
        rating: data.rating || 5.0,
        reviews: data.reviews || 0,
        deals: data.deals || 0,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        linkedin: data.linkedin || "",
        image: data.image,
        bio: data.bio,
        bio_en: data.bio_en || data.bio,
        bio_tr: data.bio_tr || data.bio,
        available: data.available !== undefined ? data.available : true,
      },
    });

    res.status(201).json({
      message: "Consultant created successfully",
      consultant,
    });
  } catch (err) {
    console.error("Error creating consultant:", err);
    throw new Error(err.message);
  }
});

// Update consultant (admin only)
export const updateConsultant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  console.log("=== UPDATE CONSULTANT ===");
  console.log("Consultant ID:", id);

  try {
    const existingConsultant = await prisma.consultant.findUnique({
      where: { id },
    });

    if (!existingConsultant) {
      return res.status(404).json({ message: "Consultant not found" });
    }

    // Build update data object, only including defined fields
    const updateData = {
      name: data.name,
      title: data.title,
      specialty: data.specialty,
      experience: data.experience,
      languages: data.languages,
      rating: data.rating,
      reviews: data.reviews,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      linkedin: data.linkedin,
      image: data.image,
      bio: data.bio,
      available: data.available,
    };

    // Add bilingual fields only if they are provided
    if (data.title_en !== undefined) updateData.title_en = data.title_en;
    if (data.title_tr !== undefined) updateData.title_tr = data.title_tr;
    if (data.specialty_en !== undefined) updateData.specialty_en = data.specialty_en;
    if (data.specialty_tr !== undefined) updateData.specialty_tr = data.specialty_tr;
    if (data.bio_en !== undefined) updateData.bio_en = data.bio_en;
    if (data.bio_tr !== undefined) updateData.bio_tr = data.bio_tr;
    if (data.deals !== undefined) updateData.deals = data.deals;

    const updatedConsultant = await prisma.consultant.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      message: "Consultant updated successfully",
      consultant: updatedConsultant,
    });
  } catch (err) {
    console.error("Error updating consultant:", err);
    throw new Error(err.message);
  }
});

// Delete consultant (admin only)
export const deleteConsultant = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const existingConsultant = await prisma.consultant.findUnique({
      where: { id },
    });

    if (!existingConsultant) {
      return res.status(404).json({ message: "Consultant not found" });
    }

    await prisma.consultant.delete({
      where: { id },
    });

    res.status(200).json({ message: "Consultant deleted successfully" });
  } catch (err) {
    console.error("Error deleting consultant:", err);
    throw new Error(err.message);
  }
});

// Toggle consultant availability (admin only)
export const toggleAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const consultant = await prisma.consultant.findUnique({
      where: { id },
    });

    if (!consultant) {
      return res.status(404).json({ message: "Consultant not found" });
    }

    const updatedConsultant = await prisma.consultant.update({
      where: { id },
      data: { available: !consultant.available },
    });

    res.status(200).json({
      message: `Consultant is now ${updatedConsultant.available ? "available" : "unavailable"}`,
      consultant: updatedConsultant,
    });
  } catch (err) {
    throw new Error(err.message);
  }
});

// Reorder consultants (admin only)
export const reorderConsultants = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  if (!orderedIds || !Array.isArray(orderedIds)) {
    return res.status(400).json({ message: "orderedIds array is required" });
  }

  try {
    // Update order for each consultant
    const updates = orderedIds.map((id, index) =>
      prisma.consultant.update({
        where: { id },
        data: { order: index },
      })
    );

    await Promise.all(updates);

    res.status(200).json({
      message: "Consultants reordered successfully",
    });
  } catch (err) {
    console.error("Error reordering consultants:", err);
    throw new Error(err.message);
  }
});
