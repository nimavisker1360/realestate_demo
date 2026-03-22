import asyncHandler from "express-async-handler";
import nodemailer from "nodemailer";
import { prisma } from "../config/prismaConfig.js";
import {
  extractLeadAttribution,
  LEAD_STATUS_VALUES,
} from "../utils/leadAttribution.js";
import { handleLeadStatusTransition } from "../services/leadStatusWorkflow.js";

// Create transporter with Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email and save to database
export const sendEmail = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    subject,
    message,
    propertyId,
    propertyTitle,
    listingNo,
    consultantId,
    consultantName,
    consultantEmail,
  } = req.body;
  const leadAttribution = extractLeadAttribution(req, {
    defaultLeadSource: "form",
  });

  // Validate required fields
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "Name, email and message are required",
    });
  }

  try {
    // Save message to database first
    const savedMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subject || "Property Inquiry",
        message,
        propertyId: propertyId || null,
        propertyTitle: propertyTitle || null,
        consultantId: consultantId || null,
        consultantName: consultantName || null,
        consultantEmail: consultantEmail || null,
        gclid: leadAttribution.gclid,
        gbraid: leadAttribution.gbraid,
        wbraid: leadAttribution.wbraid,
        utmSource: leadAttribution.utmSource,
        utmMedium: leadAttribution.utmMedium,
        utmCampaign: leadAttribution.utmCampaign,
        utmTerm: leadAttribution.utmTerm,
        utmContent: leadAttribution.utmContent,
        landingPage: leadAttribution.landingPage,
        referrer: leadAttribution.referrer,
        leadStatus: leadAttribution.leadStatus,
        leadSource: leadAttribution.leadSource,
        submittedAt: leadAttribution.submittedAt,
      },
    });

    // Try to send email (but don't fail if email sending fails)
    try {
      const transporter = createTransporter();

      // Email to the company
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        replyTo: email,
        subject: subject || `New Contact from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #06a84e 0%, #048a3d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; text-align: center;">New Property Inquiry</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
              ${(propertyTitle || propertyId || listingNo) ? `
              <div style="background: linear-gradient(135deg, #06a84e 0%, #048a3d 100%); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="color: white; font-weight: bold; font-size: 16px; margin-bottom: 5px;">🏠 Property:</div>
                ${propertyTitle ? `<div style="color: white; font-size: 14px;">${propertyTitle}</div>` : ""}
                ${listingNo ? `<div style="color: rgba(255,255,255,0.95); font-size: 13px; margin-top: 5px;"><strong>Listing No:</strong> ${listingNo}</div>` : ""}
                ${propertyId ? `<div style="color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 5px;">ID: ${propertyId}</div>` : ''}
              </div>
              ` : ''}
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333;">Name:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #555;">
                    ${name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333;">Email:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #555;">
                    <a href="mailto:${email}" style="color: #06a84e;">${email}</a>
                  </td>
                </tr>
                ${phone ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333;">Phone:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #555;">
                    <a href="tel:${phone}" style="color: #06a84e;">${phone}</a>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333;">Subject:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #555;">
                    ${subject || 'Property Inquiry'}
                  </td>
                </tr>
                ${(consultantName || consultantEmail) ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                    <strong style="color: #333;">Consultant:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0; color: #555;">
                    ${consultantName || "Selected consultant"}
                    ${consultantEmail ? `<div><a href="mailto:${consultantEmail}" style="color: #06a84e;">${consultantEmail}</a></div>` : ""}
                  </td>
                </tr>
                ` : ''}
              </table>
              <div style="margin-top: 20px;">
                <strong style="color: #333;">Message:</strong>
                <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px; border: 1px solid #e0e0e0; color: #555; line-height: 1.6;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
              <p>This email was sent from HB International Real Estate website</p>
            </div>
          </div>
        `,
      };

      // Send email
      await transporter.sendMail(mailOptions);

      // Send confirmation email to the user
      const confirmationMail = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Thank you for contacting HB International",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #06a84e 0%, #048a3d 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; text-align: center;">Thank You!</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="color: #333; font-size: 16px;">Dear ${name},</p>
              <p style="color: #555; line-height: 1.6;">Thank you for contacting HB International Real Estate. We have received your inquiry and will get back to you as soon as possible.</p>
              <p style="color: #555; line-height: 1.6;">In the meantime, feel free to browse our properties or contact us directly:</p>
              <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #e0e0e0;">
                <p style="margin: 5px 0; color: #555;"><strong>Phone:</strong> +90 555 123 45 67</p>
                <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> demo.realestate@gmail.com</p>
              </div>
              <p style="color: #555; line-height: 1.6;">Best regards,<br><strong style="color: #06a84e;">HB International Team</strong></p>
            </div>
          </div>
        `,
      };

      await transporter.sendMail(confirmationMail);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the request, message is already saved
    }

    res.status(200).json({
      success: true,
      message: "Message received successfully",
      data: savedMessage,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save message",
      error: error.message,
    });
  }
});

export const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const nextLeadStatus = extractLeadAttribution(req, {
    defaultLeadStatus: null,
    defaultLeadSource: null,
    defaultSubmittedAt: null,
  }).leadStatus;

  if (!nextLeadStatus || !LEAD_STATUS_VALUES.includes(nextLeadStatus)) {
    return res.status(400).json({
      success: false,
      message: `lead_status must be one of: ${LEAD_STATUS_VALUES.join(", ")}`,
    });
  }

  try {
    const existingMessage = await prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const transitionAt = new Date();
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { leadStatus: nextLeadStatus },
    });

    await handleLeadStatusTransition({
      previousLead: existingMessage,
      nextLead: message,
      transitionAt,
    });

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lead status",
      error: error.message,
    });
  }
});

// Get all contact messages
export const getAllMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      totalMessages: messages.length,
      messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// Delete a contact message
export const deleteMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.contactMessage.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
});

// Mark message as read
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({
      success: true,
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update message",
      error: error.message,
    });
  }
});
