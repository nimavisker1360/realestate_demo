import { useTranslation } from 'react-i18next';
import { useLocation } from "react-router-dom";
import { buildLocalizedPath, normalizeLanguageCode } from "../utils/languageRouting";

const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const currentLang = normalizeLanguageCode(i18n.language);
  
  // Handles locale variants like 'en-US', 'tr-TR', 'ru-RU'
  const isEnglish = currentLang.startsWith('en');
  const isTurkish = currentLang.startsWith('tr');
  const isRussian = currentLang.startsWith('ru');

  const handleLanguageChange = (langCode) => {
    const normalizedTargetLanguage = normalizeLanguageCode(langCode);
    if (normalizedTargetLanguage === currentLang) return;

    const searchParams = new URLSearchParams(location.search || "");
    ["code", "state", "error", "error_description"].forEach((key) =>
      searchParams.delete(key)
    );
    const sanitizedSearch = searchParams.toString();

    window.localStorage.setItem("i18nextLng", normalizedTargetLanguage);
    window.sessionStorage.setItem(
      "suppress_auto_login_prompt_until",
      String(Date.now() + 12 * 1000)
    );
    void i18n.changeLanguage(normalizedTargetLanguage);

    const targetPath = buildLocalizedPath({
      pathname: location.pathname,
      search: sanitizedSearch ? `?${sanitizedSearch}` : "",
      hash: location.hash,
      language: normalizedTargetLanguage,
    });

    window.history.pushState(window.history.state, "", targetPath);
    window.dispatchEvent(new Event("app:language-path-change"));
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div className={`flex items-center gap-2 text-xs font-semibold ${className}`}>
      <button
        onClick={() => handleLanguageChange('en')}
        className={`transition-colors ${
          isEnglish ? 'text-secondaryRed' : 'text-gray-700 hover:text-secondaryRed'
        }`}
        type="button"
      >
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => handleLanguageChange('tr')}
        className={`transition-colors ${
          isTurkish ? 'text-secondaryRed' : 'text-gray-700 hover:text-secondaryRed'
        }`}
        type="button"
      >
        TR
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => handleLanguageChange('ru')}
        className={`transition-colors ${
          isRussian ? 'text-secondaryRed' : 'text-gray-700 hover:text-secondaryRed'
        }`}
        type="button"
      >
        RU
      </button>
    </div>
  );
};

export default LanguageSwitcher;
