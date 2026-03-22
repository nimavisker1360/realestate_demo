import { useState } from "react";
import {
  FaPhone,
  FaWhatsapp,
  FaEnvelope,
  FaStar,
  FaUserTie,
  FaGlobe,
  FaBriefcase,
} from "react-icons/fa6";
import { MdVerified, MdClose } from "react-icons/md";
import { Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import useConsultants from "../hooks/useConsultants";
import ContactModal from "../components/ContactModal";
import { normalizeWhatsAppNumber } from "../utils/common";
import PhoneLink from "../components/PhoneLink";

// Helper function to get localized field
const getLocalizedField = (consultant, field, language) => {
  const localizedKey = `${field}_${language}`;
  return consultant[localizedKey] || consultant[field] || "";
};

const normalizeText = (value) =>
  value?.toString().toLowerCase().replace(/\s+/g, " ").trim() || "";

const Consultants = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "tr" ? "tr" : "en";
  const yearSuffix = currentLang === "tr" ? "yıl" : "years";
  const formatExperience = (value) => {
    const raw = value?.toString().trim();
    if (!raw) return `0 ${yearSuffix}`;
    if (/\b(years?|yıl)\b/i.test(raw)) return raw;
    return `${raw} ${yearSuffix}`;
  };
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { data: consultants, isLoading, isError } = useConsultants();

  // Calculate stats
  const averageRating = consultants?.length 
    ? (consultants.reduce((sum, c) => sum + (c.rating || 0), 0) / consultants.length).toFixed(1) 
    : 0;
  const avgExperience = consultants?.length
    ? Math.round(consultants.reduce((sum, c) => {
        const years = parseInt(c.experience) || 0;
        return sum + years;
      }, 0) / consultants.length)
    : 0;

  if (isLoading) {
    return (
      <section className="max-padd-container mt-0 sm:mt-10 lg:mt-[99px] mb-[99px] flexCenter min-h-[50vh]">
        <div className="text-center">
          <Loader color="green" size="lg" />
          <p className="text-gray-30 mt-4">Loading consultants...</p>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="max-padd-container mt-0 sm:mt-10 lg:mt-[99px] mb-[99px] flexCenter min-h-[50vh]">
        <div className="text-center">
          <p className="text-red-500">Error loading consultants.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-padd-container mt-0 sm:mt-10 lg:mt-[99px] mb-[99px] overflow-x-hidden">
      {/* Top Banner */}
      <div className="mb-10 sm:mb-14">
        <img
          src="/banner.jpg"
          alt="Consultants banner"
          className="block w-full h-auto"
        />
      </div>

      {/* Header Section */}
      <div className="text-center mb-16">
        <span className="medium-18">{t("consultants.subtitle")}</span>
        <h1 className="h2">{t("consultants.title")}</h1>
        <p className="text-gray-30 max-w-2xl mx-auto">
          {currentLang === "tr" 
            ? "Deneyimli gayrimenkul uzmanlarımızdan oluşan ekibimiz, mülk yolculuğunuzun her adımında size rehberlik etmek için burada."
            : "Our team of experienced real estate professionals is here to guide you through every step of your property journey."
          }
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-16 max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="w-12 h-12 bg-secondary rounded-xl flexCenter flex-shrink-0">
            <FaUserTie className="text-white text-xl" />
          </div>
          <div>
            <h3 className="bold-20 text-tertiary">{consultants?.length || 0}+</h3>
            <p className="text-gray-30 text-xs sm:text-sm">
              {currentLang === "tr" ? "Uzman Danışman" : "Expert Advisors"}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="w-12 h-12 bg-secondary rounded-xl flexCenter flex-shrink-0">
            <FaStar className="text-white text-xl" />
          </div>
          <div>
            <h3 className="bold-20 text-tertiary">{averageRating}</h3>
            <p className="text-gray-30 text-xs sm:text-sm">
              {currentLang === "tr" ? "Ortalama Puan" : "Average Rating"}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="w-12 h-12 bg-secondary rounded-xl flexCenter flex-shrink-0">
            <FaBriefcase className="text-white text-xl" />
          </div>
          <div>
            <h3 className="bold-20 text-tertiary">
              {formatExperience(`${avgExperience}+`)}
            </h3>
            <p className="text-gray-30 text-xs sm:text-sm">
              {currentLang === "tr" ? "Yıllık Deneyim" : "Years Experience"}
            </p>
          </div>
        </div>
      </div>

      {/* Consultants Grid */}
      <div className="bg-primary rounded-3xl p-6 sm:p-10 lg:p-14">
        {!consultants || consultants.length === 0 ? (
          <div className="text-center py-12">
            <FaUserTie className="text-gray-300 text-6xl mx-auto mb-4" />
            <p className="text-gray-30">No consultants registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consultants.map((consultant) => (
              <div
                key={consultant.id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedConsultant(consultant)}
              >
                {(() => {
                  const titleText = getLocalizedField(consultant, "title", currentLang);
                  const specialtyText = getLocalizedField(consultant, "specialty", currentLang);
                  const showSpecialty =
                    specialtyText && normalizeText(specialtyText) !== normalizeText(titleText);

                  return (
                    <>
                {/* Image */}
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={consultant.image || "https://via.placeholder.com/400x400?text=No+Image"}
                    alt={consultant.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  
                  {/* Availability Badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        consultant.available
                          ? "bg-secondary text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          consultant.available ? "bg-white animate-pulse" : "bg-gray-300"
                        }`}
                      ></span>
                      {consultant.available ? t("consultants.available") : t("consultants.busy")}
                    </span>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-4 right-4">
                    <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-full shadow-sm">
                      <FaStar className="text-amber-500 text-sm" />
                      <span className="font-bold text-sm text-tertiary">{consultant.rating}</span>
                    </div>
                  </div>

                  {/* Name on Image */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="bold-18 text-white flex items-center gap-2">
                      {consultant.name}
                      <MdVerified className="text-secondary" />
                    </h3>
                    <p className="text-secondary text-sm font-medium line-clamp-2 min-h-[2.5rem]">
                      {titleText}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Specialty */}
                  {showSpecialty && (
                    <p className="text-gray-30 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                      {specialtyText}
                    </p>
                  )}

                  {/* Languages */}
                  <div className="flex items-center gap-2 mb-4">
                    <FaGlobe className="text-secondary text-sm" />
                    <span className="text-sm text-gray-50 font-medium">
                      {consultant.languages?.join(" • ") || "No languages specified"}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-5 py-3 px-4 bg-primary rounded-xl">
                    <div className="text-center">
                      <p className="font-bold text-tertiary">
                        {formatExperience(consultant.experience)}
                      </p>
                      <p className="text-xs text-gray-30">{t("consultants.experience")}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="text-center">
                      <p className="font-bold text-tertiary">{consultant.reviews || 0}</p>
                      <p className="text-xs text-gray-30">{t("consultants.reviews")}</p>
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  <div className="space-y-2">
                    <PhoneLink
                      phone={consultant.phone}
                      onClick={(e) => e.stopPropagation()}
                      className="flexCenter gap-2 bg-tertiary text-white py-3 rounded-xl font-medium w-full select-text"
                    >
                      <FaPhone />
                      <span dir="ltr">{consultant.phone}</span>
                    </PhoneLink>
                    <a
                      href={`https://wa.me/${normalizeWhatsAppNumber(consultant.whatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flexCenter gap-2 bg-[#25D366] text-white py-3 rounded-xl hover:bg-[#20bd5a] transition-colors font-medium w-full"
                    >
                      <FaWhatsapp />
                      WhatsApp
                    </a>
                  </div>
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mt-16 bg-tertiary rounded-3xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Left Content */}
          <div className="flex-1 p-8 sm:p-12 lg:p-16">
            <span className="medium-18 text-secondary">
              {currentLang === "tr" ? "Seçim Yapmakta Zorlanıyor musunuz?" : "Need Help Choosing?"}
            </span>
            <h2 className="h2 text-white !mb-4">
              {currentLang === "tr" ? "Mükemmel Danışmanla Eşleşin" : "Get Matched With The Perfect Advisor"}
            </h2>
            <p className="text-white/60 mb-8 max-w-md">
              {currentLang === "tr" 
                ? "Mülk ihtiyaçlarınızı bize anlatın, gereksinimlerinize göre ideal danışmanla sizi eşleştirelim."
                : "Tell us about your property needs and we'll connect you with the ideal consultant based on your requirements."
              }
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setContactModalOpen(true)}
                className="btn-secondary !bg-secondary !ring-secondary"
              >
                {currentLang === "tr" ? "Geri Arama İste" : "Request Callback"}
              </button>
              <a 
                href={`https://wa.me/${normalizeWhatsAppNumber("+90 555 123 45 67")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white font-medium px-7 py-[10px] rounded-lg hover:bg-[#20bd5a] transition-colors"
              >
                <FaWhatsapp className="text-lg" />
                {currentLang === "tr" ? "WhatsApp'ta Yazışın" : "Chat on WhatsApp"}
              </a>
            </div>
          </div>
          
          {/* Right Side - Contact Info */}
          <div className="lg:w-80 bg-white/5 p-8 sm:p-12 flex flex-col justify-center">
            <h4 className="text-white font-semibold mb-6">
              {currentLang === "tr" ? "Hızlı İletişim" : "Quick Contact"}
            </h4>
            <div className="space-y-4">
              <PhoneLink
                phone={consultants?.[0]?.phone}
                className="flex items-center gap-3 text-white/70 transition-colors hover:text-white"
              >
                <div className="w-10 h-10 bg-white/10 rounded-lg flexCenter">
                  <FaPhone className="text-secondary" />
                </div>
                <span dir="ltr">{consultants?.[0]?.phone}</span>
              </PhoneLink>
              <button 
                onClick={() => setContactModalOpen(true)}
                className="flex items-center gap-3 text-white/70 hover:text-white transition-colors cursor-pointer w-full text-left"
              >
                <div className="w-10 h-10 bg-white/10 rounded-lg flexCenter">
                  <FaEnvelope className="text-secondary" />
                </div>
                <span>{currentLang === "tr" ? "Mesaj Gönder" : "Send Message"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Consultant Detail Modal */}
      {selectedConsultant && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flexCenter p-4"
          onClick={() => setSelectedConsultant(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedConsultant(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flexCenter text-white/70 hover:bg-white/20 hover:text-white transition-all z-10"
            >
              <MdClose className="text-xl" />
            </button>

            {/* Profile Section */}
            <div className="pt-8 pb-6 px-6 text-center relative">
              {/* Avatar with glow effect */}
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-secondary/30 rounded-full blur-xl scale-110"></div>
                <img
                  src={selectedConsultant.image || "https://via.placeholder.com/150?text=No+Image"}
                  alt={selectedConsultant.name}
                  className="relative w-28 h-28 rounded-full object-cover border-4 border-secondary/50 shadow-xl"
                />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-secondary rounded-full flexCenter shadow-lg">
                  <MdVerified className="text-white text-sm" />
                </div>
              </div>

              {/* Name & Title */}
              <h2 className="text-2xl font-bold text-white mb-1">
                {selectedConsultant.name}
              </h2>
              <p className="text-secondary font-medium mb-3">
                {getLocalizedField(selectedConsultant, "title", currentLang)}
              </p>

              {/* Rating Badge */}
              <div className="inline-flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-full">
                <FaStar className="text-amber-400" />
                <span className="font-bold text-amber-400">{selectedConsultant.rating}</span>
                <span className="text-white/50 text-sm">{t("consultants.rating")}</span>
              </div>
            </div>

            {/* Bio Section */}
            <div className="px-6 pb-4">
              <p className="text-white/70 text-sm leading-relaxed text-left">
                {getLocalizedField(selectedConsultant, "bio", currentLang)}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
                <p className="text-2xl font-bold text-white">
                  {formatExperience(selectedConsultant.experience)}
                </p>
                <p className="text-xs text-white/50 uppercase tracking-wider">{t("consultants.experience")}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
                <p className="text-2xl font-bold text-white">{selectedConsultant.reviews || 0}</p>
                <p className="text-xs text-white/50 uppercase tracking-wider">{t("consultants.reviews")}</p>
              </div>
            </div>

            {/* Specialty & Languages */}
            <div className="px-6 pb-6 space-y-4">
              {(() => {
                const titleText = getLocalizedField(selectedConsultant, "title", currentLang);
                const specialtyText = getLocalizedField(selectedConsultant, "specialty", currentLang);
                const showSpecialty =
                  specialtyText && normalizeText(specialtyText) !== normalizeText(titleText);
                if (!showSpecialty) return null;
                return (
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <h4 className="text-xs text-white/50 uppercase tracking-wider mb-2">{t("consultants.specialty")}</h4>
                    <p className="text-white/90 text-sm">{specialtyText}</p>
                  </div>
                );
              })()}

              {selectedConsultant.languages?.length > 0 && (
                <div>
                  <h4 className="text-xs text-white/50 uppercase tracking-wider mb-3">{t("consultants.languages")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedConsultant.languages.map((lang) => (
                      <span
                        key={lang}
                        className="bg-secondary/20 text-secondary px-4 py-1.5 rounded-full text-sm font-medium border border-secondary/30"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Buttons */}
            <div className="p-6 pt-0 space-y-3">
              <PhoneLink
                phone={selectedConsultant.phone}
                className="flex items-center justify-center gap-2 bg-white text-slate-900 py-4 rounded-2xl font-semibold shadow-lg w-full select-text"
              >
                <FaPhone />
                <span dir="ltr">{selectedConsultant.phone}</span>
              </PhoneLink>
              <a
                href={`https://wa.me/${normalizeWhatsAppNumber(selectedConsultant.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 rounded-2xl hover:bg-[#20bd5a] transition-all font-semibold shadow-lg w-full"
              >
                <FaWhatsapp className="text-lg" />
                <span>WhatsApp</span>
              </a>
              <button
                onClick={() => {
                  setSelectedConsultant(null);
                  setContactModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-secondary/80 to-secondary text-white py-4 rounded-2xl hover:from-secondary hover:to-secondary/80 transition-all font-semibold shadow-lg w-full cursor-pointer"
              >
                <FaEnvelope />
                <span>{currentLang === "tr" ? "Mesaj Gönder" : "Send Message"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      <ContactModal
        opened={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </section>
  );
};

export default Consultants;
