import { useContext } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import PropTypes from "prop-types";
import useAuthCheck from "../hooks/useAuthCheck";
import { useMutation } from "react-query";
import { useAuth0 } from "@auth0/auth0-react";
import UserDetailContext from "../context/UserDetailContext";
import { toFav } from "../utils/api";
import { updateFavourites } from "../utils/common";

const HeartBtn = ({ id }) => {
  const { validateLogin } = useAuthCheck();
  const { user } = useAuth0();

  const {
    userDetails: { favourites, token },
    setUserDetails,
  } = useContext(UserDetailContext);

  const { mutate } = useMutation({
    mutationFn: () => toFav(id, user?.email, token),
    onSuccess: () => {
      setUserDetails((prev) => ({
        ...prev,
        favourites: updateFavourites(id, prev.favourites),
      }));
    },
  });

  const handleLike = () => {
    if (validateLogin()) {
      mutate();
    }
  };

  const isFavourite = favourites?.includes(id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleLike();
      }}
      className="group inline-flex items-center justify-center cursor-pointer drop-shadow-sm"
      aria-pressed={isFavourite}
    >
      {isFavourite ? (
        <FaHeart className="w-[23px] h-[23px] text-red-500" />
      ) : (
        <span className="relative inline-flex w-[23px] h-[23px]">
          <FaRegHeart className="w-[23px] h-[23px] text-gray-400 transition-opacity duration-150 group-hover:opacity-0" />
          <FaHeart className="w-[23px] h-[23px] text-emerald-600 absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        </span>
      )}
    </button>
  );
};

HeartBtn.propTypes = {
  id: PropTypes.string.isRequired,
};

export default HeartBtn;
