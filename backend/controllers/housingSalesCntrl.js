import asyncHandler from "express-async-handler";
import { prisma } from "../config/prismaConfig.js";

// Get housing sales summary (for charts)
export const getHousingSalesSummary = asyncHandler(async (req, res) => {
  try {
    const { province, year } = req.query;

    // Build filter
    const where = {};
    if (province) where.province = province;
    if (year) where.year = parseInt(year);

    // Get monthly/yearly totals grouped by year
    const yearlyData = await prisma.housingSales.groupBy({
      by: ['year'],
      where,
      _sum: {
        totalSales: true,
        mortgagedSales: true,
        otherSales: true,
        firstHandSales: true,
        secondHandSales: true,
      },
      orderBy: { year: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: yearlyData.map(item => ({
        year: item.year,
        totalSales: item._sum.totalSales,
        mortgagedSales: item._sum.mortgagedSales,
        otherSales: item._sum.otherSales,
        firstHandSales: item._sum.firstHandSales,
        secondHandSales: item._sum.secondHandSales,
      })),
    });
  } catch (error) {
    console.error("Error fetching housing sales summary:", error);
    res.status(500).json({ message: "Error fetching housing sales data" });
  }
});

// Get housing sales by province (for specific province analysis)
export const getHousingSalesByProvince = asyncHandler(async (req, res) => {
  try {
    const { year } = req.query;

    const where = {};
    if (year) where.year = parseInt(year);

    // Group by province
    const provinceData = await prisma.housingSales.groupBy({
      by: ['province'],
      where,
      _sum: {
        totalSales: true,
        mortgagedSales: true,
        firstHandSales: true,
        secondHandSales: true,
      },
      orderBy: {
        _sum: { totalSales: 'desc' },
      },
      take: 20, // Top 20 provinces
    });

    res.status(200).json({
      success: true,
      data: provinceData.map(item => ({
        province: item.province,
        totalSales: item._sum.totalSales,
        mortgagedSales: item._sum.mortgagedSales,
        firstHandSales: item._sum.firstHandSales,
        secondHandSales: item._sum.secondHandSales,
      })),
    });
  } catch (error) {
    console.error("Error fetching housing sales by province:", error);
    res.status(500).json({ message: "Error fetching housing sales data" });
  }
});

// Get housing sales by district (for specific district analysis)
export const getHousingSalesByDistrict = asyncHandler(async (req, res) => {
  try {
    const { province, year } = req.query;

    if (!province) {
      return res.status(400).json({ message: "Province is required" });
    }

    const where = { province };
    if (year) where.year = parseInt(year);

    // Group by district
    const districtData = await prisma.housingSales.groupBy({
      by: ['district'],
      where,
      _sum: {
        totalSales: true,
        mortgagedSales: true,
        firstHandSales: true,
        secondHandSales: true,
      },
      orderBy: {
        _sum: { totalSales: 'desc' },
      },
    });

    res.status(200).json({
      success: true,
      data: districtData.map(item => ({
        district: item.district,
        totalSales: item._sum.totalSales,
        mortgagedSales: item._sum.mortgagedSales,
        firstHandSales: item._sum.firstHandSales,
        secondHandSales: item._sum.secondHandSales,
      })),
    });
  } catch (error) {
    console.error("Error fetching housing sales by district:", error);
    res.status(500).json({ message: "Error fetching housing sales data" });
  }
});

// Get list of provinces
export const getProvinces = asyncHandler(async (req, res) => {
  try {
    const provinces = await prisma.housingSales.findMany({
      distinct: ['province'],
      select: { province: true },
      orderBy: { province: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: provinces.map(p => p.province),
    });
  } catch (error) {
    console.error("Error fetching provinces:", error);
    res.status(500).json({ message: "Error fetching provinces" });
  }
});

// Get list of years
export const getYears = asyncHandler(async (req, res) => {
  try {
    const years = await prisma.housingSales.findMany({
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: years.map(y => y.year),
    });
  } catch (error) {
    console.error("Error fetching years:", error);
    res.status(500).json({ message: "Error fetching years" });
  }
});

// Get Turkey total stats (for dashboard)
export const getTurkeyStats = asyncHandler(async (req, res) => {
  try {
    const { province, year } = req.query;
    
    // Build base filter
    const baseWhere = {};
    if (province) baseWhere.province = province;

    // Get available years for filtering
    const availableYears = await prisma.housingSales.findMany({
      distinct: ['year'],
      select: { year: true },
      where: baseWhere,
      orderBy: { year: 'desc' },
    });

    // Determine current and previous year
    let currentYear, previousYear;
    
    if (year) {
      currentYear = parseInt(year);
      // Find previous year from available years
      const yearIndex = availableYears.findIndex(y => y.year === currentYear);
      previousYear = yearIndex >= 0 && yearIndex < availableYears.length - 1 
        ? availableYears[yearIndex + 1]?.year 
        : currentYear - 1;
    } else {
      currentYear = availableYears[0]?.year;
      previousYear = availableYears[1]?.year;
    }

    // Current year totals
    const currentYearWhere = { year: currentYear };
    if (province) currentYearWhere.province = province;
    
    const currentYearData = await prisma.housingSales.aggregate({
      where: currentYearWhere,
      _sum: {
        totalSales: true,
        mortgagedSales: true,
        otherSales: true,
        firstHandSales: true,
        secondHandSales: true,
      },
    });

    // Previous year totals
    const previousYearWhere = { year: previousYear };
    if (province) previousYearWhere.province = province;
    
    const previousYearData = await prisma.housingSales.aggregate({
      where: previousYearWhere,
      _sum: {
        totalSales: true,
        mortgagedSales: true,
        otherSales: true,
        firstHandSales: true,
        secondHandSales: true,
      },
    });

    // Calculate percentage changes
    const calcChange = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    res.status(200).json({
      success: true,
      data: {
        currentYear,
        previousYear,
        province: province || "Turkey",
        // Current year values
        totalSales: currentYearData._sum.totalSales,
        mortgagedSales: currentYearData._sum.mortgagedSales,
        otherSales: currentYearData._sum.otherSales,
        firstHandSales: currentYearData._sum.firstHandSales,
        secondHandSales: currentYearData._sum.secondHandSales,
        // Previous year values (for comparison table)
        previousTotalSales: previousYearData._sum.totalSales,
        previousMortgagedSales: previousYearData._sum.mortgagedSales,
        previousOtherSales: previousYearData._sum.otherSales,
        previousFirstHandSales: previousYearData._sum.firstHandSales,
        previousSecondHandSales: previousYearData._sum.secondHandSales,
        // Percentage changes
        changes: {
          totalSales: calcChange(
            currentYearData._sum.totalSales,
            previousYearData._sum.totalSales
          ),
          mortgagedSales: calcChange(
            currentYearData._sum.mortgagedSales,
            previousYearData._sum.mortgagedSales
          ),
          otherSales: calcChange(
            currentYearData._sum.otherSales,
            previousYearData._sum.otherSales
          ),
          firstHandSales: calcChange(
            currentYearData._sum.firstHandSales,
            previousYearData._sum.firstHandSales
          ),
          secondHandSales: calcChange(
            currentYearData._sum.secondHandSales,
            previousYearData._sum.secondHandSales
          ),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching Turkey stats:", error);
    res.status(500).json({ message: "Error fetching stats" });
  }
});
