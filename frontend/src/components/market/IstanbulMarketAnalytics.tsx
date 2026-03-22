import { useMemo, useState } from "react";
import { useQuery } from "react-query";
import { Loader } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getIstanbulMarketAnalytics } from "../../utils/api";

type TrendRow = {
  year: number;
  month?: number;
  period: string;
  benchmark_price: number;
  benchmark_count: number;
  selected_price: number | null;
  selected_count: number;
};

type DistrictRow = {
  district: string;
  avg_m2_price: number;
  listing_count: number;
};

type SummaryRow = {
  district: string;
  avg_m2_price: number;
  listing_count: number;
  trend: Array<{ year: number; price: number; listing_count: number }>;
};

type MarketPayload = {
  success: boolean;
  city: string;
  benchmarkDistrict: string;
  selectedDistrict: string;
  totalListings: number;
  districtComparison: DistrictRow[];
  yearlyTrend: TrendRow[];
  monthlyTrend: TrendRow[];
  summary: SummaryRow[];
};

type IstanbulMarketAnalyticsProps = {
  districtHint?: string | null;
  className?: string;
};


const toCompact = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
};

const IstanbulMarketAnalytics = ({
  districtHint,
  className = "",
}: IstanbulMarketAnalyticsProps) => {
  const { i18n } = useTranslation();
  const isTr = i18n.language?.startsWith("tr");
  const isFa = i18n.language?.startsWith("fa");
  const [granularity, setGranularity] = useState<"yearly" | "monthly">("yearly");

  const normalizedDistrict = useMemo(
    () => String(districtHint || "").trim(),
    [districtHint]
  );

  const { data, isLoading, isError } = useQuery(
    ["istanbul-market-analytics", normalizedDistrict],
    () =>
      getIstanbulMarketAnalytics({
        district: normalizedDistrict,
        listing_type: "sale",
        include_projects: "true",
        min_year: 2015,
        strict_district: "true",
        use_history: "true",
        limit: 6,
      }),
    {
      staleTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      enabled: Boolean(normalizedDistrict),
    }
  );

  const payload = (data as MarketPayload | undefined) || null;

  const benchmarkSummary = payload?.summary?.find(
    (item) => item?.district === payload?.benchmarkDistrict
  );
  const selectedSummary = payload?.summary?.find(
    (item) => item?.district === payload?.selectedDistrict
  );

  const trendData = useMemo(() => {
    const source = granularity === "yearly" ? payload?.yearlyTrend : payload?.monthlyTrend;
    if (!Array.isArray(source)) return [];

    return source.map((row) => {
      if (granularity === "yearly") {
        return { ...row, label: String(row.year) };
      }

      const month = String(row.month || 0).padStart(2, "0");
      const label = isTr ? `${month}.${row.year}` : `${row.year}-${month}`;
      return { ...row, label };
    });
  }, [granularity, isTr, payload?.monthlyTrend, payload?.yearlyTrend]);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat(isTr ? "tr-TR" : "en-US", {
      maximumFractionDigits: 0,
    }).format(Math.round(value || 0));

  const chartExplanation = isFa
    ? "خط آبي ميانگين قيمت فروش هر متر مربع استانبول و خط قرمز ميانگين قيمت فروش هر متر مربع منطقه انتخابي را نشان مي دهد. محور افقي زمان و محور عمودي قيمت (TRY) است."
    : isTr
    ? "Mavi cizgi Istanbul ortalama m2 satis fiyatini, kirmizi cizgi secili bolge ortalama m2 satis fiyatini gosterir. Yatay eksen zaman, dikey eksen fiyat (TRY) bilgisidir."
    : "The blue line shows Istanbul average sale price per m2, and the red line shows the selected area's average sale price per m2. X-axis is time, Y-axis is price (TRY).";

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader size="sm" />
        </div>
      </div>
    );
  }

  if (!normalizedDistrict) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-6 ${className}`}>
        <p className="text-sm text-slate-600">
          {isTr
            ? "Bu ilan için ilçe/mahalle bilgisi bulunamadı."
            : "District/neighborhood was not found for this listing."}
        </p>
      </div>
    );
  }

  if (isError || !payload || !payload.success) {
    return (
      <div className={`rounded-2xl border border-rose-100 bg-rose-50 p-6 ${className}`}>
        <p className="text-sm text-rose-700">
          {isTr
            ? "Emlak endeksi verisi şu anda yüklenemiyor."
            : "Market index data is currently unavailable."}
        </p>
      </div>
    );
  }

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {isTr ? "Satış Fiyatı / m2" : "Sale Price / m2"}
          </h3>
          <p className="text-xs text-slate-500">
            {payload.benchmarkDistrict} vs {payload.selectedDistrict}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setGranularity("monthly")}
            className={`min-w-[96px] rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              granularity === "monthly"
                ? "bg-[#0b4f93] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isTr ? "Aylık" : "Monthly"}
          </button>
          <button
            type="button"
            onClick={() => setGranularity("yearly")}
            className={`min-w-[96px] rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              granularity === "yearly"
                ? "bg-[#0b4f93] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {isTr ? "Yıllık" : "Yearly"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <p className="text-xs text-blue-700">{payload.benchmarkDistrict}</p>
          <p className="text-xl font-bold text-blue-900">
            ₺{formatPrice(benchmarkSummary?.avg_m2_price || 0)}
          </p>
          <p className="text-xs text-blue-700">
            {isTr ? "İlan" : "Listings"}: {benchmarkSummary?.listing_count || 0}
          </p>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
          <p className="text-xs text-rose-700">{payload.selectedDistrict}</p>
          <p className="text-xl font-bold text-rose-900">
            {"TRY " + formatPrice(selectedSummary?.avg_m2_price || 0)}
          </p>
          <p className="text-xs text-rose-700">
            {isTr ? "İlan" : "Listings"}: {selectedSummary?.listing_count || 0}
          </p>
        </div>
      </div>

      <div
        className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-6"
        dir={isFa ? "rtl" : "ltr"}
      >
        <p>{chartExplanation}</p>
      </div>

      <div className="mb-8 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis
              tickFormatter={(value) => `₺${toCompact(Number(value || 0))}`}
              tick={{ fontSize: 11 }}
              width={64}
            />
            <Tooltip
              formatter={(value: number | null, _name, item: { dataKey?: string }) => {
                const name =
                  item?.dataKey === "benchmark_price"
                    ? payload.benchmarkDistrict
                    : payload.selectedDistrict;
                if (value === null || value === undefined) {
                  return [isTr ? "Veri yok" : "No data", name];
                }
                return [`₺${formatPrice(Number(value || 0))}`, name];
              }}
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="benchmark_price"
              name={payload.benchmarkDistrict}
              stroke="#0b4f93"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="selected_price"
              name={payload.selectedDistrict}
              stroke="#d7263d"
              strokeWidth={3}
              connectNulls={false}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </section>
  );
};

export default IstanbulMarketAnalytics;

