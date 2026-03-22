import asyncHandler from "express-async-handler";
import nodemailer from "nodemailer";
import {
  runRealEstateAssistant,
  transcribeAssistantAudio,
} from "../services/realEstateAssistant.js";

export const assistantChat = asyncHandler(async (req, res) => {
  const { message, history, attribution } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      message: "message is required",
    });
  }

  try {
    const result = await runRealEstateAssistant({ message, history, attribution });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: "Assistant request failed",
      error: error.message,
    });
  }
});

export const assistantSendResults = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, email, results } = req.body || {};

  if (!email || !firstName) {
    return res.status(400).json({
      success: false,
      message: "firstName and email are required",
    });
  }

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No property results to send",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const fullName = [firstName, lastName].filter(Boolean).join(" ");

    const propertyCards = results
      .map((item) => {
        const price =
          Number(item.price_usd) > 0
            ? `$${Number(item.price_usd).toLocaleString()}`
            : Number(item.price_try) > 0
            ? `${Number(item.price_try).toLocaleString()} TRY`
            : "Price on request";

        const location = [item.city, item.district].filter(Boolean).join(" - ");
        const detailUrl = item.detail_url || "";

        return `
          <div style="border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; margin-bottom: 16px; background: #fff;">
            ${
              item.image_url
                ? `<img src="${item.image_url}" alt="${item.title || "Property"}" style="width: 100%; height: 200px; object-fit: cover;" />`
                : ""
            }
            <div style="padding: 16px;">
              <h3 style="margin: 0 0 6px; color: #1a1a1a; font-size: 16px;">${item.title || "Property"}</h3>
              ${location ? `<p style="margin: 0 0 6px; color: #666; font-size: 13px;">${location}</p>` : ""}
              <p style="margin: 0 0 8px; color: #059669; font-weight: bold; font-size: 15px;">${price}</p>
              <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
                ${item.rooms ? `<span>Rooms: ${item.rooms}</span>&nbsp;&nbsp;` : ""}
                ${item.size_m2 ? `<span>Size: ${item.size_m2} m²</span>&nbsp;&nbsp;` : ""}
                ${item.delivery_date ? `<span>Delivery: ${item.delivery_date}</span>` : ""}
              </div>
              ${
                detailUrl
                  ? `<a href="${detailUrl}" style="display: inline-block; background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 8px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">View Project</a>`
                  : ""
              }
            </div>
          </div>`;
      })
      .join("");

    const userMail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your Property Selections - HB International Real Estate`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Your Property Selections</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Curated by our AI Property Assistant</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #333; font-size: 15px; margin-bottom: 20px;">Dear ${fullName},</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for using our AI Property Assistant. Here are the properties we found for you:
            </p>
            ${propertyCards}
            <div style="margin-top: 24px; padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #333; font-weight: 600;">Need more information?</p>
              <p style="margin: 0; color: #555; font-size: 13px; line-height: 1.5;">
                Contact us directly:<br/>
                <strong>Phone:</strong> +90 555 123 45 67<br/>
                <strong>Email:</strong> demo.realestate@gmail.com
              </p>
            </div>
            <p style="color: #555; margin-top: 20px; font-size: 14px;">
              Best regards,<br/>
              <strong style="color: #059669;">HB International Team</strong>
            </p>
          </div>
        </div>`,
    };

    await transporter.sendMail(userMail);

    const companyMail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      replyTo: email,
      subject: `AI Assistant Lead: ${fullName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center; font-size: 20px;">New Lead from AI Assistant</h1>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${fullName}</td></tr>
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
              ${phone ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="tel:${phone}">${phone}</a></td></tr>` : ""}
              <tr><td style="padding: 8px 0;"><strong>Properties sent:</strong></td><td style="padding: 8px 0;">${results.length} properties</td></tr>
            </table>
            <div style="margin-top: 16px;">
              <p style="font-weight: 600; margin-bottom: 8px;">Properties:</p>
              <ul style="padding-left: 20px; color: #555;">
                ${results.map((r) => `<li>${r.title || "Untitled"} – ${[r.city, r.district].filter(Boolean).join(", ")}</li>`).join("")}
              </ul>
            </div>
          </div>
        </div>`,
    };

    await transporter.sendMail(companyMail);

    return res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending assistant results email:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
});

export const assistantTranscribe = asyncHandler(async (req, res) => {
  const { audio_base64, mime_type, language } = req.body || {};

  if (!audio_base64 || typeof audio_base64 !== "string") {
    return res.status(400).json({
      message: "audio_base64 is required",
    });
  }

  try {
    const result = await transcribeAssistantAudio({
      audio_base64,
      mime_type,
      language,
    });
    return res.status(200).json(result);
  } catch (error) {
    const msg = String(error?.message || "");
    if (msg.includes("audio payload is too large")) {
      return res.status(413).json({
        message: "Assistant transcription failed",
        error: msg,
      });
    }
    if (msg.includes("audio payload is empty")) {
      return res.status(400).json({
        message: "Assistant transcription failed",
        error: msg,
      });
    }
    return res.status(500).json({
      message: "Assistant transcription failed",
      error: msg || "Unknown transcription error",
    });
  }
});
