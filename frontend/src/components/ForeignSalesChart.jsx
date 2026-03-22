import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Select, Paper, Text } from "@mantine/core";
import { MdPrint } from "react-icons/md";
import foreignSalesData from "../data/foreignSalesData.json";

const formatNumber = (num) => {
  if (!num) return "0";
  return num.toLocaleString().replace(/,/g, " ");
};

const ForeignSalesChart = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "tr" ? "tr" : "en";
  
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("Aralık");

  // Get country name based on language
  const getCountryName = (country) => {
    return currentLang === "tr" ? country.name_tr : country.name_en;
  };

  // Prepare data for top 10 countries by selected year/month
  const topCountriesData = useMemo(() => {
    // For 2025, use monthly data if available
    if (selectedYear === "2025") {
      const dataForMonth = foreignSalesData.countries
        .filter(c => c.id !== "other")
        .map(country => ({
          name: getCountryName(country),
          sales: country.monthlyData2025?.[selectedMonth] || 0,
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);
      return dataForMonth;
    }
    
    // For other years, use yearly data
    const dataForYear = foreignSalesData.countries
      .filter(c => c.id !== "other")
      .map(country => ({
        name: getCountryName(country),
        sales: country.yearlyData[selectedYear] || 0,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
    
    return dataForYear;
  }, [selectedYear, selectedMonth, currentLang]);

  // Check if monthly data is available for selected year
  const hasMonthlyData = selectedYear === "2025";

  // Prepare yearly data for line chart
  const yearlyTotalsData = useMemo(() => {
    return foreignSalesData.years.map(year => ({
      year: year.toString(),
      total: foreignSalesData.totals[year.toString()] || 0,
    }));
  }, []);

  // Prepare top countries yearly comparison
  const topCountriesYearlyData = useMemo(() => {
    const topCountryIds = ["russia", "iran", "ukraine", "iraq", "azerbaijan"];
    return foreignSalesData.years.map(year => {
      const dataPoint = { year: year.toString() };
      topCountryIds.forEach(id => {
        const country = foreignSalesData.countries.find(c => c.id === id);
        if (country) {
          dataPoint[id] = country.yearlyData[year.toString()] || 0;
        }
      });
      return dataPoint;
    });
  }, []);

  // Get top 3 countries for current year
  const topThreeCountries = useMemo(() => {
    return foreignSalesData.countries
      .filter(c => c.id !== "other")
      .map(country => ({
        name: getCountryName(country),
        sales: country.yearlyData[selectedYear] || 0,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3);
  }, [selectedYear, currentLang]);

  // Calculate year over year change
  const yearOverYearChange = useMemo(() => {
    const currentTotal = foreignSalesData.totals[selectedYear] || 0;
    const previousYear = (parseInt(selectedYear) - 1).toString();
    const previousTotal = foreignSalesData.totals[previousYear] || 0;
    if (previousTotal === 0) return 0;
    return (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1);
  }, [selectedYear]);

  const colors = ["#5b9bd5", "#ed7d31", "#a5a5a5", "#ffc000", "#4472c4", "#70ad47", "#9e480e", "#997300", "#636363", "#255e91"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Paper p="lg" radius="md" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-white">
            {foreignSalesData.title[currentLang]}
          </h2>
          <button 
            onClick={() => window.print()}
            className="text-slate-400 hover:text-white p-2"
          >
            <MdPrint size={24} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="space-y-4">
          <p className="text-lg font-semibold text-white">
            {currentLang === "tr" 
              ? `${selectedYear} yılında toplam ${formatNumber(foreignSalesData.totals[selectedYear])} konut yabancılara satıldı.`
              : `In ${selectedYear}, a total of ${formatNumber(foreignSalesData.totals[selectedYear])} housing units were sold to foreigners.`
            }
          </p>
          
          <p className="text-slate-300 leading-relaxed">
            {foreignSalesData.description[currentLang]}
          </p>

          {/* Top 3 Countries */}
          <div className="flex flex-wrap gap-4 mt-4">
            {topThreeCountries.map((country, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'}`}>
                  {index + 1}.
                </span>
                <span className="text-cyan-400 font-semibold">{country.name}</span>
                <span className="text-white">({formatNumber(country.sales)})</span>
              </div>
            ))}
          </div>
        </div>
      </Paper>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-end">
        <Select
          label={currentLang === "tr" ? "Yıl" : "Year"}
          data={foreignSalesData.years.map(y => ({ value: y.toString(), label: y.toString() }))}
          value={selectedYear}
          onChange={setSelectedYear}
          className="w-32"
        />
        {hasMonthlyData && (
          <Select
            label={currentLang === "tr" ? "Ay" : "Month"}
            data={foreignSalesData.months.map(m => ({ value: m, label: m }))}
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="w-40"
          />
        )}
        {!hasMonthlyData && (
          <p className="text-sm text-slate-400 pb-2">
            {currentLang === "tr" 
              ? "(Aylık veri sadece 2025 için mevcuttur)" 
              : "(Monthly data only available for 2025)"}
          </p>
        )}
      </div>

      {/* Top 10 Horizontal Bar Chart */}
      <Paper p="lg" radius="md" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">
          {currentLang === "tr" 
            ? `Uyruklara göre konut satışı, ilk 10 ülke, ${hasMonthlyData ? `${selectedMonth} ` : ''}${selectedYear}`
            : `Housing sales by nationality, top 10 countries, ${hasMonthlyData ? `${selectedMonth} ` : ''}${selectedYear}`
          }
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {currentLang === "tr" 
            ? (hasMonthlyData ? "Aylık satış sayısı" : "Yıllık satış sayısı") 
            : (hasMonthlyData ? "Monthly sales" : "Yearly sales")}
        </p>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={topCountriesData}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={false}
              domain={[0, 'auto']}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fontSize: 12, fill: "#374151" }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip 
              formatter={(value) => [formatNumber(value), currentLang === "tr" ? "Satış" : "Sales"]}
              contentStyle={{ 
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            />
            <Bar 
              dataKey="sales" 
              fill="#5b9bd5"
              radius={[0, 4, 4, 0]}
            >
              <LabelList 
                dataKey="sales" 
                position="right"
                formatter={(value) => formatNumber(value)}
                style={{ fontSize: 12, fill: "#374151", fontWeight: 600 }}
              />
              {topCountriesData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Yearly Totals Bar Chart */}
      <Paper p="lg" radius="md" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-lg font-bold text-white mb-1">
          {currentLang === "tr" 
            ? "Yabancılara yapılan toplam konut satışları, 2015-2025"
            : "Total housing sales to foreigners, 2015-2025"
          }
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          {currentLang === "tr" ? "Toplam satış sayısı" : "Total number of sales"}
        </p>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart 
            data={yearlyTotalsData} 
            margin={{ top: 30, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#475569" 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
              tickLine={false}
            />
            <YAxis 
              tickFormatter={(value) => formatNumber(value)}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
            <Tooltip 
              formatter={(value) => [formatNumber(value), currentLang === "tr" ? "Toplam Satış" : "Total Sales"]}
              contentStyle={{ 
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
                color: "#fff"
              }}
            />
            <Bar 
              dataKey="total" 
              fill="#5b9bd5"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            >
              <LabelList 
                dataKey="total" 
                position="top"
                formatter={(value) => formatNumber(value)}
                style={{ fontSize: 10, fill: "#ffffff", fontWeight: 700 }}
              />
              {yearlyTotalsData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.year === selectedYear ? "#2563eb" : "#5b9bd5"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Top 5 Countries Yearly Trend */}
      <Paper p="lg" radius="md" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-lg font-bold text-white mb-1">
          {currentLang === "tr" 
            ? "İlk 5 ülkenin yıllık konut satış trendi"
            : "Yearly housing sales trend for top 5 countries"
          }
        </h3>
        <p className="text-sm text-slate-400 mb-6">2015-2025</p>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart 
            data={topCountriesYearlyData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
            />
            <YAxis 
              tickFormatter={(value) => (value / 1000).toFixed(0) + "K"}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
            />
            <Tooltip 
              formatter={(value, name) => {
                const country = foreignSalesData.countries.find(c => c.id === name);
                const countryName = country ? getCountryName(country) : name;
                return [formatNumber(value), countryName];
              }}
              contentStyle={{ 
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
                color: "#fff"
              }}
            />
            <Legend 
              formatter={(value) => {
                const country = foreignSalesData.countries.find(c => c.id === value);
                return country ? getCountryName(country) : value;
              }}
              wrapperStyle={{ color: "#94a3b8" }}
            />
            <Line type="monotone" dataKey="russia" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="iran" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="ukraine" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="iraq" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="azerbaijan" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #3b82f6' }}>
          <p className="text-sm text-blue-400 mb-1 font-medium">
            {currentLang === "tr" ? `Toplam Satış (${selectedYear})` : `Total Sales (${selectedYear})`}
          </p>
          <p className="text-2xl font-bold text-white">{formatNumber(foreignSalesData.totals[selectedYear])}</p>
          <p className={`text-sm mt-1 font-semibold ${parseFloat(yearOverYearChange) >= 0 ? "text-green-400" : "text-red-400"}`}>
            {parseFloat(yearOverYearChange) >= 0 ? "+" : ""}{yearOverYearChange}% vs {parseInt(selectedYear) - 1}
          </p>
        </Paper>
        
        <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #ef4444' }}>
          <p className="text-sm text-red-400 mb-1 font-medium">
            {currentLang === "tr" ? "1. Rusya Fed." : "1. Russian Fed."}
          </p>
          <p className="text-2xl font-bold text-white">
            {formatNumber(foreignSalesData.countries.find(c => c.id === "russia")?.yearlyData[selectedYear])}
          </p>
        </Paper>
        
        <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #22c55e' }}>
          <p className="text-sm text-green-400 mb-1 font-medium">
            {currentLang === "tr" ? "2. İran" : "2. Iran"}
          </p>
          <p className="text-2xl font-bold text-white">
            {formatNumber(foreignSalesData.countries.find(c => c.id === "iran")?.yearlyData[selectedYear])}
          </p>
        </Paper>
        
        <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #f59e0b' }}>
          <p className="text-sm text-amber-400 mb-1 font-medium">
            {currentLang === "tr" ? "3. Ukrayna" : "3. Ukraine"}
          </p>
          <p className="text-2xl font-bold text-white">
            {formatNumber(foreignSalesData.countries.find(c => c.id === "ukraine")?.yearlyData[selectedYear])}
          </p>
        </Paper>
      </div>

      {/* Comparison Table */}
      <Paper p="lg" radius="md" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div className="mb-4">
          <p className="text-gray-800 font-semibold text-lg">
            {currentLang === "tr" 
              ? `Ülke Uyruklarına Göre Konut Satışları - ${selectedYear}`
              : `Housing Sales by Nationality - ${selectedYear}`
            }
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 text-gray-700 font-semibold">
                  {currentLang === "tr" ? "Ülke" : "Country"}
                </th>
                <th className="text-center py-3 px-4 text-gray-700 font-semibold">
                  {selectedYear}
                </th>
                <th className="text-center py-3 px-4 text-gray-700 font-semibold">
                  {parseInt(selectedYear) - 1}
                </th>
                <th className="text-center py-3 px-4 text-gray-700 font-semibold">
                  {currentLang === "tr" ? "Değişim" : "Change"}
                </th>
              </tr>
            </thead>
            <tbody>
              {foreignSalesData.countries
                .filter(c => c.id !== "other")
                .sort((a, b) => (b.yearlyData[selectedYear] || 0) - (a.yearlyData[selectedYear] || 0))
                .slice(0, 10)
                .map((country, index) => {
                  const currentSales = country.yearlyData[selectedYear] || 0;
                  const prevYear = (parseInt(selectedYear) - 1).toString();
                  const prevSales = country.yearlyData[prevYear] || 0;
                  const change = prevSales > 0 ? (((currentSales - prevSales) / prevSales) * 100).toFixed(1) : 0;
                  
                  return (
                    <tr key={country.id} className={`border-b border-gray-200 ${index === 0 ? 'bg-blue-50 font-semibold' : ''}`}>
                      <td className="py-3 px-4 text-gray-800">
                        <span className="mr-2 text-gray-400">{index + 1}.</span>
                        {getCountryName(country)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-800">
                        {formatNumber(currentSales)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {formatNumber(prevSales)}
                      </td>
                      <td className={`py-3 px-4 text-center font-medium ${parseFloat(change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(change) >= 0 ? "+" : ""}{change}%
                      </td>
                    </tr>
                  );
                })}
              {/* Total Row */}
              <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                <td className="py-3 px-4 text-gray-800">
                  {currentLang === "tr" ? "TOPLAM" : "TOTAL"}
                </td>
                <td className="py-3 px-4 text-center text-gray-800">
                  {formatNumber(foreignSalesData.totals[selectedYear])}
                </td>
                <td className="py-3 px-4 text-center text-gray-600">
                  {formatNumber(foreignSalesData.totals[(parseInt(selectedYear) - 1).toString()])}
                </td>
                <td className={`py-3 px-4 text-center ${parseFloat(yearOverYearChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(yearOverYearChange) >= 0 ? "+" : ""}{yearOverYearChange}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Paper>

      {/* Data Source */}
      <Text size="xs" className="text-center" style={{ color: '#ffffff' }}>
        {foreignSalesData.source[currentLang]}
      </Text>
    </div>
  );
};

export default ForeignSalesChart;
