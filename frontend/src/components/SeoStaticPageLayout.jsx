import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import SEO from "./SEO";
import { SITE_URL } from "../utils/seo";

const SeoStaticPageLayout = ({
  title,
  description,
  canonicalPath,
  breadcrumbLabel,
  introParagraphs,
  sections,
  faqs,
  relatedLinks = [],
}) => {
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
        name: breadcrumbLabel,
        item: `${SITE_URL}${canonicalPath}`,
      },
    ],
  };

  const faqSchema = faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
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
        title={title}
        description={description}
        canonicalPath={canonicalPath}
        structuredData={[breadcrumbSchema, faqSchema]}
      />

      <main className="max-padd-container py-12 md:py-16">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <Link to="/" className="hover:text-gray-700">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">{breadcrumbLabel}</span>
        </nav>

        <article className="max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            {title}
          </h1>

          <p className="text-base md:text-lg text-gray-700 mb-6">
            Looking for available options right now? Browse live inventory on{" "}
            <Link to="/listing" className="text-emerald-700 underline">
              the property listing page
            </Link>
            .
          </p>

          <div className="space-y-5 text-gray-700 leading-8">
            {introParagraphs.map((paragraph, index) => (
              <p key={`intro-${index}`}>{paragraph}</p>
            ))}
          </div>

          {relatedLinks.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Popular Listing Paths
              </h2>
              <div className="flex flex-wrap gap-3">
                {relatedLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {sections.map((section, sectionIndex) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {sectionIndex + 1}. {section.heading}
              </h2>
              <div className="space-y-5 text-gray-700 leading-8">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${section.heading}-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">FAQ</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <summary className="cursor-pointer font-semibold text-gray-900">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-gray-700 leading-7">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Continue Your Search
            </h2>
            <p className="text-gray-700 mb-4">
              Compare current inventory, prices, and availability from verified
              listings in one place.
            </p>
            <Link
              to="/listing"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              View Listings
            </Link>
          </section>
        </article>
      </main>
    </>
  );
};

SeoStaticPageLayout.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  canonicalPath: PropTypes.string.isRequired,
  breadcrumbLabel: PropTypes.string.isRequired,
  introParagraphs: PropTypes.arrayOf(PropTypes.string).isRequired,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      heading: PropTypes.string.isRequired,
      paragraphs: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
  faqs: PropTypes.arrayOf(
    PropTypes.shape({
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ).isRequired,
  relatedLinks: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
};

export default SeoStaticPageLayout;
