import { useState, useContext, useEffect } from "react";
import { Modal, TextInput, Textarea, Button, Group, Rating } from "@mantine/core";
import { toast } from "react-toastify";
import { bilingualKey } from "../utils/bilingualToast";
import { sendEmail, submitTestimonial } from "../utils/api";
import { FaEnvelope, FaUser, FaPhone } from "react-icons/fa6";
import PropTypes from "prop-types";
import UserDetailContext from "../context/UserDetailContext";
import { useTranslation } from "react-i18next";
import useConsultants from "../hooks/useConsultants";

const ContactModal = ({
  opened,
  onClose,
  propertyId,
  propertyTitle,
  listingNo,
  userEmail,
  consultantId,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "tr" ? "tr" : "en";
  const { data: consultants = [], isLoading: consultantsLoading } =
    useConsultants();
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedConsultantId, setSelectedConsultantId] = useState(null);
  const [activeTab, setActiveTab] = useState("message");
  const {
    userDetails: { bookings },
  } = useContext(UserDetailContext);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [reviewData, setReviewData] = useState({
    name: "",
    email: "",
    rating: 5,
    comment: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setSelectedConsultantId(null);
    setActiveTab("message");
    setReviewData({
      name: "",
      email: "",
      rating: 5,
      comment: "",
    });
    onClose();
  };

  const getLocalizedField = (consultant, field) => {
    const localizedKey = `${field}_${currentLang}`;
    return consultant?.[localizedKey] || consultant?.[field] || "";
  };

  const allConsultants = Array.isArray(consultants) ? consultants : [];
  const availableConsultants = allConsultants.filter(
    (c) => c.available !== false
  );
  const scopedConsultants = consultantId
    ? allConsultants.filter((c) => c.id === consultantId)
    : allConsultants;
  const selectedConsultant = scopedConsultants.find(
    (c) => c.id === selectedConsultantId
  );

  useEffect(() => {
    if (!opened) return;
    if (consultantId) {
      setSelectedConsultantId(consultantId);
    }
  }, [consultantId, opened]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error(bilingualKey("contactModal.errorName"));
      return;
    }
    if (!formData.email.trim()) {
      toast.error(bilingualKey("contactModal.errorEmail"));
      return;
    }
    if (!formData.message.trim()) {
      toast.error(bilingualKey("contactModal.errorMessage"));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(bilingualKey("contactModal.errorEmailInvalid"));
      return;
    }

    setLoading(true);
    try {
      const emailDataToSend = {
        ...formData,
        subject: formData.subject || t("contactModal.subjectDefault"),
        propertyId: propertyId || null,
        propertyTitle: propertyTitle || null,
        listingNo: listingNo || null,
        consultantId: selectedConsultant?.id || null,
        consultantName: selectedConsultant?.name || null,
        consultantEmail: selectedConsultant?.email || null,
      };
      
      await sendEmail(emailDataToSend);
      toast.success(bilingualKey("contactModal.successMessage"));
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      setSelectedConsultantId(null);
      onClose();
    } catch (error) {
      toast.error(bilingualKey("contactModal.errorSending"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewData.name.trim()) {
      toast.error(bilingualKey("contactModal.errorName"));
      return;
    }
    if (!reviewData.email.trim()) {
      toast.error(bilingualKey("contactModal.errorEmail"));
      return;
    }
    if (!reviewData.comment.trim()) {
      toast.error(bilingualKey("contactModal.errorMessage"));
      return;
    }
    if (!reviewData.rating || reviewData.rating < 1) {
      toast.error(bilingualKey("contactModal.errorRating"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reviewData.email)) {
      toast.error(bilingualKey("contactModal.errorEmailInvalid"));
      return;
    }

    setReviewLoading(true);
    try {
      const isTurkish = currentLang === "tr";
      const payload = {
        name: reviewData.name,
        email: reviewData.email,
        rating: reviewData.rating,
        comment: reviewData.comment,
        comment_tr: isTurkish ? reviewData.comment : "",
        comment_en: isTurkish ? "" : reviewData.comment,
      };

      await submitTestimonial(payload);
      toast.success(bilingualKey("contactModal.reviewSuccess"));
      setReviewData({
        name: "",
        email: "",
        rating: 5,
        comment: "",
      });
      handleClose();
    } catch (error) {
      toast.error(bilingualKey("contactModal.reviewErrorSending"));
      console.error(error);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <FaEnvelope className="text-secondary" />
          <span className="font-semibold">{t("contactModal.title")}</span>
        </div>
      }
      centered
      size="md"
      radius="lg"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("message")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              activeTab === "message"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {t("contactModal.messageTab")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              activeTab === "review"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            {t("contactModal.reviewTab")}
          </button>
        </div>

        {activeTab === "message" ? (
          <>
            <TextInput
              label={t("contactModal.yourName")}
              placeholder={t("contactModal.namePlaceholder")}
              required
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              leftSection={<FaUser className="text-gray-400" />}
            />

            <TextInput
              label={t("contactModal.emailAddress")}
              placeholder={t("contactModal.emailPlaceholder")}
              required
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              leftSection={<FaEnvelope className="text-gray-400" />}
            />

            <TextInput
              label={t("contactModal.phoneNumber")}
              placeholder={t("contactModal.phonePlaceholder")}
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              leftSection={<FaPhone className="text-gray-400" />}
            />

            <TextInput
              label={t("contactModal.subject")}
              placeholder={t("contactModal.subjectPlaceholder")}
              value={formData.subject}
              onChange={(e) => handleChange("subject", e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  {t("contactModal.chooseConsultant")}
                </span>
                {selectedConsultant && !consultantId && (
                  <button
                    type="button"
                    onClick={() => setSelectedConsultantId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {t("contactModal.clearSelection")}
                  </button>
                )}
              </div>
              {consultantsLoading ? (
                <p className="mt-2 text-xs text-gray-400">
                  {t("common.loading")}
                </p>
              ) : scopedConsultants.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">
                  {t("contactModal.noConsultants")}
                </p>
              ) : (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {scopedConsultants.map((consultant) => {
                    const isSelected = consultant.id === selectedConsultantId;
                    return (
                      <button
                        key={consultant.id}
                        type="button"
                        onClick={() => setSelectedConsultantId(consultant.id)}
                        className={`flex min-w-[190px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                          <img
                            src={
                              consultant.image ||
                              "https://via.placeholder.com/80?text=Agent"
                            }
                            alt={consultant.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-800">
                            {consultant.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {getLocalizedField(consultant, "title")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedConsultant && (
                <p className="mt-2 text-xs text-gray-600">
                  {t("contactModal.selectedConsultant")}:{" "}
                  <span className="font-semibold text-gray-800">
                    {selectedConsultant.name}
                  </span>
                </p>
              )}
            </div>

            <Textarea
              label={t("contactModal.yourMessage")}
              placeholder={t("contactModal.messagePlaceholder")}
              required
              minRows={4}
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClose}>
                {t("contactModal.cancel")}
              </Button>
              <Button
                color="green"
                onClick={handleSubmit}
                loading={loading}
                leftSection={<FaEnvelope />}
              >
                {t("contactModal.sendMessage")}
              </Button>
            </Group>
          </>
        ) : (
          <>
            <TextInput
              label={t("contactModal.yourName")}
              placeholder={t("contactModal.namePlaceholder")}
              required
              value={reviewData.name}
              onChange={(e) =>
                setReviewData({ ...reviewData, name: e.target.value })
              }
              leftSection={<FaUser className="text-gray-400" />}
            />

            <TextInput
              label={t("contactModal.emailAddress")}
              placeholder={t("contactModal.emailPlaceholder")}
              required
              type="email"
              value={reviewData.email}
              onChange={(e) =>
                setReviewData({ ...reviewData, email: e.target.value })
              }
              leftSection={<FaEnvelope className="text-gray-400" />}
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {t("contactModal.ratingLabel")}
              </label>
              <Rating
                value={reviewData.rating}
                onChange={(value) =>
                  setReviewData({ ...reviewData, rating: value })
                }
                size="lg"
              />
            </div>

            <Textarea
              label={t("contactModal.reviewComment")}
              placeholder={t("contactModal.reviewPlaceholder")}
              required
              minRows={4}
              value={reviewData.comment}
              onChange={(e) =>
                setReviewData({ ...reviewData, comment: e.target.value })
              }
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClose}>
                {t("contactModal.cancel")}
              </Button>
              <Button
                color="green"
                onClick={handleReviewSubmit}
                loading={reviewLoading}
                leftSection={<FaEnvelope />}
              >
                {t("contactModal.submitReview")}
              </Button>
            </Group>
          </>
        )}
      </div>
    </Modal>
  );
};

ContactModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  propertyId: PropTypes.string,
  propertyTitle: PropTypes.string,
  listingNo: PropTypes.string,
  userEmail: PropTypes.string,
  consultantId: PropTypes.string,
};

export default ContactModal;
