import { useContext } from "react";
import UserDetailContext from "../context/UserDetailContext";
import { useQuery } from "react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { getAllFav } from "../utils/api";

const useFavourites = () => {
  const { userDetails, setUserDetails } = useContext(UserDetailContext);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();

  const canFetchFavourites =
    isAuthenticated && !!user?.email && !!userDetails?.token && !authLoading;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["allFavourites", user?.email, userDetails?.token],
    queryFn: () => getAllFav(user.email, userDetails.token),
    onSuccess: (favourites) =>
      setUserDetails((prev) => ({
        ...prev,
        favourites: Array.isArray(favourites) ? favourites : [],
      })),
    enabled: canFetchFavourites,
    staleTime: 30000,
    retry: false,
  });

  return { data, isError, isLoading, refetch };
};

export default useFavourites;
