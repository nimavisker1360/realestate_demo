import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { MdInfoOutline } from "react-icons/md";
import { bilingualKey } from "../utils/bilingualToast";
import { sendEmail } from "../utils/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildFallbackMessage = (propertyTitle, locationLabel) => {
  const normalizedTitle = String(propertyTitle || "").trim() || "this property";
  const normalizedLocation = String(locationLabel || "").trim();

  if (!normalizedLocation) {
    return `I am interested in ${normalizedTitle}. Please contact me with more information.`;
  }

  return `I am interested in ${normalizedTitle} located in ${normalizedLocation}. Please contact me with more information.`;
};

const InquirySidebarCard = ({
  propertyId,
  propertyTitle,
  listingNo = "",
  locationLabel = "",
  consultantId = "",
  subjectPrefix = "Property Inquiry",
  className = "",
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleFieldChange = (field) => (event) => {
    const value = event?.target?.value ?? "";
    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!contactForm.name.trim()) {
      toast.error(bilingualKey("projectDetail.errorName"));
      return;
    }

    if (!contactForm.email.trim()) {
      toast.error(bilingualKey("projectDetail.errorEmail"));
      return;
    }

    if (!EMAIL_REGEX.test(contactForm.email)) {
      toast.error(bilingualKey("projectDetail.errorEmailInvalid"));
      return;
    }

    setLoading(true);

    try {
      await sendEmail({
        name: contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim(),
        subject: `${subjectPrefix}: ${propertyTitle || "Property"}`,
        message:
          contactForm.message.trim() ||
          buildFallbackMessage(propertyTitle, locationLabel),
        propertyId: propertyId || null,
        propertyTitle: propertyTitle || null,
        listingNo: listingNo || null,
        consultantId: consultantId || null,
      });

      toast.success(bilingualKey("projectDetail.contactSuccess"));
      setContactForm({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      toast.error(bilingualKey("projectDetail.contactError"));
      console.error("Error sending inquiry email:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_70px_-48px_rgba(15,23,42,0.48)] ${className}`}
    >
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,122,26,0.16),_transparent_40%),linear-gradient(180deg,_#ffffff_0%,_#fff7f1_100%)] p-6">
        {listingNo ? (
          <div className="mb-4 inline-flex items-center rounded-full border border-[#ffd6ba] bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#c75d1b]">
            #{listingNo}
          </div>
        ) : null}

        <h3 className="text-[28px] font-semibold leading-tight text-slate-900">
          {t("projectDetail.contactUs")}
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("projectDetail.contactDescription")}
        </p>

        {(propertyTitle || locationLabel) && (
          <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_14px_30px_-24px_rgba(255,122,26,0.5)] backdrop-blur">
            {propertyTitle ? (
              <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900">
                {propertyTitle}
              </p>
            ) : null}
            {locationLabel ? (
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                {locationLabel}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4">
          <input
            type="text"
            value={contactForm.name}
            onChange={handleFieldChange("name")}
            placeholder={t("projectDetail.name")}
            aria-label={t("projectDetail.name")}
            autoComplete="name"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff8a3d] focus:ring-4 focus:ring-[#ff8a3d]/10"
            required
          />

          <input
            type="email"
            value={contactForm.email}
            onChange={handleFieldChange("email")}
            placeholder={t("projectDetail.email")}
            aria-label={t("projectDetail.email")}
            autoComplete="email"
            inputMode="email"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#ff8a3d] focus:ring-4 focus:ring-[#ff8a3d]/10"
            required
          />

          <div className="relative">
            <input
              type="tel"
              value={contactForm.phone}
              onChange={handleFieldChange("phone")}
              placeholder={t("projectDetail.phone")}
              aria-label={t("projectDetail.phone")}
              autoComplete="tel"
              inputMode="tel"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#ff8a3d] focus:ring-4 focus:ring-[#ff8a3d]/10"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
              <MdInfoOutline size={18} />
            </span>
          </div>

          <div>
            <textarea
              value={contactForm.message}
              onChange={handleFieldChange("message")}
              placeholder={t("projectDetail.messagePlaceholder")}
              aria-label={t("projectDetail.messagePlaceholder")}
              rows={5}
              maxLength={250}
              className="min-h-[132px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#ff8a3d] focus:ring-4 focus:ring-[#ff8a3d]/10"
            />
            <div className="mt-2 text-right text-xs font-medium text-slate-400">
              {contactForm.message.length} / 250
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          {t("projectDetail.privacyNotice")}
        </p>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#ff7a1a_0%,#ff9a3d_100%)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_20px_32px_-20px_rgba(255,122,26,0.95)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-18px_rgba(255,122,26,0.95)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
          ) : null}
          <span>{t("projectDetail.requestInfo")}</span>
        </button>
      </form>
    </div>
  );
};

export default InquirySidebarCard;
