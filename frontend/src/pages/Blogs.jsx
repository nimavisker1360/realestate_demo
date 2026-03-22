import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MdArrowForward } from "react-icons/md";
import useBlogs from "../hooks/useBlogs";
import { BLOGS } from "../constant/data";
import blog1 from "../assets/blog1.jpg";
import blog2 from "../assets/blog2.jpg";
import blog3 from "../assets/blog3.jpg";
import blog4 from "../assets/blog4.jpg";
import { fixMojibake } from "../utils/text";
import SEO from "../components/SEO";
import { SITE_URL, buildLanguageAlternates, resolveCountrySlug } from "../utils/seo";

const placeholderImages = [blog1, blog2, blog3, blog4];

const BlogsPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: blogs, isLoading } = useBlogs();
  const normalizedLang = i18n.language?.toLowerCase() || "en";
  const language = normalizedLang.startsWith("tr")
    ? "tr"
    : normalizedLang.startsWith("ru")
    ? "ru"
    : "en";

  const displayBlogs = Array.isArray(blogs) && blogs.length > 0 ? blogs : BLOGS;

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

  const normalizeCountry = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .replace(/\u0131/g, "i")
      .replace(/\u0130/g, "i")
      .replace(/\u00fc/g, "u")
      .replace(/\u00f6/g, "o")
      .replace(/\u015f/g, "s")
      .replace(/\u011f/g, "g")
      .replace(/\u00e7/g, "c")
      .replace(/\u00c4\u00b1/g, "i")
      .replace(/\u00c3\u00bc/g, "u")
      .replace(/\u00c3\u00b6/g, "o")
      .replace(/\u00c5\u017f/g, "s")
      .replace(/\u00c4\u009f/g, "g")
      .replace(/\u00c3\u00a7/g, "c");

  const isExcludedCountry = (name) => {
    const normalized = normalizeCountry(name);
    return normalized === "turkey" || normalized === "turkiye";
  };

  const countryMap = displayBlogs.reduce((acc, blog, index) => {
    const country = getCountryFromBlog(blog);
    if (!country || isExcludedCountry(country)) return acc;
    const key = country.toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        country,
        coverBlog: blog,
        coverIndex: index,
        count: 0,
      };
    }
    acc[key].count += 1;
    return acc;
  }, {});

  const countryCards = Object.values(countryMap).sort((a, b) =>
    a.country.localeCompare(b.country)
  );
  const canonicalPath = "/blogs";
  const description = `Explore country-based real estate articles and market updates. ${countryCards.length} countries and ${displayBlogs.length} published posts.`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Real Estate Blog Countries",
      description,
      url: `${SITE_URL}${canonicalPath}`,
      about: "Real estate market insights by country",
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
          item: `${SITE_URL}${canonicalPath}`,
        },
      ],
    },
  ];

  return (
    <>
      <SEO
        title="Real Estate Blog Countries | demo"
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
            {t("blogs.countriesSubtitle", "Explore Countries")}
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
            {t("blogs.countriesTitle", "Countries")}
          </h1>
          <p className="mt-4 text-slate-600">
            {t(
              "blogs.countriesIntro",
              "Select a country to see related articles."
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm">
              {countryCards.length} {t("blogs.totalCountries", "Total Countries")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm">
              {t("blogs.totalPosts", "Total posts")}: {displayBlogs.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flexCenter mt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : countryCards.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-white/70 bg-white/90 p-10 text-center shadow-[0_24px_60px_-45px_rgba(15,23,42,0.4)]">
            <p className="text-slate-600">
              {t("blogs.noCountries", "No countries to show yet.")}
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {countryCards.map(({ country, coverBlog, coverIndex, count }) => (
              <article
                key={country}
                className="group overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(15,23,42,0.5)] cursor-pointer"
                onClick={() => navigate(`/blogs/${getCountrySlug(country)}`)}
              >
                <div className="flex justify-center pt-8 pb-4">
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-full overflow-hidden border-[6px] border-white/80 bg-white shadow-[0_18px_45px_-25px_rgba(15,23,42,0.45)]">
                    <img
                      src={getBlogImage(coverBlog, coverIndex)}
                      alt={country}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </div>
                <div className="px-5 pb-6 flex flex-col items-center text-center gap-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                      {country}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {count} {t("blogs.posts", "posts")}
                    </p>
                  </div>
                  <span className="text-sm text-slate-600">
                    {t("blogs.continueReading", "continue reading")}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/blogs/${getCountrySlug(country)}`);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                  >
                    {t("blogs.viewAll", "More")}
                    <MdArrowForward />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
      </section>
    </>
  );
};

export default BlogsPage;
