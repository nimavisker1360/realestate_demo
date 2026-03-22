import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Button, Paper, TextInput, Textarea } from "@mantine/core";
import { toast } from "react-toastify";
import { bilingualKey } from "../utils/bilingualToast";
import { sendEmail } from "../utils/api";

const BlogContactForm = ({ contextTitle, className, fullWidth }) => {
  const { t, i18n } = useTranslation();
  const isTurkish = i18n.language?.toLowerCase().startsWith("tr");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const subject = useMemo(() => {
    const base = "Blog Inquiry";
    if (contextTitle) return `${base}: ${contextTitle}`;
    return base;
  }, [contextTitle]);

  const description = useMemo(() => {
    if (isTurkish && contextTitle) {
      return `${contextTitle} ${t("projectDetail.contactDescription")}`;
    }
    return t("projectDetail.contactDescription");
  }, [contextTitle, isTurkish, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error(bilingualKey("projectDetail.errorName"));
      return;
    }
    if (!formData.email.trim()) {
      toast.error(bilingualKey("projectDetail.errorEmail"));
      return;
    }
    if (!formData.message.trim()) {
      toast.error(bilingualKey("contactModal.errorMessage"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(bilingualKey("projectDetail.errorEmailInvalid"));
      return;
    }

    setLoading(true);
    try {
      await sendEmail({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "",
        subject,
        message: formData.message,
      });
      toast.success(bilingualKey("projectDetail.contactSuccess"));
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      toast.error(bilingualKey("projectDetail.contactError"));
      console.error("Error sending email:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`mt-16 ${className || ""}`.trim()}>
      <div className={fullWidth ? "max-w-none" : "mx-auto max-w-5xl"}>
        <Paper
          shadow="sm"
          className="rounded-[28px] border border-emerald-100/80 bg-white/95 p-6 sm:p-8 md:p-10 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.25)]"
        >
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-slate-900">
              {t("projectDetail.contactUs")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-4">
            <TextInput
              placeholder={t("projectDetail.name")}
              value={formData.name}
              onChange={(event) =>
                setFormData({ ...formData, name: event.target.value })
              }
              required
            />
            <TextInput
              type="email"
              placeholder={t("projectDetail.email")}
              value={formData.email}
              onChange={(event) =>
                setFormData({ ...formData, email: event.target.value })
              }
              required
            />
            <TextInput
              placeholder={t("projectDetail.phone")}
              value={formData.phone}
              onChange={(event) =>
                setFormData({ ...formData, phone: event.target.value })
              }
            />
            <Textarea
              placeholder={t("projectDetail.messagePlaceholder")}
              value={formData.message}
              onChange={(event) =>
                setFormData({ ...formData, message: event.target.value })
              }
              rows={4}
              maxLength={250}
              required
            />
            <div className="text-right text-xs text-gray-400">
              {formData.message.length} / 250
            </div>

            <p className="text-xs text-gray-500">
              {t("projectDetail.privacyNotice")}
            </p>

            <Button
              type="submit"
              fullWidth
              color="orange"
              size="md"
              loading={loading}
              disabled={loading}
            >
              {t("projectDetail.requestInfo")}
            </Button>
          </form>
        </Paper>
      </div>
    </section>
  );
};

BlogContactForm.propTypes = {
  contextTitle: PropTypes.string,
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
};

export default BlogContactForm;
