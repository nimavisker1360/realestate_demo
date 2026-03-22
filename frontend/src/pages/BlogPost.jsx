import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { getBlog } from "../utils/api";
import { MdArrowBack, MdCalendarToday, MdCategory, MdErrorOutline, MdAccessTime, MdShare, MdClose, MdChevronLeft, MdChevronRight, MdArticle } from "react-icons/md";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import HousingSalesChart from "../components/HousingSalesChart";
import ForeignSalesChart from "../components/ForeignSalesChart";
import BlogContactForm from "../components/BlogContactForm";
import SEO from "../components/SEO";
import useBlogs from "../hooks/useBlogs";
import { aboutTurkeyMenu } from "../constant/aboutTurkeyMenu";
import { fixMojibake } from "../utils/text";
import {
  SITE_URL,
  buildLanguageAlternates,
  isObjectId,
  resolveBlogIdentifier,
  resolveBlogSlug,
  stripHtml,
  toAbsoluteUrl,
  truncateText,
} from "../utils/seo";

const BlogPost = () => {
  const { slug: routeIdentifier } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.toLowerCase() || "en";
  const isTurkish = currentLang.startsWith("tr");
  const isRussian = currentLang.startsWith("ru");
  const language = isTurkish ? "tr" : isRussian ? "ru" : "en";
  const dateLocale = isTurkish ? "tr-TR" : isRussian ? "ru-RU" : "en-US";
  const uiText = {
    linkCopied: isTurkish ? "Link kopyalandı!" : isRussian ? "Ссылка скопирована!" : "Link copied!",
    loadingArticle: isTurkish ? "Makale yükleniyor..." : isRussian ? "Загрузка статьи..." : "Loading article...",
    notFoundTitle: isTurkish ? "Blog yazısı bulunamadı" : isRussian ? "Публикация не найдена" : "Blog post not found",
    notFoundDesc: isTurkish
      ? "Aradığınız blog yazısı bulunamadı veya kaldırılmış olabilir."
      : isRussian
      ? "Публикация, которую вы ищете, не существует или была удалена."
      : "The blog post you're looking for doesn't exist or has been removed.",
    back: isTurkish ? "Geri" : isRussian ? "Назад" : "Back",
    share: isTurkish ? "Paylaş" : isRussian ? "Поделиться" : "Share",
    categories: isTurkish ? "Kategoriler" : isRussian ? "Категории" : "Categories",
    minRead: isTurkish ? "dk okuma" : isRussian ? "мин чтения" : "min read",
    faq: isTurkish ? "Sık Sorulan Sorular" : isRussian ? "Часто задаваемые вопросы" : "Frequently Asked Questions",
    related: isTurkish ? "İlgili Makaleler" : isRussian ? "Похожие статьи" : "Related Articles",
    video: isTurkish ? "Video" : isRussian ? "Видео" : "Video",
  };
  const [selectedImage, setSelectedImage] = useState(null); // For lightbox
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: blog, isLoading, isError } = useQuery(
    ["blog", routeIdentifier],
    () => getBlog(routeIdentifier),
    {
      enabled: !!routeIdentifier,
      refetchOnWindowFocus: false,
    }
  );
  const { data: blogs, refetch: refetchBlogs } = useBlogs();
  const resolvedBlogSlug = resolveBlogSlug(blog);

  useEffect(() => {
    if (!blog || !routeIdentifier) return;
    if (!isObjectId(routeIdentifier)) return;
    if (!resolvedBlogSlug || resolvedBlogSlug === routeIdentifier) return;
    navigate(`/blog/${encodeURIComponent(resolvedBlogSlug)}`, { replace: true });
  }, [blog, navigate, resolvedBlogSlug, routeIdentifier]);

  // Get content based on selected language
  const getLocalizedContent = (field) => {
    if (!blog) return "";
    const langField = `${field}_${language}`;
    const value = blog[langField] || blog[field] || "";
    return fixMojibake(value);
  };

  const getLocalizedFaq = () => {
    if (!blog) return [];
    const langField = `faqSection_${language}`;
    const faq = blog[langField] || blog.faqSection;
    if (!Array.isArray(faq)) return [];
    return faq.map((item) => ({
      ...item,
      question: fixMojibake(item?.question || ""),
      answer: fixMojibake(item?.answer || ""),
    }));
  };

  const menuBlogMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(blogs)) {
      blogs.forEach((blogItem) => {
        const identifier = resolveBlogIdentifier(blogItem, {
          preferSlug: true,
        });
        if (blogItem?.menuKey && identifier) {
          map.set(blogItem.menuKey, identifier);
        }
      });
    }
    return map;
  }, [blogs]);

  const findBlogIdByMarker = (list, marker) => {
    if (!marker || !Array.isArray(list)) return null;
    const match = list.find((blogItem) =>
      [blogItem?.content, blogItem?.content_en, blogItem?.content_tr, blogItem?.content_ru]
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
    const match = list.find((blogItem) => blogItem?.menuKey === menuKey);
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
    const blogSlug = await getMenuBlogId(item);
    if (blogSlug) {
      navigate(`/blog/${blogSlug}`);
    } else {
      navigate("/blogs");
    }
  };
  // Calculate reading time
  const calculateReadingTime = (content) => {
    if (!content) return 0;
    const text = content.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 200); // Average reading speed
  };

  // Share functionality
  const handleShare = async () => {
    const url = window.location.href;
    const title = getLocalizedContent("title");
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(url);
      alert(uiText.linkCopied);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flexCenter bg-[#f7f3ea] pt-24">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 mt-4 font-medium">{uiText.loadingArticle}</p>
        </div>
      </div>
    );
  }

  if (isError || !blog) {
    return (
      <div className="min-h-screen flexCenter bg-[#f7f3ea] pt-24">
        <div className="text-center bg-white/90 p-10 rounded-3xl shadow-[0_30px_70px_-50px_rgba(15,23,42,0.6)] border border-white/70 max-w-md mx-4">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <MdErrorOutline className="text-red-500 text-4xl" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-800">{uiText.notFoundTitle}</h2>
          <p className="text-gray-500 mb-8">{uiText.notFoundDesc}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition hover:bg-emerald-700"
          >
            {uiText.back}
          </button>
        </div>
      </div>
    );
  }

  const localizedContent = getLocalizedContent("content");
  const blogContentCandidates = [
    localizedContent,
    blog.content,
    blog.content_en,
    blog.content_tr,
    blog.content_ru,
  ].filter((content) => typeof content === "string");
  const hasContentMarker = (marker) =>
    blogContentCandidates.some((content) => content.includes(marker));

  // Check if this is a stats blog
  const isHousingStatsBlog = hasContentMarker("HOUSING_STATS_CHART");
  const isForeignSalesBlog = hasContentMarker("FOREIGN_SALES_CHART");
  const isStatsBlog = isHousingStatsBlog || isForeignSalesBlog;
  const isStatsTheme = false;
  const readingTime = calculateReadingTime(localizedContent);
  const getLocalizedCategoryLabel = (value) => {
    const raw = fixMojibake(value || "");
    if (!raw || !isRussian) return raw;
    const normalized = raw.toLowerCase().trim();
    const categoryMap = {
      investment: "Инвестиции",
      investments: "Инвестиции",
      "market analysis": "Аналитика рынка",
      guide: "Гид",
      lifestyle: "Образ жизни",
      news: "Новости",
      citizenship: "Гражданство",
    };
    return categoryMap[normalized] || raw;
  };
  const categoryLabel = getLocalizedCategoryLabel(getLocalizedContent("category"));
  const localizedFaq = getLocalizedFaq();
  const localizedTitle = getLocalizedContent("title") || "Blog Post";
  const canonicalPath = resolvedBlogSlug
    ? `/blog/${encodeURIComponent(resolvedBlogSlug)}`
    : `/blog/${routeIdentifier || ""}`;
  const fallbackDescription =
    "Read practical real estate insights and market updates from demo.";
  const resolvedDescription =
    truncateText(
      getLocalizedContent("summary") ||
        getLocalizedContent("metaDescription") ||
        getLocalizedContent("content"),
      150
    ) || fallbackDescription;
  const seoImage = blog?.image || blog?.images?.[0] || "/og-image.png";
  const normalizedCategory = getLocalizedContent("category") || "Real Estate";
  const wordCount = stripHtml(getLocalizedContent("content"))
    .split(/\s+/)
    .filter(Boolean).length;

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: localizedTitle,
    articleSection: normalizedCategory,
    description: resolvedDescription,
    image: [toAbsoluteUrl(seoImage)],
    inLanguage: language,
    datePublished: blog?.createdAt || undefined,
    dateModified: blog?.updatedAt || blog?.createdAt || undefined,
    mainEntityOfPage: toAbsoluteUrl(canonicalPath),
    publisher: {
      "@type": "Organization",
      name: "demo",
      url: SITE_URL,
    },
    author: {
      "@type": "Organization",
      name: "demo",
    },
    wordCount,
    timeRequired: `PT${Math.max(readingTime, 1)}M`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blogs",
        item: `${SITE_URL}/blogs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: localizedTitle,
        item: toAbsoluteUrl(canonicalPath),
      },
    ],
  };

  const faqSchema = localizedFaq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: localizedFaq.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
    : null;

  return (
    <>
      <SEO
        title={`${localizedTitle} | demo`}
        description={resolvedDescription}
        canonicalPath={canonicalPath}
        image={seoImage}
        type="article"
        languageAlternates={buildLanguageAlternates(canonicalPath)}
        structuredData={[blogSchema, breadcrumbSchema, faqSchema]}
      />
      <div className={`min-h-screen pt-24 pb-20 relative overflow-hidden ${isStatsTheme ? 'bg-slate-950' : 'bg-[#f7f3ea]'}`}>
      {!isStatsTheme && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl"></div>
          <div className="absolute top-12 -right-24 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl"></div>
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-teal-200/25 blur-3xl"></div>
        </div>
      )}
      <div className="max-padd-container relative z-10">
        <div className="mx-auto w-full max-w-6xl">
          <div
            className={`items-start ${
              isStatsBlog
                ? "flex justify-center"
                : "flex flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] lg:gap-10"
            }`}
          >
            {!isStatsBlog && (
              <aside className="order-2 w-full lg:order-1 lg:col-start-1 mt-10 lg:mt-0 lg:sticky lg:top-28">
                <div className="border border-emerald-100/80 bg-white/90 p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)] rounded-none">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-slate-900">
                      {t("nav.aboutTurkey")}
                    </h2>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                      {uiText.categories}
                    </span>
                  </div>
                  <div className="hidden space-y-4 lg:block">
                    {aboutTurkeyMenu.map((section) => (
                      <div
                        key={section.titleKey}
                        className="border border-emerald-100/80 bg-emerald-50/40 p-4 rounded-none"
                      >
                        <div className="text-sm font-semibold text-emerald-700">
                          {t(section.titleKey)}
                        </div>
                        <div className="mt-3 space-y-1">
                          {section.items.map((item) => {
                            const menuKey = item?.menuKey || item?.labelKey;
                            const isBlogLink =
                              Boolean(item.blogKey) ||
                              (menuKey ? menuBlogMap.has(menuKey) : false);
                            const isSingleLine = Boolean(item.singleLine);
                            return (
                              <button
                                key={item.labelKey}
                                type="button"
                                onClick={() => {
                                  if (isBlogLink) {
                                    handleAboutTurkeyItemClick(item);
                                  }
                                }}
                                className={`w-full px-2 py-2 text-left text-[13px] font-semibold transition ${
                                  isBlogLink
                                    ? "text-emerald-700 hover:bg-emerald-600 hover:text-white"
                                    : "cursor-default text-slate-500"
                                } ${
                                  isSingleLine
                                    ? "whitespace-nowrap text-[11px] tracking-tight"
                                    : "whitespace-normal"
                                } rounded-none`}
                              >
                                {t(item.labelKey)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 lg:hidden">
                    {aboutTurkeyMenu.map((section) => (
                      <details
                        key={section.titleKey}
                        className="group border border-emerald-100/80 bg-emerald-50/40 p-3 rounded-none"
                      >
                        <summary className="cursor-pointer list-none [&::marker]:hidden [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3 text-sm font-semibold text-emerald-700">
                          <span>{t(section.titleKey)}</span>
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center transition-transform group-open:rotate-180">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </summary>
                        <div className="mt-3 space-y-1">
                          {section.items.map((item) => {
                            const menuKey = item?.menuKey || item?.labelKey;
                            const isBlogLink =
                              Boolean(item.blogKey) ||
                              (menuKey ? menuBlogMap.has(menuKey) : false);
                            const isSingleLine = Boolean(item.singleLine);
                            return (
                              <button
                                key={item.labelKey}
                                type="button"
                                onClick={() => {
                                  if (isBlogLink) {
                                    handleAboutTurkeyItemClick(item);
                                  }
                                }}
                                className={`w-full px-2 py-2 text-left text-[13px] font-semibold transition ${
                                  isBlogLink
                                    ? "text-emerald-700 hover:bg-emerald-600 hover:text-white"
                                    : "cursor-default text-slate-500"
                                } ${
                                  isSingleLine
                                    ? "whitespace-nowrap text-[11px] tracking-tight"
                                    : "whitespace-normal"
                                } rounded-none`}
                              >
                                {t(item.labelKey)}
                              </button>
                            );
                          })}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </aside>
            )}
            <div
              className={`min-w-0 w-full ${
                isStatsBlog ? "w-full max-w-4xl" : "order-1 lg:order-2 lg:col-start-2"
              }`}
            >
              {/* Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isStatsTheme
                  ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'border-white/70 bg-white/80 text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700 hover:shadow'
              }`}
            >
              <MdArrowBack size={18} />
              <span>{uiText.back}</span>
            </button>
            {!isStatsBlog && (
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-600 hover:bg-emerald-600 hover:text-white"
              >
                <MdShare size={18} />
                <span>{uiText.share}</span>
              </button>
            )}
          </div>

        {/* Image Lightbox Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <MdClose size={32} />
            </button>
            
            {/* Navigation arrows for gallery */}
            {blog.images && blog.images.length > 1 && (
              <>
                <button 
                  className="absolute left-4 text-white hover:text-gray-300 transition-colors p-2 bg-black/30 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : blog.images.length - 1;
                    setCurrentImageIndex(newIndex);
                    setSelectedImage(blog.images[newIndex]);
                  }}
                >
                  <MdChevronLeft size={40} />
                </button>
                <button 
                  className="absolute right-4 text-white hover:text-gray-300 transition-colors p-2 bg-black/30 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = currentImageIndex < blog.images.length - 1 ? currentImageIndex + 1 : 0;
                    setCurrentImageIndex(newIndex);
                    setSelectedImage(blog.images[newIndex]);
                  }}
                >
                  <MdChevronRight size={40} />
                </button>
              </>
            )}
            
            <img 
              src={selectedImage} 
              alt={`${getLocalizedContent("title") || "Blog image"} image ${currentImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Image counter */}
            {blog.images && blog.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {blog.images.length}
              </div>
            )}
          </div>
        )}

        {/* Main Article Card */}
        <article className={`overflow-hidden rounded-[28px] border shadow-[0_28px_70px_-50px_rgba(15,23,42,0.55)] ${
          isStatsTheme
            ? 'bg-slate-900 border-white/10'
            : 'bg-white/90 border-white/70 backdrop-blur'
        }`}>
          {/* Hero Image / Flag Badge */}
          {isStatsBlog ? (
            <div className="flex justify-center px-6 sm:px-10 pt-8 pb-2">
              <div
                className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full overflow-hidden border-[6px] border-white/80 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.65)] bg-[#e11d2e]"
                role="img"
                aria-label="Turkey flag"
              >
                <svg viewBox="0 0 200 200" className="h-full w-full">
                  <rect width="200" height="200" fill="#e11d2e" />
                  <circle cx="85" cy="100" r="55" fill="#ffffff" />
                  <circle cx="100" cy="100" r="45" fill="#e11d2e" />
                  <polygon
                    points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35"
                    fill="#ffffff"
                    transform="translate(115 75) scale(0.5)"
                  />
                </svg>
              </div>
            </div>
          ) : (
            blog.image && (
              <div className="flex justify-center px-6 sm:px-10 pt-8 pb-2">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full overflow-hidden border-[6px] border-white/80 shadow-[0_18px_45px_-25px_rgba(15,23,42,0.35)] bg-white">
                  <img
                    src={blog.image}
                    alt={getLocalizedContent("title")}
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105 cursor-pointer"
                    onClick={() => {
                      setSelectedImage(blog.image);
                      setCurrentImageIndex(0);
                    }}
                  />
                </div>
              </div>
            )
          )}

          {/* Image Gallery Thumbnails */}
          {blog.images && blog.images.length > 1 && (
            <div className={`px-6 sm:px-10 py-4 border-b ${
              isStatsTheme ? 'border-white/10 bg-slate-900/60' : 'border-slate-200/60 bg-white/70'
            }`}>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
                {blog.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedImage(img);
                      setCurrentImageIndex(index);
                    }}
                    className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border transition-all duration-200 ${
                      index === currentImageIndex
                        ? 'border-emerald-500 ring-2 ring-emerald-200'
                        : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${getLocalizedContent("title") || "Blog image"} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="px-6 sm:px-10 lg:px-12 py-8 sm:py-10">
            <div className={`flex flex-wrap items-center gap-3 text-xs sm:text-sm ${
              isStatsTheme ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {categoryLabel && (
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  isStatsTheme
                    ? 'border-slate-700 bg-slate-800 text-slate-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  <MdCategory size={14} />
                  {categoryLabel}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <MdCalendarToday size={14} className={isStatsTheme ? "text-emerald-400" : "text-emerald-600"} />
                <span>
                  {new Date(blog.createdAt).toLocaleDateString(dateLocale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MdAccessTime size={14} className={isStatsTheme ? "text-emerald-400" : "text-emerald-600"} />
                <span>
                  {readingTime} {uiText.minRead}
                </span>
              </div>
            </div>

            <h1 className={`mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight ${
              isStatsTheme ? 'text-white' : 'text-slate-900'
            }`}>
              {getLocalizedContent("title")}
            </h1>

            {getLocalizedContent("summary") && !isStatsBlog && (
              <div className="mt-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-5 sm:p-6">
                <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-slate-700">
                  {getLocalizedContent("summary")}
                </p>
              </div>
            )}

            {blog.video && !isStatsBlog && (
              <div className="mt-8 rounded-2xl border border-slate-200/70 bg-white/80 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {uiText.video}
                  </p>
                </div>
                <div className="aspect-video overflow-hidden rounded-xl bg-slate-900/10">
                  <video
                    src={blog.video}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                    poster={blog.image || blog.images?.[0] || undefined}
                  />
                </div>
              </div>
            )}

            <div className="mt-8">
              <div className="prose prose-lg max-w-none blog-content">
                {isHousingStatsBlog ? (
                  <HousingSalesChart />
                ) : isForeignSalesBlog ? (
                  <ForeignSalesChart />
                ) : (
                  <div
                    className={`leading-relaxed ${
                      isStatsTheme ? 'text-slate-300' : 'text-slate-700'
                    }
                    [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:text-slate-900 [&_h2]:border-b [&_h2]:border-emerald-100 [&_h2]:pb-3
                    [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-4 [&_h3]:text-slate-800
                    [&_p]:mb-6 [&_p]:text-base [&_p]:md:text-lg
                    [&_ul]:my-6 [&_ul]:space-y-3
                    [&_li]:pl-1 [&_li]:text-base [&_li]:md:text-lg
                    [&_strong]:text-slate-900 [&_strong]:font-semibold
                    [&_a]:text-emerald-700 [&_a]:hover:text-emerald-800 [&_a]:underline [&_a]:decoration-emerald-200 [&_a]:hover:decoration-emerald-400 [&_a]:transition-colors
                    [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-200 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_blockquote]:italic
                    [&_div.not-prose]:rounded-2xl [&_div.not-prose]:border [&_div.not-prose]:border-emerald-100 [&_div.not-prose]:bg-emerald-50/40 [&_div.not-prose]:p-6 [&_div.not-prose]:shadow-sm
                    [&_div.not-prose_img]:rounded-2xl [&_div.not-prose_img]:shadow-md
                    `}
                    dangerouslySetInnerHTML={{ __html: localizedContent }}
                  />
                )}
              </div>
            </div>

            {/* FAQ Section */}
            {localizedFaq.length > 0 && !isStatsBlog && (
              <div className="mt-12 rounded-3xl border border-emerald-100/80 bg-white/90 p-6 sm:p-8 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <span className="text-xl">?</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {uiText.faq}
                  </h2>
                </div>
                <div className="space-y-3">
                  {localizedFaq.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-2xl border border-emerald-100/80 bg-white/80 overflow-hidden transition hover:border-emerald-300 hover:shadow-md"
                    >
                      <summary className="cursor-pointer px-5 py-4 text-sm sm:text-base font-semibold text-slate-800 flex items-center justify-between gap-4 hover:bg-emerald-50/60">
                        <span className="pr-4">{faq.question}</span>
                        <span className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-open:rotate-180 transition-transform">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </summary>
                      <div className="px-5 pb-5 bg-emerald-50/30">
                        <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                          {faq.answer}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Links / Related Articles */}
            {blog.internalLinks && blog.internalLinks.length > 0 && !isStatsBlog && (
              <div className="mt-10 rounded-3xl border border-emerald-100/80 bg-white/90 p-6 sm:p-8 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <MdArticle size={20} />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    {uiText.related}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {blog.internalLinks.map((link, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm sm:text-base text-slate-700 hover:text-emerald-700 transition-colors">
                      <span className="mt-2 h-2 w-2 rounded-full bg-emerald-400"></span>
                      <span className="leading-relaxed">{fixMojibake(link)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </article>
        <BlogContactForm
          contextTitle={getLocalizedContent("title")}
          className="mt-4"
          fullWidth={!isStatsBlog}
        />
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default BlogPost;




