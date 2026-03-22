import { useQuery } from "react-query";
import { getAllTestimonials } from "../utils/api";

const useTestimonials = (options = {}) => {
  const { data, isLoading, isError, refetch } = useQuery(
    "allTestimonials",
    getAllTestimonials,
    { refetchOnWindowFocus: false, ...options }
  );

  return { data, isLoading, isError, refetch };
};

export default useTestimonials;
