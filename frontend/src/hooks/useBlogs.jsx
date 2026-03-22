import { useQuery } from "react-query";
import { getAllBlogs } from "../utils/api";

const useBlogs = () => {
  const { data, isLoading, isError, refetch } = useQuery(
    "allBlogs",
    getAllBlogs,
    { refetchOnWindowFocus: false }
  );

  return { data, isLoading, isError, refetch };
};

export default useBlogs;
