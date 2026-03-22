import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdArrowForward, MdCalendarToday } from "react-icons/md";
import useBlogs from "../hooks/useBlogs";
import { BLOGS } from "../constant/data";
import blog1 from "../assets/blog1.jpg";
import blog2 from "../assets/blog2.jpg";
import blog3 from "../assets/blog3.jpg";
import blog4 from "../assets/blog4.jpg";
import { fixMojibake } from "../utils/text";
import SEO from "../components/SEO";
import {
  SITE_URL,
  buildLanguageAlternates,
  resolveBlogPath,
  resolveCountrySlug,
} from "../utils/seo";

const placeholderImages = [blog1, blog2, blog3, blog4];

const CountryBlogs = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { countrySlug } = useParams();
  const { data: blogs, isLoading } = useBlogs();
  const normalizedLang = i18n.language?.toLowerCase() || "en";
  const language = normalizedLang.startsWith("tr")
    ? "tr"
    : normalizedLang.startsWith("ru")
    ? "ru"
    : "en";
  const dateLocale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";

  const displayBlogs = Array.isArray(blogs) && blogs.length > 0 ? blogs : BLOGS;
  const normalizedSlug = (countrySlug || "").toLowerCase();

  const getBlogImage = (blog, index) => {
    if (blog.image) return blog.image;
    if (Array.isArray(blog.images) && blog.images.length > 0) {
      return blog.images[0];
    }
    return placeholderImages[index % placeholderImages.length];
  };

  const getLocalizedTitle = (blog) => {
    let value = blog.title || t("blogs.title", "Our Expert Blogs");
    if (language === "tr" && blog.title_tr) value = blog.title_tr;
    if (language === "ru" && blog.title_ru) value = blog.title_ru;
    if (language === "en" && blog.title_en) value = blog.title_en;
    return fixMojibake(value);
  };

  const getLocalizedCategory = (blog) => {
    let value = blog.category || t("common.all", "All");
    if (language === "tr" && blog.category_tr) value = blog.category_tr;
    if (language === "ru" && blog.category_ru) value = blog.category_ru;
    if (language === "en" && blog.category_en) value = blog.category_en;
    return fixMojibake(value);
  };

  const getLocalizedSummary = (blog) => {
    let value = blog.summary || t("blogs.subtitle", "Stay Updated with the Latest News!");
    if (language === "tr" && blog.summary_tr) value = blog.summary_tr;
    if (language === "ru" && blog.summary_ru) value = blog.summary_ru;
    if (language === "en" && blog.summary_en) value = blog.summary_en;
    return fixMojibake(value);
  };

  const extractCountryTitle = (rawTitle) => {
    if (!rawTitle || typeof rawTitle !== "string") return "";
    const cleaned = rawTitle.replace(/[?!\u061f]+$/g, "").trim();
    const lower = cleaned.toLowerCase();
    const inIndex = lower.lastIndexOf(" in ");
    if (inIndex !== -1 && inIndex + 4 < cleaned.length) {
      return cleaned.slice(inIndex + 4).trim();
    }
    return "";
  };

  const getCountryFromBlog = (blog) => {
    if (blog.country) return blog.country;
    const candidates = [
      blog.title_en,
      blog.title_tr,
      blog.title_ru,
      blog.title,
      getLocalizedTitle(blog),
    ].filter(Boolean);
    for (const candidate of candidates) {
      const extracted = extractCountryTitle(candidate);
      if (extracted) return extracted;
    }
    return "";
  };

  const getCountrySlug = (country) => {
    if (!country) return "";
    return resolveCountrySlug(country);
  };

  const getSummaryItems = (text) => {
    if (!text || typeof text !== "string") return [];
    const items = text
      .split(/\r?\n|\s*\|\s*/g)
      .map((item) => item.replace(/^\s*[-\u2022]\s*/, "").trim())
      .filter(Boolean);
    return items.length > 1 ? items : [];
  };

  const countryBlogs = displayBlogs
    .map((blog, index) => ({ blog, index }))
    .filter(({ blog }) => {
      const country = getCountryFromBlog(blog);
      if (!country) return false;
      return getCountrySlug(country) === normalizedSlug;
    });

  const countryName = countryBlogs.length
    ? getCountryFromBlog(countryBlogs[0].blog)
    : decodeURIComponent(normalizedSlug || "").replace(/-/g, " ");
  const canonicalPath = normalizedSlug ? `/blogs/${normalizedSlug}` : "/blogs";
  const description = `Read curated real estate insights for ${countryName || "this country"} with ${countryBlogs.length} available posts.`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${countryName || "Country"} Real Estate Articles`,
      description,
      url: `${SITE_URL}${canonicalPath}`,
    },
    {
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
          name: countryName || "Country",
          item: `${SITE_URL}${canonicalPath}`,
        },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={`${countryName || "Country"} Real Estate Articles | demo`}
        description={description}
        canonicalPath={canonicalPath}
        languageAlternates={buildLanguageAlternates(canonicalPath)}
        structuredData={structuredData}
      />
      <section className="min-h-screen pt-24 pb-20 bg-[#f7f3ea] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl"></div>
        <div className="absolute top-16 -right-20 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-teal-200/25 blur-3xl"></div>
      </div>

      <div className="max-padd-container relative z-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/blogs")}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700"
          >
            <MdArrowBack />
            {t("blogs.back", "Back to countries")}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {countryName || t("blogs.title", "Our Expert Blogs")}
          </h1>
          <p className="text-slate-600">
            {t("blogs.countryIntro", "Articles related to this country.")}
          </p>
        </div>

        {isLoading ? (
          <div className="flexCenter mt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : countryBlogs.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-white/70 bg-white/90 p-10 text-center shadow-[0_24px_60px_-45px_rgba(15,23,42,0.4)]">
            <p className="text-slate-600">
              {t("blogs.noCountryPosts", "No posts found for this country yet.")}
            </p>
            <button
              type="button"
              onClick={() => navigate("/blogs")}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-white text-sm font-semibold shadow-lg shadow-emerald-200/60 hover:bg-emerald-700 transition"
            >
              {t("blogs.viewAll", "More")}
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {countryBlogs.map(({ blog, index }) => {
              const blogPath = resolveBlogPath(blog, { preferSlug: true });
              const canNavigate = blogPath !== "/blogs";
              const postTitle = getLocalizedTitle(blog);
              const summary = getLocalizedSummary(blog);
              const summaryItems = getSummaryItems(summary);
              const category = getLocalizedCategory(blog);

              return (
                <article
                  key={blog.id || `${postTitle}-${index}`}
                  className={`group overflow-hidden rounded-[26px] border border-white/70 bg-white/90 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(15,23,42,0.5)] ${
                    canNavigate ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={() => {
                    if (canNavigate) {
                      navigate(blogPath);
                    }
                  }}
                >
                  <div className="flex justify-center pt-8 pb-4">
                    <div className="relative h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-full overflow-hidden border-[6px] border-white/80 bg-white shadow-[0_18px_45px_-25px_rgba(15,23,42,0.35)]">
                      <img
                        src={getBlogImage(blog, index)}
                        alt={postTitle}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <div className="px-5 pb-6 flex flex-col h-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        {category}
                      </span>
                      {blog.createdAt && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <MdCalendarToday className="text-emerald-500" />
                          {new Date(blog.createdAt).toLocaleDateString(dateLocale, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    <h4 className="mt-4 text-lg font-semibold text-slate-900 leading-snug">
                      {postTitle}
                    </h4>

                    {summaryItems.length > 1 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {summaryItems.map((item, itemIndex) => (
                          <span
                            key={`${blog.id || postTitle}-${itemIndex}`}
                            className="rounded-full border border-emerald-100/80 bg-emerald-50/70 px-3 py-1 text-xs text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {summary}
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={!canNavigate}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (canNavigate) {
                          navigate(blogPath);
                        }
                      }}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 disabled:cursor-default disabled:opacity-50"
                    >
                      {t("blogs.continueReading", "continue reading")}
                      <MdArrowForward />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
      </section>
    </>
  );
};

export default CountryBlogs;
