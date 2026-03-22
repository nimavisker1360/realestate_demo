import { NavLink, useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
// icons
import {
  MdHomeWork,
  MdSell,
  MdKeyboardArrowDown,
  MdKeyboardArrowRight,
  MdBusiness,
  MdLocationCity,
  MdPublic,
  MdLogout,
  MdFavorite,
  MdBookmarks,
  MdPerson,
} from "react-icons/md";
import { RiCheckboxMultipleBlankFill } from "react-icons/ri";
import { MdPermContactCalendar } from "react-icons/md";
import { MdAddHome } from "react-icons/md";
import { FaLandmark, FaHome, FaBriefcase } from "react-icons/fa";
import { Avatar } from "@mantine/core";
import useAdmin from "../hooks/useAdmin";
import useAuthCheck from "../hooks/useAuthCheck";
import useBlogs from "../hooks/useBlogs";
import userIcon from "../assets/user.svg";
import { aboutTurkeyMenu } from "../constant/aboutTurkeyMenu";
import { buyerGuideMenu } from "../constant/buyerGuideMenu";
import { resolveBlogIdentifier } from "../utils/seo";

const Navbar = ({ 
  containerStyles, 
  onContactClick, 
  closeMenu,
  isMobile = false,
  isAuthenticated = false,
  user = null,
  logout = null,
  isLoading = false,
  onLoginClick = null,
  onProfileClick = null,
  currencies = [],
  selectedCurrency = null,
  onCurrencySelect = null,
}) => {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAdmin();
  const { validateLogin } = useAuthCheck();
  const { data: blogs, refetch: refetchBlogs } = useBlogs();
  const navigate = useNavigate();
  const location = useLocation();
  const [saleDropdownOpen, setSaleDropdownOpen] = useState(false);
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);
  const [aboutTurkeyDropdownOpen, setAboutTurkeyDropdownOpen] = useState(false);
  const [buyerGuideDropdownOpen, setBuyerGuideDropdownOpen] = useState(false);
  const aboutTurkeyCloseTimer = useRef(null);
  const buyerGuideCloseTimer = useRef(null);
  const isDesktop = !isMobile;
  const desktopItemClass = (isActive = false) =>
    `flex items-center gap-1 px-2 py-1 text-[13px] font-semibold ${
      isActive ? "text-secondaryRed" : "text-gray-800"
    } hover:text-secondary transition-colors`;
  const mobileItemClass = (isActive = false) =>
    `flex items-center justify-between w-full px-4 py-4 border-b border-gray-200 hover:bg-gray-50/30 transition-colors ${
      isActive ? "text-secondaryRed font-semibold" : "text-gray-800"
    }`;
  const linkClass = (isActive = false) =>
    isMobile ? mobileItemClass(isActive) : desktopItemClass(isActive);
  const simpleButtonClass = (isActive = false) =>
    isMobile ? mobileItemClass(isActive) : desktopItemClass(isActive);
  const investmentButtonClass = (isActive = false) =>
    isMobile
      ? `investment-opportunities-pill relative flex w-full items-center justify-between overflow-hidden border-b border-gray-200 px-4 py-4 font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${
          isActive ? "bg-red-700" : "bg-red-600 hover:bg-red-700"
        }`
      : `investment-opportunities-pill relative flex items-center gap-1 overflow-hidden rounded-sm px-3 py-1 text-[13px] font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${
          isActive ? "bg-red-700" : "bg-red-600 hover:bg-red-700"
        }`;

  // Property categories with translations
  const propertyCategories = [
    { value: "residential", label: t("categories.residential"), icon: FaHome },
    {
      value: "commercial",
      label: t("categories.commercial"),
      icon: FaBriefcase,
    },
    { value: "land", label: t("categories.land"), icon: FaLandmark },
  ];

  // Project types with translations
  const projectTypes = [
    {
      value: "local",
      label: t("nav.localProjects"),
      icon: MdLocationCity,
    },
    {
      value: "international",
      label: t("nav.internationalProjects"),
      icon: MdPublic,
    },
  ];

  const menuBlogMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(blogs)) {
      blogs.forEach((blog) => {
        const identifier = resolveBlogIdentifier(blog, { preferSlug: true });
        if (blog?.menuKey && identifier) {
          map.set(blog.menuKey, identifier);
        }
      });
    }
    return map;
  }, [blogs]);

  const findBlogIdByMarker = (list, marker) => {
    if (!marker || !Array.isArray(list)) return null;
    const match = list.find((blog) =>
      [blog?.content, blog?.content_en, blog?.content_tr]
        .filter((content) => typeof content === "string")
        .some((content) => content.includes(marker))
    );
    return resolveBlogIdentifier(match, { preferSlug: true }) || null;
  };

  const getMarketAnalysisBlogId = async (key) => {
    const markers = {
      housingStats: "HOUSING_STATS_CHART",
      foreignSales: "FOREIGN_SALES_CHART",
    };
    const marker = markers[key];
    if (!marker) return null;

    let list = Array.isArray(blogs) ? blogs : null;
    let id = list ? findBlogIdByMarker(list, marker) : null;

    if (!id) {
      try {
        const result = await refetchBlogs();
        list = result?.data || [];
        id = findBlogIdByMarker(list, marker);
      } catch (error) {
        return null;
      }
    }

    return id;
  };

  const findBlogIdByMenuKey = (list, menuKey) => {
    if (!menuKey || !Array.isArray(list)) return null;
    const match = list.find((blog) => blog?.menuKey === menuKey);
    return resolveBlogIdentifier(match, { preferSlug: true }) || null;
  };

  const getMenuBlogId = async (item) => {
    if (item?.blogKey) {
      const statsBlogId = await getMarketAnalysisBlogId(item.blogKey);
      if (statsBlogId) return statsBlogId;
    }

    const menuKey = item?.menuKey || item?.labelKey;
    let list = Array.isArray(blogs) ? blogs : null;
    let id = menuKey ? findBlogIdByMenuKey(list, menuKey) : null;

    if (!id && menuKey) {
      try {
        const result = await refetchBlogs();
        list = result?.data || [];
        id = findBlogIdByMenuKey(list, menuKey);
      } catch (error) {
        // ignore
      }
    }

    return id || null;
  };

  const handleAboutTurkeyItemClick = async (item) => {
    const blogId = await getMenuBlogId(item);
    if (blogId) {
      navigate(`/blog/${blogId}`);
    } else {
      navigate("/blogs");
    }
    setAboutTurkeyDropdownOpen(false);
    closeMenu && closeMenu();
  };

  const handleBuyerGuideItemClick = async (item) => {
    const blogId = await getMenuBlogId(item);
    if (blogId) {
      navigate(`/blog/${blogId}`);
    } else {
      navigate("/blogs");
    }
    setBuyerGuideDropdownOpen(false);
    closeMenu && closeMenu();
  };

  const handleAddPropertyClick = () => {
    if (validateLogin()) {
      closeMenu && closeMenu();
      navigate("/admin");
    }
  };

  // Check if current filter is active
  const searchParams = new URLSearchParams(location.search);
  const currentFilter = searchParams.get("type");
  const currentCategory = searchParams.get("category");
  const currentProjectType = searchParams.get("projectType");
  const normalizedProjectType = String(currentProjectType || "")
    .trim()
    .toLowerCase();
  const activeProjectType =
    normalizedProjectType === "international" ||
    normalizedProjectType === "internationalproject" ||
    normalizedProjectType === "international-project"
      ? "international"
      : "local";
  const isProjectsPage = location.pathname === "/projects";
  const isInvestmentOpportunitiesPage =
    location.pathname === "/investment-opportunities";

  const handleCategoryClick = (type, category) => {
    navigate(`/listing?type=${type}&category=${category}`);
    setSaleDropdownOpen(false);
    setProjectsDropdownOpen(false);
    closeMenu && closeMenu();
  };

  const toggleSaleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSaleDropdownOpen(!saleDropdownOpen);
    setProjectsDropdownOpen(false);
  };

  const toggleProjectsDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectsDropdownOpen(!projectsDropdownOpen);
    setSaleDropdownOpen(false);
  };

  const toggleAboutTurkeyDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAboutTurkeyDropdownOpen((prev) => !prev);
    setSaleDropdownOpen(false);
    setProjectsDropdownOpen(false);
    setBuyerGuideDropdownOpen(false);
  };

  const openAboutTurkeyMenu = () => {
    if (aboutTurkeyCloseTimer.current) {
      clearTimeout(aboutTurkeyCloseTimer.current);
      aboutTurkeyCloseTimer.current = null;
    }
    setAboutTurkeyDropdownOpen(true);
    setBuyerGuideDropdownOpen(false);
  };

  const scheduleCloseAboutTurkeyMenu = () => {
    if (aboutTurkeyCloseTimer.current) {
      clearTimeout(aboutTurkeyCloseTimer.current);
    }
    aboutTurkeyCloseTimer.current = setTimeout(() => {
      setAboutTurkeyDropdownOpen(false);
      aboutTurkeyCloseTimer.current = null;
    }, 180);
  };

  const toggleBuyerGuideDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBuyerGuideDropdownOpen((prev) => !prev);
    setSaleDropdownOpen(false);
    setProjectsDropdownOpen(false);
    setAboutTurkeyDropdownOpen(false);
  };

  const openBuyerGuideMenu = () => {
    if (buyerGuideCloseTimer.current) {
      clearTimeout(buyerGuideCloseTimer.current);
      buyerGuideCloseTimer.current = null;
    }
    setBuyerGuideDropdownOpen(true);
    setAboutTurkeyDropdownOpen(false);
  };

  const scheduleCloseBuyerGuideMenu = () => {
    if (buyerGuideCloseTimer.current) {
      clearTimeout(buyerGuideCloseTimer.current);
    }
    buyerGuideCloseTimer.current = setTimeout(() => {
      setBuyerGuideDropdownOpen(false);
      buyerGuideCloseTimer.current = null;
    }, 180);
  };

  const handleProjectClick = (projectType) => {
    const targetProjectType = projectType === "international" ? "international" : "local";
    navigate(`/projects?projectType=${targetProjectType}`);
    setProjectsDropdownOpen(false);
    closeMenu && closeMenu();
  };

  const handleInvestmentOpportunitiesClick = () => {
    navigate("/investment-opportunities");
    setProjectsDropdownOpen(false);
    closeMenu && closeMenu();
  };

  const handleAboutUsClick = () => {
    if (location.pathname === "/") {
      const aboutSection = document.getElementById("about");
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate("/");
      setTimeout(() => {
        const aboutSection = document.getElementById("about");
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
    closeMenu && closeMenu();
  };

  return (
    <nav
      className={`${containerStyles} flex flex-col lg:flex-row lg:items-center`}
    >
      {/* Mobile Profile/Login Section - At Top */}
      {isMobile && (
        <div className="w-full mb-3 pb-3 border-b border-gray-200">
          {isLoading ? (
            <div className="px-3 py-2 text-gray-500 text-sm">
              {t("common.loading")}
            </div>
          ) : !isAuthenticated ? (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-lg bg-[#00A86B] text-white hover:bg-[#009A61] transition-colors"
            >
              <img
                src={userIcon}
                alt=""
                aria-hidden="true"
                height={20}
                width={20}
                className="brightness-0 invert"
              />
              <span className="font-medium">{t("common.login")}</span>
            </button>
          ) : (
            <div className="space-y-1">
              {/* User Info */}
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar
                  src={user?.picture}
                  alt={user?.name ? `${user.name} profile photo` : "User profile photo"}
                  radius="xl"
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              
              {/* Menu Items */}
              <button
                onClick={onProfileClick}
                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50/50 rounded-lg transition-colors"
              >
                <MdPerson size={18} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {t("profile.myProfile")}
                </span>
              </button>
              
              <NavLink
                to="/favourites"
                onClick={() => closeMenu && closeMenu()}
                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50/50 rounded-lg transition-colors"
              >
                <MdFavorite size={18} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {t("profile.favourites")}
                </span>
              </NavLink>
              
              <NavLink
                to="/bookings"
                onClick={() => closeMenu && closeMenu()}
                className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50/50 rounded-lg transition-colors"
              >
                <MdBookmarks size={18} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {t("profile.bookings")}
                </span>
              </NavLink>
              
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    localStorage.clear();
                    logout && logout();
                    closeMenu && closeMenu();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-red-50/50 rounded-lg transition-colors"
                >
                  <MdLogout size={18} className="text-red-500" />
                  <span className="text-sm text-red-500">
                    {t("profile.logout")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {Array.isArray(currencies) && currencies.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-center gap-3 border border-secondaryRed/80 px-3 py-2 text-base text-gray-800">
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() =>
                      onCurrencySelect && onCurrencySelect(currency.code)
                    }
                    className={`text-base font-semibold transition ${
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
            </div>
          )}
        </div>
      )}

      {/* Home */}
      <NavLink
        to={"/"}
        onClick={() => closeMenu && closeMenu()}
        className={({ isActive }) => linkClass(isActive)}
      >
        <div className="flex items-center gap-3">
          <MdHomeWork
            size={20}
            className={isMobile ? "" : "text-secondaryRed"}
          />
          <span>{t("nav.home")}</span>
        </div>
      </NavLink>

      {/* Listing */}
      <NavLink
        to={"/listing"}
        onClick={() => closeMenu && closeMenu()}
        className={({ isActive }) => linkClass(isActive && !currentFilter)}
      >
        <div className="flex items-center gap-3">
          <RiCheckboxMultipleBlankFill
            size={20}
            className={isMobile ? "" : "lg:hidden"}
          />
          <span>{t("nav.listing")}</span>
        </div>
      </NavLink>

      {/* For Sale with Dropdown */}
      <div
        className="w-full lg:w-auto lg:relative lg:group"
        onMouseEnter={() =>
          window.innerWidth >= 1024 && setSaleDropdownOpen(true)
        }
        onMouseLeave={() =>
          window.innerWidth >= 1024 && setSaleDropdownOpen(false)
        }
      >
        <div
          className={`${linkClass(currentFilter === "sale")} cursor-pointer`}
          onClick={(e) => {
            // On mobile: toggle dropdown
            if (window.innerWidth < 1024) {
              toggleSaleDropdown(e);
            } else {
              // On desktop: navigate
              closeMenu && closeMenu();
              navigate("/listing?type=sale");
            }
          }}
        >
          <div className="flex items-center gap-3 lg:gap-1">
            <MdSell size={20} className={isMobile ? "" : "lg:hidden"} />
            <span>{t("nav.forSale")}</span>
          </div>
          <MdKeyboardArrowDown
            size={20}
            className={`transition-transform duration-300 text-gray-500 ${
              saleDropdownOpen ? "" : "rotate-180"
            }`}
            onClick={(e) => {
              if (window.innerWidth < 1024) {
                toggleSaleDropdown(e);
              }
            }}
          />
        </div>

        {/* Sale Dropdown */}
        <div
          className={`lg:absolute lg:top-full lg:left-0 lg:z-50 bg-white lg:rounded-none lg:min-w-[210px] overflow-hidden transition-all duration-300 ease-out origin-top ${
            saleDropdownOpen
              ? "max-h-[500px] translate-y-0 lg:border lg:border-gray-200 lg:shadow-xl"
              : "max-h-0 -translate-y-2 pointer-events-none lg:border-0 lg:shadow-none"
          }`}
          aria-hidden={!saleDropdownOpen}
        >
          {propertyCategories.map((cat) => {
            const IconComponent = cat.icon;
            const isActive =
              currentFilter === "sale" && currentCategory === cat.value;
            return (
              <div
                key={cat.value}
                onClick={() => handleCategoryClick("sale", cat.value)}
                className={`group flex items-center gap-3 px-8 lg:px-4 py-3 lg:py-2 cursor-pointer transition-colors border-b lg:border-b-0 border-gray-100 last:border-b-0 ${
                  isActive
                    ? "bg-secondary/15 text-secondary font-semibold"
                    : "text-gray-700 hover:bg-[#00A86B] hover:text-white"
                }`}
              >
                <IconComponent
                  size={18}
                  className="text-gray-500 group-hover:text-white"
                />
                <span className="text-sm lg:text-sm font-medium">
                  {cat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {isDesktop ? (
        <div
          className="relative"
          onMouseEnter={() => window.innerWidth >= 1024 && openAboutTurkeyMenu()}
          onMouseLeave={() =>
            window.innerWidth >= 1024 && scheduleCloseAboutTurkeyMenu()
          }
        >
          <button
            type="button"
            className={simpleButtonClass(false)}
            aria-expanded={aboutTurkeyDropdownOpen}
            onClick={(e) => {
              e.preventDefault();
              if (window.innerWidth < 1024) return;
              if (aboutTurkeyDropdownOpen) {
                scheduleCloseAboutTurkeyMenu();
              } else {
                openAboutTurkeyMenu();
              }
            }}
          >
            <span>{t("nav.aboutTurkey")}</span>
            <MdKeyboardArrowDown
              size={16}
              className={`text-gray-500 transition-transform duration-300 ${
                aboutTurkeyDropdownOpen ? "" : "rotate-180"
              }`}
            />
          </button>

          <div
            className={`fixed top-[var(--header-height)] left-1/2 z-50 w-[min(1100px,92vw)] -translate-x-1/2 overflow-x-hidden overflow-y-auto transition-all duration-300 ease-out origin-top ${
              aboutTurkeyDropdownOpen
                ? "max-h-[calc(100vh-var(--header-height)-12px)] translate-y-0 opacity-100"
                : "max-h-0 -translate-y-2 opacity-0 pointer-events-none"
            }`}
            aria-hidden={!aboutTurkeyDropdownOpen}
          >
            <div className="pt-0">
              <div className="rounded-none border border-black/10 bg-[#e7e2d4] p-6 shadow-xl">
              <div className="grid grid-cols-4 gap-8">
                {aboutTurkeyMenu.map((column, index) => (
                  <div
                    key={column.titleKey}
                    className={`min-w-0 ${
                      index === 0 ? "" : "border-l border-black/10 pl-6"
                    }`}
                  >
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-red-500">
                        {t(column.titleKey)}
                      </h4>
                      <MdKeyboardArrowDown
                        size={18}
                        className="text-red-500"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-2 h-0.5 w-10 bg-red-500"></div>
                  </div>
                  <ul className="space-y-3">
                    {column.items.map((item) => {
                      const menuKey = item?.menuKey || item?.labelKey;
                      const isBlogLink =
                        Boolean(item.blogKey) ||
                        (menuKey ? menuBlogMap.has(menuKey) : false);
                      const isSingleLine = Boolean(item.singleLine);
                      return (
                        <li key={item.labelKey}>
                          <button
                            type="button"
                            onClick={() => {
                              if (isBlogLink) {
                                handleAboutTurkeyItemClick(item);
                              }
                            }}
                            className={`group flex w-full min-w-0 ${
                              isBlogLink ? "items-start" : "items-center"
                            } justify-between gap-3 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-[#00A86B] hover:text-white ${
                              isBlogLink ? "cursor-pointer" : "cursor-default"
                            }`}
                          >
                            <span
                              className={
                                isBlogLink
                                  ? `block flex-1 min-w-0 text-[12px] font-semibold leading-5 text-emerald-500 group-hover:text-white ${
                                      isSingleLine
                                        ? "line-clamp-2 whitespace-normal text-[11px] tracking-tight"
                                        : "whitespace-normal break-words"
                                    }`
                                  : "text-slate-600"
                              }
                            >
                              {t(item.labelKey)}
                            </span>
                            {item.hasChildren && (
                              <MdKeyboardArrowRight
                                size={18}
                                className="text-gray-500"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                    </ul>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <button
            type="button"
            className={simpleButtonClass(false)}
            aria-expanded={aboutTurkeyDropdownOpen}
            onClick={toggleAboutTurkeyDropdown}
          >
            <span>{t("nav.aboutTurkey")}</span>
            <MdKeyboardArrowDown
              size={20}
              className={`text-gray-500 transition-transform duration-300 ${
                aboutTurkeyDropdownOpen ? "" : "rotate-180"
              }`}
            />
          </button>
          <div
            className={`border-b border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-out origin-top ${
              aboutTurkeyDropdownOpen
                ? "max-h-[2000px] translate-y-0"
                : "max-h-0 -translate-y-2 pointer-events-none"
            }`}
            aria-hidden={!aboutTurkeyDropdownOpen}
          >
            {aboutTurkeyMenu.map((section) => (
              <div
                key={section.titleKey}
                className="px-4 py-3 border-t border-gray-100"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-red-500">
                  <span>{t(section.titleKey)}</span>
                  <MdKeyboardArrowDown
                    size={16}
                    className="text-red-500"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-2 space-y-1">
                  {section.items.map((item) => {
                    const menuKey = item?.menuKey || item?.labelKey;
                    const isBlogLink =
                      Boolean(item.blogKey) ||
                      (menuKey ? menuBlogMap.has(menuKey) : false);
                    return (
                      <button
                        key={item.labelKey}
                        type="button"
                        onClick={() => {
                          if (isBlogLink) {
                            handleAboutTurkeyItemClick(item);
                          }
                        }}
                        className={`w-full rounded-md px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-[#00A86B] hover:text-white ${
                          isBlogLink
                            ? "cursor-pointer font-semibold text-emerald-500"
                            : "cursor-default text-gray-700"
                        }`}
                      >
                        {t(item.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isDesktop ? (
        <div
          className="relative"
          onMouseEnter={() => window.innerWidth >= 1024 && openBuyerGuideMenu()}
          onMouseLeave={() =>
            window.innerWidth >= 1024 && scheduleCloseBuyerGuideMenu()
          }
        >
          <button
            type="button"
            className={simpleButtonClass(false)}
            aria-expanded={buyerGuideDropdownOpen}
            onClick={(e) => {
              e.preventDefault();
              if (window.innerWidth < 1024) return;
              if (buyerGuideDropdownOpen) {
                scheduleCloseBuyerGuideMenu();
              } else {
                openBuyerGuideMenu();
              }
            }}
          >
            <span>{t("nav.buyerGuide")}</span>
            <MdKeyboardArrowDown
              size={16}
              className={`text-gray-500 transition-transform duration-300 ${
                buyerGuideDropdownOpen ? "" : "rotate-180"
              }`}
            />
          </button>

          <div
            className={`fixed top-[var(--header-height)] left-1/2 z-50 w-[min(1100px,92vw)] -translate-x-1/2 overflow-x-hidden overflow-y-auto transition-all duration-300 ease-out origin-top ${
              buyerGuideDropdownOpen
                ? "max-h-[calc(100vh-var(--header-height)-12px)] translate-y-0 opacity-100"
                : "max-h-0 -translate-y-2 opacity-0 pointer-events-none"
            }`}
            aria-hidden={!buyerGuideDropdownOpen}
          >
            <div className="pt-0">
              <div className="rounded-none border border-black/10 bg-[#e7e2d4] p-6 shadow-xl">
                <div className="grid grid-cols-4 gap-6">
                  {buyerGuideMenu.map((column, columnIndex) => (
                    <div
                      key={`buyer-guide-column-${columnIndex}`}
                      className={`min-w-0 ${
                        columnIndex === 0 ? "" : "border-l border-black/10 pl-6"
                      }`}
                    >
                      {column.sections.map((section, sectionIndex) => (
                        <div
                          key={section.titleKey}
                          className={sectionIndex === 0 ? "" : "mt-6"}
                        >
                          <div className="mb-4">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-sm font-semibold text-red-500">
                                {t(section.titleKey)}
                              </h4>
                              {section.items.length > 0 && (
                                <MdKeyboardArrowDown
                                  size={18}
                                  className="text-red-500"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="mt-2 h-0.5 w-10 bg-red-500"></div>
                          </div>
                          {section.items.length > 0 && (
                            <ul className="space-y-3">
                              {section.items.map((item) => {
                                const menuKey =
                                  item?.menuKey || item?.labelKey;
                                const isBlogLink =
                                  Boolean(item.blogKey) ||
                                  (menuKey ? menuBlogMap.has(menuKey) : false);
                                const isSingleLine = Boolean(item.singleLine);
                                return (
                                  <li key={item.labelKey}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isBlogLink) {
                                          handleBuyerGuideItemClick(item);
                                        }
                                      }}
                                    className={`group flex w-full min-w-0 ${
                                      isBlogLink
                                        ? "items-start"
                                        : "items-center"
                                    } justify-between gap-3 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-[#00A86B] hover:text-white ${
                                      isBlogLink
                                        ? "cursor-pointer"
                                        : "cursor-default"
                                    }`}
                                  >
                                    <span
                                      className={
                                        isBlogLink
                                          ? `block flex-1 min-w-0 text-[12px] font-semibold leading-5 text-emerald-500 group-hover:text-white ${
                                              isSingleLine
                                                ? "line-clamp-2 whitespace-normal text-[11px] tracking-tight"
                                                : "whitespace-normal break-words"
                                            }`
                                          : "text-slate-600"
                                      }
                                    >
                                      {t(item.labelKey)}
                                    </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <button
            type="button"
            className={simpleButtonClass(false)}
            aria-expanded={buyerGuideDropdownOpen}
            onClick={toggleBuyerGuideDropdown}
          >
            <span>{t("nav.buyerGuide")}</span>
            <MdKeyboardArrowDown
              size={20}
              className={`text-gray-500 transition-transform duration-300 ${
                buyerGuideDropdownOpen ? "" : "rotate-180"
              }`}
            />
          </button>
          <div
            className={`border-b border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-out origin-top ${
              buyerGuideDropdownOpen
                ? "max-h-[2400px] translate-y-0"
                : "max-h-0 -translate-y-2 pointer-events-none"
            }`}
            aria-hidden={!buyerGuideDropdownOpen}
          >
            {buyerGuideMenu.map((column) =>
              column.sections.map((section) => (
                <div
                  key={section.titleKey}
                  className="px-4 py-3 border-t border-gray-100"
                >
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-red-500">
                    <span>{t(section.titleKey)}</span>
                    {section.items.length > 0 && (
                      <MdKeyboardArrowDown
                        size={16}
                        className="text-red-500"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {section.items.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {section.items.map((item) => {
                        const menuKey = item?.menuKey || item?.labelKey;
                        const isBlogLink =
                          Boolean(item.blogKey) ||
                          (menuKey ? menuBlogMap.has(menuKey) : false);
                        return (
                          <button
                            key={item.labelKey}
                            type="button"
                            onClick={() => {
                              if (isBlogLink) {
                                handleBuyerGuideItemClick(item);
                              }
                            }}
                            className={`w-full rounded-md px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-[#00A86B] hover:text-white ${
                              isBlogLink
                                ? "cursor-pointer font-semibold text-emerald-500"
                                : "cursor-default text-gray-700"
                            }`}
                          >
                            {t(item.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className={investmentButtonClass(isInvestmentOpportunitiesPage)}
        onClick={handleInvestmentOpportunitiesClick}
      >
        <span className="relative z-[1]">{t("nav.investmentOpportunities")}</span>
      </button>

      <button
        type="button"
        className={simpleButtonClass(false)}
        onClick={handleAboutUsClick}
      >
        <span>{t("nav.aboutUs")}</span>
      </button>

      {/* Projects with Dropdown */}
      <div
        className="w-full lg:w-auto lg:relative lg:group"
        onMouseEnter={() =>
          window.innerWidth >= 1024 && setProjectsDropdownOpen(true)
        }
        onMouseLeave={() =>
          window.innerWidth >= 1024 && setProjectsDropdownOpen(false)
        }
      >
        <div
          className={`${linkClass(isProjectsPage)} cursor-pointer`}
          onClick={(e) => {
            // On mobile: toggle dropdown
            if (window.innerWidth < 1024) {
              toggleProjectsDropdown(e);
            } else {
              // On desktop: toggle dropdown instead of navigate
              toggleProjectsDropdown(e);
            }
          }}
        >
          <div className="flex items-center gap-3 lg:gap-1">
            <MdBusiness size={20} className={isMobile ? "" : "lg:hidden"} />
            <span>{t("nav.projects")}</span>
          </div>
          <MdKeyboardArrowDown
            size={20}
            className={`transition-transform duration-300 text-gray-500 ${
              projectsDropdownOpen ? "" : "rotate-180"
            }`}
            onClick={(e) => {
              toggleProjectsDropdown(e);
            }}
          />
        </div>

        {/* Projects Dropdown */}
        <div
          className={`lg:absolute lg:top-full lg:left-0 lg:z-50 bg-white lg:rounded-none lg:min-w-[210px] overflow-hidden transition-all duration-300 ease-out origin-top ${
            projectsDropdownOpen
              ? "max-h-[500px] translate-y-0 lg:border lg:border-gray-200 lg:shadow-xl"
              : "max-h-0 -translate-y-2 pointer-events-none lg:border-0 lg:shadow-none"
          }`}
          aria-hidden={!projectsDropdownOpen}
        >
          {projectTypes.map((project) => {
            const IconComponent = project.icon;
            const isActive = isProjectsPage && activeProjectType === project.value;
            return (
              <div
                key={project.value}
                onClick={() => handleProjectClick(project.value)}
                className={`group flex items-center gap-3 px-8 lg:px-4 py-3 lg:py-2 cursor-pointer transition-colors border-b lg:border-b-0 border-gray-100 last:border-b-0 ${
                  isActive
                    ? "bg-secondary/15 text-secondary font-semibold"
                    : "text-gray-700 hover:bg-[#00A86B] hover:text-white"
                }`}
              >
                <IconComponent
                  size={18}
                  className="text-gray-500 group-hover:text-white"
                />
                <span className="text-sm lg:text-sm font-medium whitespace-nowrap">
                  {project.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Property - Admin Only */}
      {!loading && isAdmin && (
        <div
          onClick={handleAddPropertyClick}
          className={`${linkClass(false)} cursor-pointer`}
        >
          <div className="flex items-center gap-3">
            <MdAddHome size={20} className={isMobile ? "" : "lg:hidden"} />
            <span>{t("nav.addProperty")}</span>
          </div>
        </div>
      )}

          </nav>
  );
};

Navbar.propTypes = {
  containerStyles: PropTypes.string,
  onContactClick: PropTypes.func,
  closeMenu: PropTypes.func,
  isMobile: PropTypes.bool,
  isAuthenticated: PropTypes.bool,
  user: PropTypes.object,
  logout: PropTypes.func,
  isLoading: PropTypes.bool,
  onLoginClick: PropTypes.func,
  onProfileClick: PropTypes.func,
  currencies: PropTypes.array,
  selectedCurrency: PropTypes.string,
  onCurrencySelect: PropTypes.func,
};

export default Navbar;
