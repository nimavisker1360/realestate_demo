import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useConsultants from "../hooks/useConsultants";
import { MdEmail } from "react-icons/md";
import { Loader } from "@mantine/core";
import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import iconAudience from "../assets/p.png";
import iconProspects from "../assets/p03.png";
import iconOpportunity from "../assets/p04.png";
import ContactModal from "./ContactModal";

// Animated element with IntersectionObserver
const AnimatedElement = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0 blur-0' 
          : 'opacity-0 translate-y-6 blur-sm'
      } ${className}`}
    >
      {children}
    </div>
  );
};

AnimatedElement.propTypes = {
  children: PropTypes.node.isRequired,
  delay: PropTypes.number,
  className: PropTypes.string,
};

// Helper function to get localized field
const getLocalizedField = (consultant, field, language) => {
  const localizedKey = `${field}_${language}`;
  return consultant[localizedKey] || consultant[field] || "";
};

const normalizeText = (value) =>
  value?.toString().toLowerCase().replace(/\s+/g, " ").trim() || "";

const splitTitle = (value) =>
  value?.toString().split("|").map((part) => part.trim()).filter(Boolean) || [];

const renderTitle = (value) => {
  const parts = splitTitle(value);
  if (parts.length <= 1) return value;
  return parts.map((part, index) => (
    <span key={`${part}-${index}`} className="block sm:inline">
      {part}
      {index < parts.length - 1 && (
        <span className="hidden sm:inline">{" | "}</span>
      )}
    </span>
  ));
};

const ConsultantsSection = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "tr" ? "tr" : "en";
  const yearSuffix = currentLang === "tr" ? "yıl" : "years";
  const formatExperience = (value) => {
    const raw = value?.toString().trim();
    if (!raw) return `0 ${yearSuffix}`;
    if (/\b(years?|yıl)\b/i.test(raw)) return raw;
    return `${raw} ${yearSuffix}`;
  };
  const { data: consultants, isLoading, isError } = useConsultants();
  const navigate = useNavigate();
  const location = useLocation();
  const isContactRoute = location.pathname === "/contact";

  if (isLoading) {
    return (
      <section className="max-padd-container py-16">
        <div className="flexCenter h-40">
          <Loader color="green" />
        </div>
      </section>
    );
  }

  if (isError || !consultants || !Array.isArray(consultants) || consultants.length === 0) {
    return null;
  }

  // Show max 2 consultants on homepage, rest in "+X more"
  const displayConsultants = Array.isArray(consultants) ? consultants.slice(0, 2) : [];
  const moreCount = Array.isArray(consultants) ? consultants.length - 2 : 0;

  // Get the 3rd consultant image for the blur effect
  const thirdConsultant = consultants[2];

  return (
    <section className="max-padd-container py-16 xl:py-20 overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        {/* Left Side - Text (Transparent/Simple) */}
        <AnimatedElement delay={0} className="lg:w-[400px] flex-shrink-0">
          <div className="mb-2">
            <span className="text-red-500 font-semibold">demo</span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight mb-3 whitespace-pre-line">
            {t("consultantsSection.findExpert")}
          </h2>

          <p className="text-gray-600 mb-8">
            {t("consultantsSection.matchedAgents", {
              count: consultants.length,
            })}
          </p>

          <button
            onClick={() => navigate("/contact")}
            className="inline-flex items-center gap-3 rounded-[10px] bg-[#00A86B] px-8 py-3 text-white shadow-lg shadow-[#00A86B]/30 transition hover:bg-[#009A61]"
          >
            <MdEmail className="text-xl" />
            <span className="font-semibold">{t("contactModal.sendMessage")}</span>
          </button>
        </AnimatedElement>

        {/* Right Side - Agent Cards */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <div className="flex gap-6 items-start">
            {displayConsultants.map((consultant, index) => {
              const titleText = getLocalizedField(consultant, "title", currentLang);
              const specialtyText = getLocalizedField(consultant, "specialty", currentLang);
              const showSpecialty =
                specialtyText && normalizeText(specialtyText) !== normalizeText(titleText);

              return (
                <AnimatedElement key={consultant.id} delay={200 + index * 150}>
                  <div
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => navigate("/consultants")}
                  >
                    {/* Circular Avatar */}
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 group-hover:shadow-xl transition-shadow">
                      <img
                        src={
                          consultant.image ||
                          "https://via.placeholder.com/150?text=Agent"
                        }
                        alt={consultant.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Name */}
                    <h3 className="font-bold text-gray-900 text-center text-lg">
                      {consultant.name}
                    </h3>

                    {/* Company/Title */}
                    <p className="text-gray-500 text-sm text-center leading-snug">
                      {renderTitle(titleText)}
                    </p>

                    {/* License/Specialty */}
                    {showSpecialty && (
                      <p className="text-gray-400 text-xs text-center mb-4">
                        {specialtyText}
                      </p>
                    )}

                    {/* Stats Row */}
                    <div className="flex gap-6 justify-center">
                      <div className="text-center">
                        <p className="font-bold text-gray-900">
                          {formatExperience(consultant.experience)}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {t("consultants.experience")}
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedElement>
              );
            })}

            {/* More Agents Card */}
            {moreCount > 0 && (
              <AnimatedElement delay={500}>
                <div
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => navigate("/consultants")}
                >
                  {/* Blurred Avatar with +X overlay */}
                  <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4">
                    <img
                      src={
                        thirdConsultant?.image ||
                        "https://via.placeholder.com/150?text=Agent"
                      }
                      alt="More agents"
                      className="w-full h-full object-cover blur-sm"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-white/60 flexCenter flex-col">
                      <span className="text-3xl font-bold text-secondary">
                        +{moreCount}
                      </span>
                    </div>
                  </div>

                  {/* Text */}
                  <p className="font-bold text-gray-900 text-center text-lg">
                    {t("consultantsSection.moreAgents")}
                  </p>
                </div>
              </AnimatedElement>
            )}
          </div>
        </div>
      </div>

      {/* Listings Lease or Sell Faster Section */}
      <AnimatedElement delay={100} className="mt-16">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1422] via-[#18263a] to-[#20334a] shadow-2xl ring-1 ring-white/10">
          <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl"></div>
          <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl"></div>
          <div className="flex flex-col lg:flex-row">
            {/* Left Content */}
            <div className="flex-1 p-8 lg:p-12 xl:p-14">
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-8 max-w-xl">
                {t("consultantsSection.listingsFaster")}
              </h2>

              {/* Features Grid */}
              <div className="grid grid-cols-1 gap-4 mb-8 max-w-2xl">
                {/* Right Audience */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10 min-h-[190px]">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <img
                      src={iconAudience}
                      alt={t("consultantsSection.rightAudience")}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-2">
                    {t("consultantsSection.rightAudience")}
                  </h3>
                  <p className="text-white/65 text-sm leading-relaxed">
                    {t("consultantsSection.rightAudienceDesc")}
                  </p>
                </div>

                {/* Engage Prospects */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10 min-h-[190px]">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <img
                      src={iconProspects}
                      alt={t("consultantsSection.engageProspects")}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-2">
                    {t("consultantsSection.engageProspects")}
                  </h3>
                  <p className="text-white/65 text-sm leading-relaxed">
                    {t("consultantsSection.engageProspectsDesc")}
                  </p>
                </div>

                {/* More Opportunity */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:bg-white/10 min-h-[190px]">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <img
                      src={iconOpportunity}
                      alt={t("consultantsSection.moreOpportunity")}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <h3 className="text-white font-semibold mb-2">
                    {t("consultantsSection.moreOpportunity")}
                  </h3>
                  <p className="text-white/65 text-sm leading-relaxed">
                    {t("consultantsSection.moreOpportunityDesc")}
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate("/listing")}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 mb-6"
              >
                {t("consultantsSection.exploreMarketing")}
              </button>

              {/* Disclaimer */}
              <p className="text-white/40 text-xs leading-relaxed">
                {t("consultantsSection.disclaimer")}
              </p>
            </div>

            {/* Right Image */}
            <div className="relative lg:w-[45%] h-[280px] sm:h-[320px] lg:h-auto">
              <img
                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60"
                alt="Modern building at night"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0c1422]/10 to-[#0c1422]/80"></div>
            </div>
          </div>
        </div>
      </AnimatedElement>
      <ContactModal
        opened={isContactRoute}
        onClose={() => navigate("/", { replace: true })}
      />
    </section>
  );
};

export default ConsultantsSection;
