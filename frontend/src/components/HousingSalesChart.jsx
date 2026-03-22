import { useState } from "react";
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
} from "recharts";
import { Select, Paper, Text, Loader } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  useHousingSalesSummary,
  useHousingSalesByProvince,
  useHousingProvinces,
  useHousingYears,
  useTurkeyStats,
} from "../hooks/useHousingSales";
import { MdPrint } from "react-icons/md";

const formatNumber = (num) => {
  if (!num) return "0";
  return num.toLocaleString().replace(/,/g, " ");
};

const formatCompactNumber = (num) => {
  if (!num) return "0";
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (num >= 1000) {
    return `${Math.round(num / 1000)}K`;
  }
  return num.toString();
};

const HousingSalesChart = () => {
  const { t } = useTranslation();
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Fetch data
  const { data: provincesData } = useHousingProvinces();
  const { data: yearsData } = useHousingYears();
  const { data: summaryData, isLoading: summaryLoading } = useHousingSalesSummary(
    selectedProvince,
    null
  );
  const { data: provinceData } = useHousingSalesByProvince(selectedYear);
  const { data: turkeyStats, isLoading: statsLoading } = useTurkeyStats(selectedProvince, selectedYear);

  const provinces = provincesData?.data || [];
  const years = yearsData?.data || [];
  const chartData = summaryData?.data || [];
  const topProvinces = provinceData?.data || [];
  const stats = turkeyStats?.data || {};

  // Find highest and lowest provinces
  const highestProvinces = topProvinces.slice(0, 3);
  const lowestProvinces = [...topProvinces].sort((a, b) => a.totalSales - b.totalSales).slice(0, 3);

  // Calculate change percentage
  const changePercent = stats.changes?.totalSales || 0;
  const isIncrease = parseFloat(changePercent) >= 0;

  // Get current year total
  const currentYearData = chartData.find(d => d.year === stats.currentYear);
  const currentYearTotal = currentYearData?.totalSales || stats.totalSales || 0;

  // Custom label for bars
  const renderCustomLabel = ({ x, y, width, value }) => {
    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill="#ffffff"
        textAnchor="middle"
        fontSize={isMobile ? 10 : 12}
        fontWeight={700}
      >
        {formatNumber(value)}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Paper p="lg" radius="md" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-white">
            {t('housingSales.title')}, {stats.currentYear || "2025"}:
          </h2>
          <button 
            onClick={() => window.print()}
            className="text-slate-400 hover:text-white p-2"
          >
            <MdPrint size={24} />
          </button>
        </div>

        {/* Summary Stats */}
        {!statsLoading && stats.currentYear && (
          <div className="space-y-4">
            <p className="text-lg font-semibold text-white">
              {t('housingSales.totalSold', { count: formatNumber(currentYearTotal), location: selectedProvince || "Turkey", year: stats.currentYear })}
            </p>
            
            <p className="text-slate-300 leading-relaxed">
              {selectedProvince || "Turkey"} {isIncrease ? t('housingSales.increased') : t('housingSales.decreased')}{" "}
              <span className={isIncrease ? "text-cyan-400 font-semibold" : "text-red-400 font-semibold"}>
                {Math.abs(changePercent)}%
              </span>{" "}
              {t('housingSales.comparedToPrevious', { year: stats.currentYear })}{" "}
              <span className="text-cyan-400 font-semibold">{formatNumber(currentYearTotal)}</span>.
              {topProvinces.length > 0 && !selectedProvince && (
                <>
                  {" "}{t('housingSales.highestProvinces')}{" "}
                  {highestProvinces.map((p, i) => (
                    <span key={p.province}>
                      <span className="text-cyan-400 font-semibold">{p.province}</span> {t('housingSales.with')}{" "}
                      <span className="text-cyan-400 font-semibold">{formatNumber(p.totalSales)}</span>
                      {i < highestProvinces.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  , {t('housingSales.lowestProvinces')}{" "}
                  {lowestProvinces.map((p, i) => (
                    <span key={p.province}>
                      <span className="text-cyan-400 font-semibold">{p.province}</span> {t('housingSales.with')}{" "}
                      <span className="text-cyan-400 font-semibold">{formatNumber(p.totalSales)}</span>
                      {i < lowestProvinces.length - 1 ? ", " : ""}
                    </span>
                  ))}.
                </>
              )}
            </p>
          </div>
        )}
      </Paper>

      {/* Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Select
          placeholder={t('housingSales.allProvinces')}
          data={provinces.map(p => ({ value: p, label: p }))}
          value={selectedProvince}
          onChange={setSelectedProvince}
          clearable
          searchable
          className="w-full sm:w-48"
        />
        <Select
          placeholder={t('housingSales.allYears')}
          data={years.map(y => ({ value: y.toString(), label: y.toString() }))}
          value={selectedYear?.toString()}
          onChange={(v) => setSelectedYear(v ? parseInt(v) : null)}
          clearable
          className="w-full sm:w-32"
        />
      </div>

      {/* Main Bar Chart */}
      <Paper p={isMobile ? "md" : "lg"} radius="md" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-lg font-bold text-white mb-1">
          {t('housingSales.housingStats')}, {chartData.length > 0 ? `${chartData[0]?.year} - ${chartData[chartData.length - 1]?.year}` : "2015 - 2025"}
        </h3>
        <p className="text-sm text-slate-400 mb-6">{t('housingSales.number')}</p>

        {summaryLoading ? (
          <div className="flex justify-center items-center h-80">
            <Loader color="blue" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 320 : 400}>
            <BarChart 
              data={chartData} 
              margin={{ top: 24, right: isMobile ? 8 : 20, left: isMobile ? 8 : 20, bottom: isMobile ? 8 : 20 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#475569" 
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: isMobile ? 10 : 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#475569" }}
                tickLine={false}
                angle={isMobile ? 0 : -45}
                textAnchor={isMobile ? "middle" : "end"}
                height={isMobile ? 40 : 60}
                interval={isMobile ? 1 : 0}
              />
              <YAxis 
                tickFormatter={(value) => (isMobile ? formatCompactNumber(value) : formatNumber(value))}
                tick={{ fontSize: isMobile ? 10 : 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
                width={isMobile ? 44 : 60}
              />
              <Tooltip 
                formatter={(value) => [formatNumber(value), "Total Sales"]}
                contentStyle={{ 
                  backgroundColor: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  color: "#fff"
                }}
                labelStyle={{ fontWeight: "bold", color: "#fff" }}
              />
              <Bar 
                dataKey="totalSales" 
                fill="#5b9bd5"
                radius={[0, 0, 0, 0]}
                maxBarSize={isMobile ? 36 : 50}
              >
                {!isMobile && (
                  <LabelList 
                    dataKey="totalSales" 
                    content={renderCustomLabel}
                  />
                )}
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.year === stats.currentYear ? "#2563eb" : "#5b9bd5"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* Sales by Type Chart */}
      <Paper p="lg" radius="md" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-lg font-bold text-white mb-1">
          {t('housingSales.salesByType')}, {stats.currentYear || "2025"}
        </h3>
        <p className="text-sm text-slate-400 mb-4">{t('housingSales.number')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mortgaged vs Other */}
          <div>
            <h4 className="text-md font-semibold text-slate-200 mb-4">{t('housingSales.salesByTypeTitle')}</h4>
            {summaryLoading ? (
              <div className="flex justify-center items-center h-60">
                <Loader color="blue" size="sm" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={chartData.slice(-5)} 
                  margin={{ top: 30, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => (value / 1000).toFixed(0) + "K"}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatNumber(value), name === "mortgagedSales" ? t('housingSales.mortgagedSales') : t('housingSales.otherSales')]}
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#fff" }}
                  />
                  <Bar dataKey="mortgagedSales" name={t('housingSales.mortgagedSales')} fill="#ef4444" maxBarSize={30} />
                  <Bar dataKey="otherSales" name={t('housingSales.otherSales')} fill="#8b5cf6" maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-sm text-slate-400 mt-2">
              <span className="inline-block w-3 h-3 bg-red-500 mr-2"></span>{t('housingSales.mortgagedSales')}
              <span className="inline-block w-3 h-3 bg-purple-500 ml-4 mr-2"></span>{t('housingSales.otherSales')}
            </p>
          </div>

          {/* First Hand vs Second Hand */}
          <div>
            <h4 className="text-md font-semibold text-slate-200 mb-4">{t('housingSales.salesByState')}</h4>
            {summaryLoading ? (
              <div className="flex justify-center items-center h-60">
                <Loader color="blue" size="sm" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart 
                  data={chartData.slice(-5)} 
                  margin={{ top: 30, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => (value / 1000).toFixed(0) + "K"}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatNumber(value), name === "firstHandSales" ? t('housingSales.firstHandSales') : t('housingSales.secondHandSales')]}
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#fff" }}
                  />
                  <Bar dataKey="firstHandSales" name={t('housingSales.firstHandSales')} fill="#22c55e" maxBarSize={30} />
                  <Bar dataKey="secondHandSales" name={t('housingSales.secondHandSales')} fill="#f59e0b" maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-sm text-slate-400 mt-2">
              <span className="inline-block w-3 h-3 bg-green-500 mr-2"></span>{t('housingSales.firstHandSales')}
              <span className="inline-block w-3 h-3 bg-amber-500 ml-4 mr-2"></span>{t('housingSales.secondHandSales')}
            </p>
          </div>
        </div>
      </Paper>

      {/* Quick Stats Cards */}
      {!statsLoading && stats.currentYear && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #3b82f6' }}>
            <p className="text-sm text-blue-400 mb-1 font-medium">{t('housingSales.totalSalesLabel')} ({stats.currentYear})</p>
            <p className="text-2xl font-bold text-white">{formatNumber(stats.totalSales)}</p>
            <p className={`text-sm mt-1 font-semibold ${isIncrease ? "text-green-400" : "text-red-400"}`}>
              {isIncrease ? "+" : ""}{changePercent}% {t('housingSales.vs')} {stats.previousYear}
            </p>
          </Paper>
          
          <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #ef4444' }}>
            <p className="text-sm text-red-400 mb-1 font-medium">{t('housingSales.mortgagedSalesLabel')}</p>
            <p className="text-2xl font-bold text-white">{formatNumber(stats.mortgagedSales)}</p>
            <p className={`text-sm mt-1 font-semibold ${parseFloat(stats.changes?.mortgagedSales) >= 0 ? "text-green-400" : "text-red-400"}`}>
              {parseFloat(stats.changes?.mortgagedSales) >= 0 ? "+" : ""}{stats.changes?.mortgagedSales}%
            </p>
          </Paper>
          
          <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #22c55e' }}>
            <p className="text-sm text-green-400 mb-1 font-medium">{t('housingSales.firstHandSalesLabel')}</p>
            <p className="text-2xl font-bold text-white">{formatNumber(stats.firstHandSales)}</p>
            <p className={`text-sm mt-1 font-semibold ${parseFloat(stats.changes?.firstHandSales) >= 0 ? "text-green-400" : "text-red-400"}`}>
              {parseFloat(stats.changes?.firstHandSales) >= 0 ? "+" : ""}{stats.changes?.firstHandSales}%
            </p>
          </Paper>
          
          <Paper p="md" radius="md" style={{ backgroundColor: '#1e293b', border: '2px solid #f59e0b' }}>
            <p className="text-sm text-amber-400 mb-1 font-medium">{t('housingSales.secondHandSalesLabel')}</p>
            <p className="text-2xl font-bold text-white">{formatNumber(stats.secondHandSales)}</p>
            <p className={`text-sm mt-1 font-semibold ${parseFloat(stats.changes?.secondHandSales) >= 0 ? "text-green-400" : "text-red-400"}`}>
              {parseFloat(stats.changes?.secondHandSales) >= 0 ? "+" : ""}{stats.changes?.secondHandSales}%
            </p>
          </Paper>
        </div>
      )}

      {/* Comparison Table */}
      {!statsLoading && stats.currentYear && (
        <Paper p="lg" radius="md" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div className="mb-4">
            <p className="text-gray-800 font-semibold text-lg">
              {t('housingSales.comparisonTitle')} - {stats.province || selectedProvince || "Turkey"} ({stats.currentYear} {t('housingSales.vs')} {stats.previousYear})
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 text-gray-700 font-semibold"></th>
                  <th colSpan="3" className="text-center py-3 px-4 text-gray-700 font-semibold border-l border-gray-200">
                    {t('housingSales.yearComparison')}
                  </th>
                </tr>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4 text-gray-600 font-medium"></th>
                  <th className="text-center py-2 px-4 text-gray-600 font-medium border-l border-gray-200">
                    {stats.currentYear}
                  </th>
                  <th className="text-center py-2 px-4 text-gray-600 font-medium">
                    {stats.previousYear}
                  </th>
                  <th className="text-center py-2 px-4 text-gray-600 font-medium">
                    {t('housingSales.change')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Total Sales Row */}
                <tr className="border-b border-gray-200 font-semibold">
                  <td className="py-3 px-4 text-gray-800">{t('housingSales.totalSalesByMethod')}</td>
                  <td className="py-3 px-4 text-center text-gray-800 border-l border-gray-200">
                    {formatNumber(stats.totalSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-800">
                    {formatNumber(stats.previousTotalSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 font-bold">
                    {stats.changes?.totalSales}
                  </td>
                </tr>

                {/* Mortgage Sale Row */}
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-600 pl-8">{t('housingSales.mortgageSale')}</td>
                  <td className="py-3 px-4 text-center text-gray-700 border-l border-gray-200">
                    {formatNumber(stats.mortgagedSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {formatNumber(stats.previousMortgagedSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 font-medium">
                    {stats.changes?.mortgagedSales}
                  </td>
                </tr>

                {/* Other Sales Row */}
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-600 pl-8">{t('housingSales.otherSales')}</td>
                  <td className="py-3 px-4 text-center text-gray-700 border-l border-gray-200">
                    {formatNumber(stats.otherSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {formatNumber(stats.previousOtherSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 font-medium">
                    {stats.changes?.otherSales}
                  </td>
                </tr>

                {/* Total Sales by Status Row */}
                <tr className="border-b border-gray-200 font-semibold">
                  <td className="py-3 px-4 text-gray-800">{t('housingSales.totalSalesByStatus')}</td>
                  <td className="py-3 px-4 text-center text-gray-800 border-l border-gray-200">
                    {formatNumber(stats.totalSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-800">
                    {formatNumber(stats.previousTotalSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 font-bold">
                    {stats.changes?.totalSales}
                  </td>
                </tr>

                {/* First-hand Sale Row */}
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-600 pl-8">{t('housingSales.firstHandSale')}</td>
                  <td className="py-3 px-4 text-center text-gray-700 border-l border-gray-200">
                    {formatNumber(stats.firstHandSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {formatNumber(stats.previousFirstHandSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 font-medium">
                    {stats.changes?.firstHandSales}
                  </td>
                </tr>

                {/* Second-hand Sales Row */}
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-600 pl-8">{t('housingSales.secondHandSale')}</td>
                  <td className="py-3 px-4 text-center text-gray-700 border-l border-gray-200">
                    {formatNumber(stats.secondHandSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700">
                    {formatNumber(stats.previousSecondHandSales)}
                  </td>
                  <td className="py-3 px-4 text-center text-blue-600 font-medium">
                    {stats.changes?.secondHandSales}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Paper>
      )}

      {/* Data Source */}
      <Text size="xs" className="text-center" style={{ color: '#ffffff' }}>
        {t('housingSales.dataSource')}
      </Text>
    </div>
  );
};

export default HousingSalesChart;
