import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FOOTER_CONTACT_INFO, SOCIALS } from "../constant/data";
import PropTypes from "prop-types";
import { MdLocationOn, MdPhone, MdEmail } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import {
  buildEmailHref,
  normalizeWhatsAppNumber,
} from "../utils/common";
import PhoneLink from "./PhoneLink";

const Footer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Footer links with translations
  const footerLinks = [
    {
      title: t('footer.learnMore'),
      links: [
        { key: "aboutUs", label: t('footer.aboutUs'), isAbout: true },
        { key: "latestItems", label: t('footer.latestItems') },
        { key: "hotOffers", label: t('footer.hotOffers'), path: "/projects?hotOffers=1" },
      ],
    },
    {
      title: t('footer.ourCommunity'),
      links: [
        { key: "customerReviews", label: t('footer.customerReviews') },
        { key: "addresses", label: t('footer.addresses'), path: "/addresses" },
      ],
    },
  ];

  // Handle navigation to sections
  const handleLinkClick = (link) => {
    if (link.isAbout) {
      if (location.pathname === "/") {
        // Already on home page, just scroll to about section
        const aboutSection = document.getElementById("about");
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        // Navigate to home page first, then scroll to about
        navigate("/");
        setTimeout(() => {
          const aboutSection = document.getElementById("about");
          if (aboutSection) {
            aboutSection.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    }
  };

  // Helper to get icon based on label
  const getIcon = (label) => {
    if (label.toLowerCase().includes("address"))
      return (
        <MdLocationOn className="text-[#06a84e] text-xl flex-shrink-0 mt-0.5" />
      );
    if (
      label.toLowerCase().includes("number") ||
      label.toLowerCase().includes("phone")
    )
      return <MdPhone className="text-[#06a84e] text-xl flex-shrink-0" />;
    if (label.toLowerCase().includes("email"))
      return <MdEmail className="text-[#06a84e] text-xl flex-shrink-0" />;
    return null;
  };

  const whatsappHref = `https://wa.me/${normalizeWhatsAppNumber(
    FOOTER_CONTACT_INFO.links.find((link) =>
      link.label.toLowerCase().includes("number") ||
      link.label.toLowerCase().includes("phone")
    )?.value
  )}`;

  return (
    <footer className="max-padd-container mb-4 overflow-x-hidden">
      {/* Main Footer */}
      <div className="bg-[#1e2a38] rounded-tr-3xl rounded-tl-3xl pt-10 sm:pt-14 xl:pt-16 pb-10 px-6 sm:px-10 lg:px-16">
        {/* Top Section */}
        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-10">
          <div className="max-w-lg">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {t('footer.exploreTitle')}
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              {t('footer.exploreDescription')}
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-start gap-4">
            {SOCIALS.links.map((link) => (
              link.url ? (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#06a84e] transition-colors"
                >
                  {link.icon}
                </a>
              ) : (
                <Link
                  to="/"
                  key={link.id}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-[#06a84e] transition-colors"
                >
                  {link.icon}
                </Link>
              )
            ))}
          </div>
        </div>

        <hr className="border-white/10 mb-10" />

        {/* Bottom Section - Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand & Description */}
          <div>
            <Link to={"/"} className="inline-block mb-4">
              <span className="text-2xl font-black uppercase tracking-[0.28em] text-white">
                demo
              </span>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed">
              {t('footer.visionText')}
            </p>
          </div>

          {/* Footer Links */}
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold mb-5">{col.title}</h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.key}>
                    {link.isAbout ? (
                      <button
                        onClick={() => handleLinkClick(link)}
                        className="text-white/50 text-sm hover:text-[#06a84e] transition-colors cursor-pointer"
                      >
                        {link.label}
                      </button>
                    ) : link.path ? (
                      <Link
                        to={link.path}
                        className="text-white/50 text-sm hover:text-[#06a84e] transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <Link
                        to="/"
                        className="text-white/50 text-sm hover:text-[#06a84e] transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-5">
              {t('footer.contactUs')}
            </h4>
            <ul className="flex flex-col gap-4">
              {FOOTER_CONTACT_INFO.links
                .filter((link) => 
                  link.label.toLowerCase().includes("number") || 
                  link.label.toLowerCase().includes("phone") ||
                  link.label.toLowerCase().includes("email")
                )
                .map((link, index) => {
                  const isPhone =
                    link.label.toLowerCase().includes("number") ||
                    link.label.toLowerCase().includes("phone");

                  const content = (
                    <>
                      {getIcon(link.label)}
                      <div>
                        <p className="text-white/40 text-xs mb-1">
                          {isPhone
                            ? t("contact.contactNumber")
                            : t("contact.emailAddress")}
                        </p>
                        <p className="text-white text-sm">{link.value}</p>
                      </div>
                    </>
                  );

                  return (
                    <li key={index}>
                      <div className="flex flex-col gap-4">
                        {isPhone ? (
                          <PhoneLink
                            phone={link.value}
                            className="flex gap-3 items-start transition-colors hover:text-[#06a84e]"
                          >
                            {content}
                          </PhoneLink>
                        ) : (() => {
                          const emailHref = buildEmailHref(link.value);
                          return emailHref ? (
                            <a
                              href={emailHref}
                              target="_blank"
                              rel="noreferrer"
                              className="flex gap-3 items-start transition-colors hover:text-[#06a84e]"
                            >
                              {content}
                            </a>
                          ) : (
                            <div className="flex gap-3 items-start">{content}</div>
                          );
                        })()}

                        {isPhone && (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noreferrer"
                            className="flex gap-3 items-start transition-colors hover:text-[#06a84e]"
                          >
                            <FaWhatsapp className="text-[#06a84e] text-xl flex-shrink-0" />
                            <div>
                              <p className="text-white/40 text-xs mb-1">
                                {t("contact.whatsapp")}
                              </p>
                              <p className="text-white text-sm">{link.value}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-[#151f2b] py-4 px-6 sm:px-10 rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-2">
        <span className="text-white/50 text-sm">
          {t('footer.copyright')}
        </span>
      </div>
    </footer>
  );
};

export default Footer;

const FooterColumn = ({ title, children }) => {
  return (
    <div className="flex flex-col gap-5">
      <h4 className="font-semibold text-white whitespace-nowrap">{title}</h4>
      {children}
    </div>
  );
};

FooterColumn.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
