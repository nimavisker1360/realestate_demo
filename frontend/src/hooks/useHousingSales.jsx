import { useQuery } from "react-query";
import {
  getHousingSalesSummary,
  getHousingSalesByProvince,
  getHousingSalesByDistrict,
  getHousingProvinces,
  getHousingYears,
  getTurkeyStats,
} from "../utils/api";

// Hook to fetch housing sales summary
export const useHousingSalesSummary = (province, year) => {
  return useQuery(
    ["housingSalesSummary", province, year],
    () => getHousingSalesSummary(province, year),
    {
      staleTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );
};

// Hook to fetch housing sales by province
export const useHousingSalesByProvince = (year) => {
  return useQuery(
    ["housingSalesByProvince", year],
    () => getHousingSalesByProvince(year),
    {
      staleTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    }
  );
};

// Hook to fetch housing sales by district
export const useHousingSalesByDistrict = (province, year) => {
  return useQuery(
    ["housingSalesByDistrict", province, year],
    () => getHousingSalesByDistrict(province, year),
    {
      enabled: !!province,
      staleTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    }
  );
};

// Hook to fetch provinces list
export const useHousingProvinces = () => {
  return useQuery(
    ["housingProvinces"],
    getHousingProvinces,
    {
      staleTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
    }
  );
};

// Hook to fetch years list
export const useHousingYears = () => {
  return useQuery(
    ["housingYears"],
    getHousingYears,
    {
      staleTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
    }
  );
};

// Hook to fetch Turkey stats
export const useTurkeyStats = (province, year) => {
  return useQuery(
    ["turkeyStats", province, year],
    () => getTurkeyStats(province, year),
    {
      staleTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    }
  );
};

export default useHousingSalesSummary;
