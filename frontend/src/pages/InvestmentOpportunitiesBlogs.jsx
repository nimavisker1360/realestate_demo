import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MdArrowForward, MdCalendarToday } from "react-icons/md";
import useBlogs from "../hooks/useBlogs";
import blog1 from "../assets/blog1.jpg";
import blog2 from "../assets/blog2.jpg";
import blog3 from "../assets/blog3.jpg";
import blog4 from "../assets/blog4.jpg";
import { fixMojibake } from "../utils/text";
import SEO from "../components/SEO";
import { SITE_URL, buildLanguageAlternates, resolveBlogPath } from "../utils/seo";

const placeholderImages = [blog1, blog2, blog3, blog4];
const INVESTMENT_MENU_KEY = "nav.investmentOpportunities";

const InvestmentOpportunitiesBlogs = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: blogs, isLoading } = useBlogs();
  const normalizedLang = i18n.language?.toLowerCase() || "en";
  const language = normalizedLang.startsWith("tr")
    ? "tr"
    : normalizedLang.startsWith("ru")
    ? "ru"
    : "en";
  const dateLocale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";

  const displayBlogs = Array.isArray(blogs) ? blogs : [];
  const investmentBlogs = displayBlogs.filter(
    (blog) => String(blog?.menuKey || "").trim() === INVESTMENT_MENU_KEY
  );

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

  const canonicalPath = "/investment-opportunities";
  const description = `Explore curated investment opportunity blogs with ${investmentBlogs.length} published posts.`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Investment Opportunities Blogs",
      description,
      url: `${SITE_URL}${canonicalPath}`,
    },
  ];

  return (
    <>
      <SEO
        title="Investment Opportunities Blogs | demo"
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
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-700">
              {t("nav.investmentOpportunities")}
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
              {t("nav.investmentOpportunities")}
            </h1>
            <p className="mt-4 text-slate-600">
              {t(
                "blogs.investmentOpportunitiesIntro",
                "Explore selected investment opportunity articles."
              )}
            </p>
          </div>

          {isLoading ? (
            <div className="flexCenter mt-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
          ) : investmentBlogs.length === 0 ? (
            <div className="mt-16 rounded-3xl border border-white/70 bg-white/90 p-10 text-center shadow-[0_24px_60px_-45px_rgba(15,23,42,0.4)]">
              <p className="text-slate-600">
                {t(
                  "blogs.noInvestmentPosts",
                  "No investment opportunity posts found yet."
                )}
              </p>
            </div>
          ) : (
            <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {investmentBlogs.map((blog, index) => {
                const blogPath = resolveBlogPath(blog, { preferSlug: true });
                const canNavigate = blogPath !== "/blogs";
                const postTitle = getLocalizedTitle(blog);
                const summary = getLocalizedSummary(blog);
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

                      <p className="mt-4 text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {summary}
                      </p>

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

export default InvestmentOpportunitiesBlogs;
