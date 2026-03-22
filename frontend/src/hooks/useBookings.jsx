import { useContext } from "react";
import UserDetailContext from "../context/UserDetailContext";
import { useQuery } from "react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { getAllBookings } from "../utils/api";

const useBookings = () => {
  const { userDetails, setUserDetails } = useContext(UserDetailContext);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();

  const canFetchBookings =
    isAuthenticated && !!user?.email && !!userDetails?.token && !authLoading;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["allBookings", user?.email, userDetails?.token],
    queryFn: () => getAllBookings(user.email, userDetails.token),
    onSuccess: (bookings) =>
      setUserDetails((prev) => ({
        ...prev,
        bookings: Array.isArray(bookings) ? bookings : [],
      })),
    enabled: canFetchBookings,
    staleTime: 30000,
    retry: false,
  });
  
  return { data, isError, isLoading, refetch };
};

export default useBookings;
