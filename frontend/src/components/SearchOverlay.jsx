import { useEffect, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MdClose, MdSearch } from "react-icons/md";
import useProperties from "../hooks/useProperties";
import CurrencyContext from "../context/CurrencyContext";

const SearchOverlay = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const { data: properties, isLoading } = useProperties();
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setFilteredResults([]);
    setShowResults(false);
  }, [isOpen]);

  useEffect(() => {
    if (query.trim() && properties) {
      const filtered = properties.filter(
        (property) =>
          property.propertyType !== "local-project" &&
          property.propertyType !== "international-project" &&
          (property.title.toLowerCase().includes(query.toLowerCase()) ||
            property.city.toLowerCase().includes(query.toLowerCase()) ||
            property.country.toLowerCase().includes(query.toLowerCase()) ||
            property.address.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredResults(filtered);
      setShowResults(true);
    } else {
      setFilteredResults([]);
      setShowResults(false);
    }
  }, [query, properties]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const getFallbackQuery = () => {
    if (typeof window === "undefined") return "";
    const saved = localStorage.getItem("heroActiveTab");
    if (!saved || saved === "ALL") return "";
    return saved;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    const fallbackQuery = getFallbackQuery();
    const finalQuery = trimmedQuery || fallbackQuery;
    if (!finalQuery) return;
    navigate(`/listing?search=${encodeURIComponent(finalQuery)}`);
    onClose();
  };

  const handleResultClick = (property) => {
    setShowResults(false);
    setQuery("");
    navigate(`/listing?search=${encodeURIComponent(property.title)}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-md flex items-start justify-center px-4 pt-28"
      onClick={onClose}
    >
      <div className="w-full max-w-[760px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end mb-4 text-white">
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-white/30 flex items-center justify-center text-white/90 hover:text-white hover:border-white/60 transition"
            aria-label={t("common.close")}
          >
            <MdClose size={18} />
          </button>
        </div>

        <div ref={searchRef} className="relative">
          <form
            onSubmit={handleSubmit}
            className="flex items-center bg-white rounded-full shadow-[0_20px_45px_rgba(15,23,42,0.35)]"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim() && setShowResults(true)}
              placeholder={t("hero.searchPlaceholder")}
              className="flex-1 rounded-full border-none py-3.5 px-6 text-sm sm:text-base text-gray-800 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="w-11 h-11 mr-1 rounded-full bg-[#06a84e] flex items-center justify-center text-white text-sm transition hover:bg-[#058a41]"
            >
              <MdSearch size={20} />
            </button>
          </form>

          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[420px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  {t("common.loading")}
                </div>
              ) : filteredResults.length > 0 ? (
                <ul>
                  {filteredResults.map((property) => (
                    <li
                      key={property.id}
                      onClick={() => handleResultClick(property)}
                      className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer transition border-b border-gray-100 last:border-b-0"
                    >
                      <img
                        src={property.image}
                        alt={property.title}
                        className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-sm font-semibold text-gray-800 truncate">
                          {property.title}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {property.city}, {property.country}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-[#06a84e] flex-shrink-0">
                        {formatMoney(
                          convertAmount(
                            property.price,
                            property.currency || baseCurrency,
                            selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
                              ? selectedCurrency
                              : baseCurrency
                          ),
                          selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
                            ? selectedCurrency
                            : baseCurrency,
                          i18n.language === "tr" ? "tr-TR" : "en-US"
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No properties found for &ldquo;{query}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
