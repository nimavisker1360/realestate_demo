import asyncHandler from "express-async-handler";
import nodemailer from "nodemailer";
import { prisma } from "../config/prismaConfig.js";

const clampRating = (value) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 5;
  return Math.max(1, Math.min(5, Math.round(parsed)));
};

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Public: get all published testimonials
export const getAllTestimonials = asyncHandler(async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.status(200).send(testimonials);
  } catch (err) {
    console.error("Error fetching testimonials:", err);
    res.status(500).send({ message: "Error fetching testimonials" });
  }
});

// Public: submit testimonial (unpublished)
export const submitTestimonial = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    rating,
    comment,
    comment_tr,
    comment_en,
    role,
    company,
    staffBehavior,
  } = req.body;

  const baseComment = comment || comment_tr || comment_en || "";
  if (!name || !email || !baseComment) {
    return res
      .status(400)
      .send({ message: "Name, email and comment are required" });
  }

  try {
    const maxOrder = await prisma.testimonial.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        role: role || "",
        company: company || "",
        image: "",
        rating: clampRating(rating),
        comment: baseComment,
        comment_en: comment_en || null,
        comment_tr: comment_tr || null,
        staffBehavior: staffBehavior || "",
        published: false,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    try {
      const transporter = createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        replyTo: email,
        subject: `New Testimonial from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0f172a; padding: 24px; border-radius: 10px 10px 0 0;">
              <h2 style="color: white; margin: 0;">New Testimonial Submitted</h2>
            </div>
            <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="margin: 0 0 12px; color: #333;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 0 0 12px; color: #333;"><strong>Email:</strong> <a href="mailto:${email}" style="color:#06a84e;">${email}</a></p>
              <p style="margin: 0 0 12px; color: #333;"><strong>Rating:</strong> ${clampRating(rating)}/5</p>
              ${role || company ? `<p style="margin: 0 0 12px; color: #333;"><strong>Role/Company:</strong> ${[role, company].filter(Boolean).join(" | ")}</p>` : ""}
              ${staffBehavior ? `<p style="margin: 0 0 12px; color: #333;"><strong>Staff Behavior:</strong> ${staffBehavior}</p>` : ""}
              <div style="margin-top: 16px;">
                <strong style="color: #333;">Comment:</strong>
                <div style="background: white; padding: 12px; border-radius: 6px; margin-top: 8px; border: 1px solid #e0e0e0; color: #555; line-height: 1.6;">
                  ${baseComment.replace(/\n/g, "<br>")}
                </div>
              </div>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error("Testimonial email sending failed:", emailError);
    }

    res.status(201).send({ message: "Testimonial submitted", testimonial });
  } catch (err) {
    console.error("Error submitting testimonial:", err);
    res.status(500).send({ message: "Error submitting testimonial" });
  }
});

// Admin: get all testimonials
export const getAllTestimonialsAdmin = asyncHandler(async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    res.status(200).send({ totalTestimonials: testimonials.length, testimonials });
  } catch (err) {
    console.error("Error fetching testimonials (admin):", err);
    res.status(500).send({ message: "Error fetching testimonials" });
  }
});

// Admin: create testimonial
export const createTestimonial = asyncHandler(async (req, res) => {
  const { data } = req.body;

  const fallbackComment =
    data?.comment || data?.comment_tr || data?.comment_en || "";

  if (!data?.name || !fallbackComment) {
    return res
      .status(400)
      .send({ message: "Name and comment are required" });
  }

  try {
    const maxOrder = await prisma.testimonial.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const testimonial = await prisma.testimonial.create({
      data: {
        name: data.name,
        role: data.role || "",
        company: data.company || "",
        image: data.image || "",
        rating: clampRating(data.rating),
        comment: fallbackComment,
        comment_en: data.comment_en || null,
        comment_tr: data.comment_tr || null,
        staffBehavior: data.staffBehavior || "",
        published: data.published !== undefined ? data.published : true,
        order: (maxOrder?.order || 0) + 1,
      },
    });

    res.status(201).send({ message: "Testimonial created", testimonial });
  } catch (err) {
    console.error("Error creating testimonial:", err);
    res.status(500).send({ message: "Error creating testimonial" });
  }
});

// Admin: update testimonial
export const updateTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;
  const hasLocalizedComment = data?.comment_tr || data?.comment_en;
  const commentValue =
    data?.comment ||
    (hasLocalizedComment ? data?.comment_tr || data?.comment_en : undefined);

  try {
    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        company: data.company,
        image: data.image,
        rating: clampRating(data.rating),
        comment: commentValue,
        comment_en: data.comment_en,
        comment_tr: data.comment_tr,
        staffBehavior: data.staffBehavior,
        published: data.published,
      },
    });

    res.status(200).send({ message: "Testimonial updated", testimonial });
  } catch (err) {
    console.error("Error updating testimonial:", err);
    res.status(500).send({ message: "Error updating testimonial" });
  }
});

// Admin: delete testimonial
export const deleteTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.testimonial.delete({ where: { id } });
    res.status(200).send({ message: "Testimonial deleted" });
  } catch (err) {
    console.error("Error deleting testimonial:", err);
    res.status(500).send({ message: "Error deleting testimonial" });
  }
});

// Admin: toggle publish status
export const toggleTestimonialPublish = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const testimonial = await prisma.testimonial.findUnique({ where: { id } });

    if (!testimonial) {
      return res.status(404).send({ message: "Testimonial not found" });
    }

    const updated = await prisma.testimonial.update({
      where: { id },
      data: { published: !testimonial.published },
    });

    res.status(200).send({ message: "Testimonial status updated", testimonial: updated });
  } catch (err) {
    console.error("Error toggling testimonial publish:", err);
    res.status(500).send({ message: "Error updating testimonial status" });
  }
});

// Admin: reorder testimonials
export const reorderTestimonials = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  try {
    const updatePromises = orderedIds.map((id, index) =>
      prisma.testimonial.update({
        where: { id },
        data: { order: index },
      })
    );

    await Promise.all(updatePromises);
    res.status(200).send({ message: "Testimonials reordered successfully" });
  } catch (err) {
    console.error("Error reordering testimonials:", err);
    res.status(500).send({ message: "Error reordering testimonials" });
  }
});
