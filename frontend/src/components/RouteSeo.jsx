import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import SEO from "./SEO";

const NOINDEX_PREFIXES = [
  "/admin",
  "/addproperty",
  "/bookings",
  "/favourites",
  "/testimonials-test",
];

const RouteSeo = () => {
  const location = useLocation();
  const pathname = location.pathname || "/";

  const config = useMemo(() => {
    const isNoIndex = NOINDEX_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isNoIndex) {
      return {
        title: "demo",
        description:
          "Internal dashboard page for demo.",
        canonicalPath: pathname,
        noindex: true,
      };
    }

    const hasDedicatedSeo =
      pathname === "/" ||
      pathname === "/listing" ||
      pathname.startsWith("/listing/") ||
      pathname.startsWith("/projects/") ||
      pathname === "/blogs" ||
      pathname.startsWith("/blogs/") ||
      pathname.startsWith("/blog/") ||
      pathname === "/istanbul-apartments" ||
      pathname === "/kyrenia-apartments" ||
      pathname === "/investment-opportunities" ||
      pathname === "/turkey-property-investment" ||
      pathname === "/turkish-citizenship-property";

    if (hasDedicatedSeo) {
      return null;
    }

    if (pathname === "/projects") {
      return {
        title: "Real Estate Projects | demo",
        description:
          "Discover curated local and international real estate projects with pricing and availability details.",
        canonicalPath: "/projects",
      };
    }

    if (pathname.startsWith("/projects/")) {
      return {
        title: "Project Detail | demo",
        description:
          "Review project details, amenities, location insights, and contact options.",
        canonicalPath: pathname,
      };
    }

    if (pathname === "/consultants") {
      return {
        title: "Real Estate Consultants | demo",
        description:
          "Connect with multilingual real estate consultants for investment planning and property support.",
        canonicalPath: "/consultants",
      };
    }

    if (pathname === "/contact") {
      return {
        title: "Contact Us | demo",
        description:
          "Send a message to demo and connect with our consultants for property support.",
        canonicalPath: "/contact",
      };
    }

    if (pathname === "/addresses") {
      return {
        title: "Our Office Addresses | demo",
        description:
          "Find office addresses and contact points for demo.",
        canonicalPath: "/addresses",
      };
    }

    if (pathname === "/today") {
      return {
        title: "Today's Price List | demo",
        description:
          "Track current property pricing updates and featured opportunities from demo.",
        canonicalPath: "/today",
      };
    }

    return {
      canonicalPath: pathname,
    };
  }, [pathname]);

  if (!config) return null;
  return <SEO {...config} />;
};

export default RouteSeo;
