import { useQuery } from "react-query";
import { getAllConsultants } from "../utils/api";

const useConsultants = () => {
  const { data, isLoading, isError, refetch } = useQuery(
    "allConsultants",
    getAllConsultants,
    { refetchOnWindowFocus: false }
  );

  return {
    data,
    isError,
    isLoading,
    refetch,
  };
};

export default useConsultants;
