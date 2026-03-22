import { FaLocationDot } from "react-icons/fa6";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";

const Searchbar = ({ filter, setFilter }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flexBetween pl-4 sm:pl-6 h-[3rem] sm:h-[3.5rem] bg-white w-full max-w-full sm:max-w-[600px] mx-auto rounded-full ring-1 ring-slate-500/5 shadow-lg">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t("listing.searchPlaceholder")}
        className="bg-transparent border-none outline-none w-full text-sm sm:text-base"
      />
      <FaLocationDot className="relative right-3 sm:right-4 text-lg sm:text-xl hover:text-secondary flex-shrink-0" />
    </div>
  );
};

Searchbar.propTypes = {
  filter: PropTypes.string.isRequired,
  setFilter: PropTypes.func.isRequired,
};

export default Searchbar;
