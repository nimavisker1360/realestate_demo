import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "./Navbar";
import { MdArrowBack, MdClose, MdMenu, MdSearch } from "react-icons/md";
import { FaHandshake, FaWhatsapp } from "react-icons/fa";
import userIcon from "../assets/user.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import ProfileMenu from "./ProfileMenu";
import LoginModal from "./LoginModal";
import ContactModal from "./ContactModal";
import ProfileModal from "./ProfileModal";
import LanguageSwitcher from "./LanguageSwitcher";
import SearchOverlay from "./SearchOverlay";
import { normalizeWhatsAppNumber } from "../utils/common";
import { PRIMARY_CONTACT_PHONE } from "../constant/data";
import CurrencyContext from "../context/CurrencyContext";

const Header = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const headerRef = useRef(null);
  const { currencies, selectedCurrency, setSelectedCurrency } =
    useContext(CurrencyContext);
  const location = useLocation();
  const navigate = useNavigate();
  const autoLoginTriggeredRef = useRef(false);
  const loginPromptTimerRef = useRef(null);
  const authStateRef = useRef(false);
  const authLoadingRef = useRef(true);
  const authRedirectInProgressRef = useRef(false);
  const toggleMenu = () => setMenuOpened(!menuOpened);
  const { isAuthenticated, user, logout, isLoading } = useAuth0();
  const prevAuthRef = useRef(isAuthenticated);

  const handleLoginClick = () => {
    setLoginModalOpen(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        // Close the menu if open when scrolling occurs
        if (menuOpened) {
          setMenuOpened(false);
        }
      }
      // detect scroll
      setActive(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    // clean up the event listener when component unmounts
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [menuOpened]); // Dependency array ensures that the effect runs when menuOpened changes

  useEffect(() => {
    if (!menuOpened) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [menuOpened]);

  authStateRef.current = isAuthenticated;
  authLoadingRef.current = isLoading;
  const searchParams = new URLSearchParams(location.search || "");
  const isAuthRedirectInProgress =
    (searchParams.has("code") && searchParams.has("state")) ||
    searchParams.has("error") ||
    searchParams.has("error_description");
  authRedirectInProgressRef.current = isAuthRedirectInProgress;

  const scheduleLoginPrompt = useCallback((delayMs = 180) => {
    if (loginPromptTimerRef.current) return;
    loginPromptTimerRef.current = setTimeout(() => {
      loginPromptTimerRef.current = null;
      if (authRedirectInProgressRef.current) return;
      if (authLoadingRef.current || authStateRef.current) return;
      const suppressedUntil = Number(
        window.sessionStorage.getItem("suppress_auto_login_prompt_until") || 0
      );
      if (Number.isFinite(suppressedUntil) && suppressedUntil > Date.now()) {
        return;
      }
      autoLoginTriggeredRef.current = true;
      setLoginModalOpen(true);
    }, delayMs);
  }, []);

  useEffect(() => {
    if (autoLoginTriggeredRef.current) return;
    if (isLoading) return;
    if (isAuthRedirectInProgress) return;
    if (!isAuthenticated) {
      scheduleLoginPrompt();
      return;
    }
    autoLoginTriggeredRef.current = true;
  }, [isAuthenticated, isLoading, isAuthRedirectInProgress, scheduleLoginPrompt]);

  useEffect(() => {
    if (isLoading) return;
    const wasAuthenticated = prevAuthRef.current;
    if (wasAuthenticated && !isAuthenticated) {
      scheduleLoginPrompt(60 * 1000);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, isLoading, scheduleLoginPrompt]);

  useEffect(() => {
    if (!isAuthRedirectInProgress) return;
    if (loginPromptTimerRef.current) {
      clearTimeout(loginPromptTimerRef.current);
      loginPromptTimerRef.current = null;
    }
  }, [isAuthRedirectInProgress]);

  useEffect(() => {
    if (isLoading || !isAuthRedirectInProgress) return;

    const params = new URLSearchParams(location.search || "");
    let changed = false;
    ["code", "state", "error", "error_description"].forEach((key) => {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    });
    if (!changed) return;

    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
        hash: location.hash || "",
      },
      { replace: true }
    );
  }, [
    isLoading,
    isAuthRedirectInProgress,
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (loginPromptTimerRef.current) {
      clearTimeout(loginPromptTimerRef.current);
      loginPromptTimerRef.current = null;
    }
    if (loginModalOpen) {
      setLoginModalOpen(false);
    }
  }, [isAuthenticated, loginModalOpen]);

  useEffect(() => {
    return () => {
      if (loginPromptTimerRef.current) {
        clearTimeout(loginPromptTimerRef.current);
        loginPromptTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const updateHeaderHeight = () => {
      const rect = headerEl.getBoundingClientRect();
      const height = Math.ceil(rect.height);
      document.documentElement.style.setProperty(
        "--header-height",
        `${height}px`
      );
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(headerEl);
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={`relative w-full left-0 right-0 z-40 bg-white ${
        active ? "shadow-md" : "shadow-none"
      }`}
    >
      {/* Top Bar */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <Link to={"/"} className="group flex items-center gap-x-2">
              <div className="flex items-center">
                <div className="w-1.5 h-8 sm:h-9 rounded-full bg-gradient-to-b from-red-500 to-red-700 mr-2.5 group-hover:scale-y-110 transition-transform" />
                <div className="flex flex-col leading-none">
                  <span className="text-2xl sm:text-3xl font-extrabold uppercase tracking-[0.22em] bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Demo
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-medium uppercase tracking-[0.35em] text-slate-400 mt-0.5">
                    Real Estate
                  </span>
                </div>
              </div>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigate("/contact")}
                className="hidden md:inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-secondary/90"
                type="button"
              >
                <FaHandshake className="text-sm" />
                {t("header.partner")}
              </button>
              <div className="hidden sm:flex items-center gap-2 border border-secondaryRed/80 px-3 py-1 text-sm text-gray-800">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => setSelectedCurrency(currency.code)}
                    className={`text-sm font-semibold transition ${
                      selectedCurrency === currency.code
                        ? "text-secondaryRed"
                        : "text-gray-800 hover:text-secondaryRed"
                    }`}
                    aria-pressed={selectedCurrency === currency.code}
                    type="button"
                  >
                    {currency.symbol}
                  </button>
                ))}
              </div>
              <LanguageSwitcher />
              <button
                className="flex h-8 w-8 items-center justify-center text-gray-700 transition hover:text-secondaryRed"
                aria-label={t("common.search")}
                type="button"
                onClick={() => setSearchOverlayOpen(true)}
              >
                <MdSearch size={20} />
              </button>
              <a
                href={`https://wa.me/${normalizeWhatsAppNumber(PRIMARY_CONTACT_PHONE)}`}
                target="_blank"
                rel="noreferrer"
                className="animate-whatsapp-ring flex h-9 w-9 items-center justify-center rounded-full border-2 border-emerald-500 text-emerald-500 transition hover:bg-emerald-50"
                aria-label="WhatsApp"
                data-whatsapp-url="true"
              >
                <FaWhatsapp size={18} />
              </a>
              {/* Desktop Only - Profile/Login */}
              <div className="hidden lg:flex items-center">
                {isLoading ? (
                  <span className="medium-16">{t("common.loading")}</span>
                ) : !isAuthenticated ? (
                  <button
                    onClick={handleLoginClick}
                    className={
                      "btn-secondary flexCenter gap-x-2 medium-16 rounded-[10px] !bg-[#00A86B] !ring-[#00A86B] hover:!bg-[#009A61]"
                    }
                  >
                    <img
                      src={userIcon}
                      alt=""
                      aria-hidden="true"
                      height={22}
                      width={22}
                    />
                    <span>{t("common.login")}</span>
                  </button>
                ) : (
                  <ProfileMenu user={user} logout={logout} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Row */}
      <div>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1">
              {/* Desktop Navbar */}
              <Navbar
                containerStyles="hidden lg:flex items-center gap-6 text-[13px] font-semibold"
                onContactClick={() => setContactModalOpen(true)}
                closeMenu={() => {}}
                currencies={currencies}
                selectedCurrency={selectedCurrency}
                onCurrencySelect={setSelectedCurrency}
              />
            </div>

            <div className="flex items-center gap-3">
              {!menuOpened ? (
                <MdMenu
                  className="lg:hidden cursor-pointer text-3xl hover:text-secondary"
                  onClick={toggleMenu}
                />
              ) : (
                <MdClose
                  className="lg:hidden cursor-pointer text-3xl hover:text-secondary"
                  onClick={toggleMenu}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-white transition-transform duration-300 ease-out lg:hidden ${
          menuOpened ? "translate-x-0" : "-translate-x-full"
        } ${menuOpened ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!menuOpened}
      >
        <div className="flex h-16 items-center justify-end border-b border-gray-200 px-5">
          <button
            type="button"
            onClick={toggleMenu}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 transition hover:text-secondaryRed"
          >
            <MdArrowBack size={20} />
            <span>{t("common.back")}</span>
          </button>
        </div>
        <div className="h-[calc(100dvh-4rem)] overflow-y-auto px-2 pb-6">
          <Navbar
            containerStyles="flex w-full flex-col"
            onContactClick={() => {
              setMenuOpened(false);
              setContactModalOpen(true);
            }}
            closeMenu={() => setMenuOpened(false)}
            isMobile={true}
            isAuthenticated={isAuthenticated}
            user={user}
            logout={logout}
            isLoading={isLoading}
            onLoginClick={() => {
              setMenuOpened(false);
              handleLoginClick();
            }}
            onProfileClick={() => {
              setMenuOpened(false);
              setProfileModalOpen(true);
            }}
            currencies={currencies}
            selectedCurrency={selectedCurrency}
            onCurrencySelect={setSelectedCurrency}
          />
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      {/* Contact Modal */}
      <ContactModal
        opened={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />

      {/* Profile Modal */}
      <ProfileModal
        opened={profileModalOpen}
        setOpened={setProfileModalOpen}
      />

      {searchOverlayOpen && (
        <SearchOverlay
          isOpen={searchOverlayOpen}
          onClose={() => setSearchOverlayOpen(false)}
        />
      )}

    </header>
  );
};

export default Header;
