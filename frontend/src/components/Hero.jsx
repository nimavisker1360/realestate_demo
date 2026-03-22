import { useState } from "react";
import { useTranslation } from "react-i18next";
import heroBg from "../assets/img1.png";
import heroCyprus from "../assets/hero/Cyprus.jpg";
import heroDubai from "../assets/hero/Dubai.jpg";
import heroGeorgia from "../assets/hero/Georgia.jpg";
import heroGreece from "../assets/hero/greece.jpg";
import heroIstanbul from "../assets/hero/Istanbul.jpg";
import iconIstanbul from "../assets/icons/istanbul.png";
import iconGreece from "../assets/icons/Greece.png";
import iconDubai from "../assets/icons/dubai.png";
import iconGeorgia from "../assets/icons/boat.png";
import iconCyprus from "../assets/icons/cyprus.png";

const Hero = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("ALL");
  const heroImages = {
    ALL: heroBg,
    ISTANBUL: heroIstanbul,
    GREECE: heroGreece,
    DUBAI: heroDubai,
    GEORGIA: heroGeorgia,
    CYPRUS: heroCyprus,
  };
  const activeHeroImage = heroImages[activeTab] || heroBg;
  const locationTabs = [
    {
      label: "ALL",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 sm:h-9 sm:w-9"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M15 15l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      label: "ISTANBUL",
      icon: (
        <img
          src={iconIstanbul}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
        />
      ),
    },
    {
      label: "GREECE",
      icon: (
        <img
          src={iconGreece}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
        />
      ),
    },
    {
      label: "DUBAI",
      icon: (
        <img
          src={iconDubai}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
        />
      ),
    },
    {
      label: "GEORGIA",
      icon: (
        <img
          src={iconGeorgia}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
        />
      ),
    },
    {
      label: "CYPRUS",
      icon: (
        <img
          src={iconCyprus}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
        />
      ),
    },
  ];

  const handleTabClick = (label) => {
    setActiveTab(label);
  };

  return (
    <section className="relative h-[520px] sm:h-[600px] md:h-[720px] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          key={activeTab}
          src={activeHeroImage}
          alt="city skyline"
          loading="eager"
          decoding="async"
          fetchpriority="high"
          className="w-full h-full object-cover object-center animate-hero-fade hero-bg"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/55 via-[#0f172a]/25 to-[#0f172a]/60" />
      </div>

      {/* Content */}
      <div className="relative max-w-[1100px] mx-auto h-full px-6 sm:px-10 flex flex-col items-center justify-center text-white text-center gap-4">
        <h1 className="text-[36px] sm:text-[48px] md:text-[64px] font-semibold leading-tight italic">
          {t("hero.title")}
        </h1>
        <p className="text-lg sm:text-xl text-white/90 italic">
          {t("hero.subtitle")}
        </p>
      </div>

      {/* Location Tabs */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10">
          <div className="overflow-hidden">
            <div className="flex justify-center">
              <div className="flex w-full sm:inline-flex sm:w-auto flex-nowrap bg-[#8b1c1c] shadow-[0_18px_40px_rgba(120,22,22,0.35)]">
                {locationTabs.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleTabClick(item.label)}
                    className={`flex flex-1 sm:flex-none min-w-0 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-[11px] sm:text-base font-semibold tracking-normal sm:tracking-wide uppercase leading-tight transition
                      ${
                        activeTab === item.label
                          ? "bg-white text-[#8b1c1c]"
                          : "text-white hover:bg-white/10"
                      } ${index === locationTabs.length - 1 ? "" : "border-r border-white/10"}`}
                    aria-current={activeTab === item.label ? "true" : "false"}
                  >
                    <span
                      className={`${
                        activeTab === item.label
                          ? "text-[#8b1c1c]"
                          : "text-white"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="w-full truncate text-center sm:w-auto sm:text-left">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
