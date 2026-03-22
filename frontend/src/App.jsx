import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query"
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"
import { lazy, Suspense, useState, useEffect } from "react";
import UserDetailContext from "./context/UserDetailContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import ScrollToTop from "./components/ScrollToTop";
import RouteSeo from "./components/RouteSeo";
import {
  DEFAULT_LANGUAGE_CODE,
  extractLanguageFromPath,
} from "./utils/languageRouting";

const Home = lazy(() => import("./pages/seo/HomeSeoPage"));
const HomePage = lazy(() => import("./pages/Home"));
const Listing = lazy(() => import("./pages/seo/ListingSeoPage"));
const Property = lazy(() => import("./pages/seo/PropertySeoPage"));
const AddProperty = lazy(() => import("./pages/AddProperty"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Consultants = lazy(() => import("./pages/Consultants"));
const TodayProperties = lazy(() => import("./pages/TodayProperties"));
const BlogsPage = lazy(() => import("./pages/Blogs"));
const CountryBlogs = lazy(() => import("./pages/CountryBlogs"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Addresses = lazy(() => import("./pages/Addresses"));
const LocalProjects = lazy(() => import("./pages/LocalProjects"));
const ProjectDetail = lazy(() => import("./pages/seo/ProjectDetailSeoPage"));
const TestimonialsTest = lazy(() => import("./pages/TestimonialsTest"));
const Favourites = lazy(() => import("./pages/Favourites"));
const Bookings = lazy(() => import("./pages/Bookings"));
const IstanbulApartments = lazy(() => import("./pages/IstanbulApartments"));
const KyreniaApartments = lazy(() => import("./pages/KyreniaApartments"));
const TurkeyPropertyInvestment = lazy(() => import("./pages/TurkeyPropertyInvestment"));
const TurkishCitizenshipProperty = lazy(() => import("./pages/TurkishCitizenshipProperty"));
const InvestmentOpportunitiesBlogs = lazy(
  () => import("./pages/InvestmentOpportunitiesBlogs")
);

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("react-query/devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      }))
    )
  : () => null;

export default function App() {
  const getPathLanguage = () =>
    extractLanguageFromPath(window.location.pathname) || DEFAULT_LANGUAGE_CODE;
  const [routerLanguage, setRouterLanguage] = useState(getPathLanguage);
  const routerBasename = `/${routerLanguage}`;

  const [queryClient] = useState(() => new QueryClient());
  const [userDetails, setUserDetails] = useState({
    favourites: [],
    bookings: [],
    token: null
  })

  // Scroll to top on initial load and disable browser scroll restoration
  useEffect(() => {
    // Disable automatic scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    // Scroll to top
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const syncRouterLanguage = () => {
      const nextLanguage = getPathLanguage();
      setRouterLanguage((prevLanguage) =>
        prevLanguage === nextLanguage ? prevLanguage : nextLanguage
      );
    };

    window.addEventListener("popstate", syncRouterLanguage);
    window.addEventListener("app:language-path-change", syncRouterLanguage);

    return () => {
      window.removeEventListener("popstate", syncRouterLanguage);
      window.removeEventListener("app:language-path-change", syncRouterLanguage);
    };
  }, []);

  return (
    <UserDetailContext.Provider value={{ userDetails, setUserDetails }}>
      <CurrencyProvider>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter key={routerLanguage} basename={routerBasename}>
              <ScrollToTop />
              <RouteSeo />
              <Suspense fallback={null}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/contact" element={<HomePage />} />
                    <Route path="/listing" >
                      <Route index element={<Listing />} />
                      <Route path=":propertyId" element={<Property />} />
                    </Route>
                    <Route
                      path="/addproperty"
                      element={
                        <RequireAuth>
                          <AddProperty />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <RequireAuth>
                          <AdminPanel />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/bookings"
                      element={
                        <RequireAuth>
                          <Bookings />
                        </RequireAuth>
                      }
                    />
                    <Route
                      path="/favourites"
                      element={
                        <RequireAuth>
                          <Favourites />
                        </RequireAuth>
                      }
                    />
                    <Route path="/consultants" element={<Consultants />} />
                    <Route path="/today" element={<TodayProperties />} />
                    <Route path="/blogs" element={<BlogsPage />} />
                    <Route path="/blogs/:countrySlug" element={<CountryBlogs />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/testimonials-test" element={<TestimonialsTest />} />
                    <Route path="/addresses" element={<Addresses />} />
                    <Route path="/projects" element={<LocalProjects />} />
                    <Route path="/projects/:projectSlugOrId" element={<ProjectDetail />} />
                    <Route path="/istanbul-apartments" element={<IstanbulApartments />} />
                    <Route path="/kyrenia-apartments" element={<KyreniaApartments />} />
                    <Route path="/turkey-property-investment" element={<TurkeyPropertyInvestment />} />
                    <Route path="/turkish-citizenship-property" element={<TurkishCitizenshipProperty />} />
                    <Route
                      path="/investment-opportunities"
                      element={<InvestmentOpportunitiesBlogs />}
                    />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          <ToastContainer />
          {import.meta.env.DEV && (
            <Suspense fallback={null}>
              <ReactQueryDevtools initialIsOpen={false} />
            </Suspense>
          )}
        </QueryClientProvider>
      </CurrencyProvider>
    </UserDetailContext.Provider>
  )
}
