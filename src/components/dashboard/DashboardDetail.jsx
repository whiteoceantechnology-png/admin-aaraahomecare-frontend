import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  Store,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  UserCheck,
  TrendingDown,
} from "lucide-react";
import { FaRegMoneyBillAlt, FaMale, FaFemale } from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { Link } from "react-router-dom";
import "swiper/css";
import "swiper/css/autoplay";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#3B82F6",
  "#10B981",
  "#EC4899",
];

const DashboardDetail = ({ data }) => {
  // Chart State
  const [viewType, setViewType] = useState("monthly");
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedMonth, setSelectedMonth] = useState("10");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSalon, setSelectedSalon] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus]);

  // Fallback sample/demo data
  const dailyData = data?.dailyRevenue || [
    ...Array.from({ length: 31 }, (_, i) => ({
      day: `2024-10-${(i + 1).toString().padStart(2, "0")}`,
      revenue: 70,
      appointment_count: 7,
      salon_id: 1,
      category: "Haircut",
    })),
    ...Array.from({ length: 30 }, (_, i) => ({
      day: `2025-09-${(i + 1).toString().padStart(2, "0")}`,
      revenue: 90,
      appointment_count: 9,
      salon_id: 1,
      category: "Coloring",
    })),
    {
      day: "2025-10-01",
      revenue: 200,
      appointment_count: 20,
      salon_id: 1,
      category: "Haircut",
    },
    {
      day: "2025-10-02",
      revenue: 150,
      appointment_count: 15,
      salon_id: 2,
      category: "Coloring",
    },
    // ... (rest of daily sample data)
  ];

  // Metric calculations
  const getMonthRevenue = (year, month) => {
    return dailyData
      .filter((item) => {
        const [y, m] = item.day.substring(0, 7).split("-");
        return parseInt(y) === year && parseInt(m) === month;
      })
      .reduce((sum, item) => sum + item.revenue, 0);
  };

  const currentYear = parseInt(selectedYear);
  const currentMonth = parseInt(selectedMonth);
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const currentRev = getMonthRevenue(currentYear, currentMonth);
  const prevRev = getMonthRevenue(prevYear, prevMonth);
  const revenueGrowth =
    prevRev > 0 ? (((currentRev - prevRev) / prevRev) * 100).toFixed(1) : 0;
  const revenueGrowthLabel = `${
    revenueGrowth >= 0 ? "+" : ""
  }${revenueGrowth}% vs last month`;

  // Metric name
  const metricName =
    selectedMetric === "revenue" ? "Revenue" : "Appointment Count";

  // Aggregation functions
  const aggregateMonthly = (filteredDaily, metric) => {
    const monthly = {};
    filteredDaily.forEach((item) => {
      const yearMonth = item.day.substring(0, 7);
      if (!monthly[yearMonth]) monthly[yearMonth] = 0;
      monthly[yearMonth] += item[metric];
    });
    return Object.entries(monthly)
      .map(([month, value]) => ({ month, [metric]: Math.round(value) }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const aggregateYearly = (filteredDaily, metric) => {
    const yearly = {};
    filteredDaily.forEach((item) => {
      const year = item.day.substring(0, 4);
      if (!yearly[year]) yearly[year] = 0;
      yearly[year] += item[metric];
    });
    return Object.entries(yearly)
      .map(([year, value]) => ({ year, [metric]: Math.round(value) }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  // Filters
  let filteredDaily = [...dailyData];
  if (
    (viewType === "monthly" || viewType === "daily") &&
    selectedYear !== "all"
  ) {
    filteredDaily = dailyData.filter((item) =>
      item.day.startsWith(selectedYear),
    );
  }
  if (viewType === "daily") {
    filteredDaily = filteredDaily.filter(
      (item) => item.day.substring(5, 7) === selectedMonth,
    );
  }
  if (viewType === "specific" && fromDate && toDate) {
    filteredDaily = dailyData.filter((item) => {
      const itemDate = new Date(item.day);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      return itemDate >= from && itemDate <= to;
    });
  }
  if (selectedSalon !== "all") {
    filteredDaily = filteredDaily.filter(
      (item) => item.salon_id === parseInt(selectedSalon),
    );
  }
  if (selectedCategory !== "all") {
    filteredDaily = filteredDaily.filter(
      (item) => item.category === selectedCategory,
    );
  }

  // Chart data logic
  let chartData = [];
  let xKey = "day";
  let yKey = selectedMetric;
  let labelFormatter = (label) => new Date(label).toLocaleDateString();
  let xTickFormatter = (value) => value;

  switch (viewType) {
    case "daily":
      chartData = filteredDaily;
      xKey = "day";
      labelFormatter = (label) =>
        new Date(label).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      xTickFormatter = (value) => new Date(value).getDate();
      break;
    case "monthly":
      chartData = aggregateMonthly(filteredDaily, selectedMetric);
      xKey = "month";
      labelFormatter = (label) => {
        const date = new Date(`${label}-01`);
        return date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      };
      xTickFormatter = (value) =>
        new Date(`${value}-01`).toLocaleDateString("en-US", { month: "short" });
      break;
    case "yearly":
      const yearlyFiltered =
        selectedYear === "all"
          ? filteredDaily
          : filteredDaily.filter((item) => item.day.startsWith(selectedYear));
      chartData = aggregateYearly(yearlyFiltered, selectedMetric);
      xKey = "year";
      labelFormatter = (label) => label;
      xTickFormatter = (value) => value;
      break;
    case "specific":
      chartData = filteredDaily;
      xKey = "day";
      labelFormatter = (label) => new Date(label).toLocaleDateString();
      xTickFormatter = (value) => new Date(value).getDate();
      break;
    default:
      chartData = aggregateMonthly(dailyData, selectedMetric);
      xTickFormatter = (value) =>
        new Date(`${value}-01`).toLocaleDateString("en-US", { month: "short" });
  }

  // Category chart data from prop, with fallback
  const categoryData = (data?.sales_by_category || [])
    .filter((item) => item?.total_sales !== null)
    .map((item) => ({
      category: item?.category,
      sales: parseInt(item?.total_sales),
    })) || [
    { category: "Electronics", sales: 400 },
    { category: "Clothing", sales: 300 },
    { category: "Books", sales: 300 },
    { category: "Home & Garden", sales: 200 },
  ];

  // Metric Card Component
  const MetricCard = ({ title, value, icon: Icon, color, subtitle }) => {
    const growthColor =
      subtitle && typeof subtitle === "string"
        ? subtitle.includes("% vs last month")
          ? subtitle.includes("+") ||
            parseFloat(subtitle.replace("% vs last month", "")) >= 0
            ? "text-green-600"
            : "text-red-600"
          : "text-gray-500"
        : "text-gray-500";
    return (
      <div
        className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4"
        style={{ borderLeftColor: color }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">
              {title}
            </p>
            <p className="text-lg lg:text-2xl font-bold text-gray-900 truncate">
              {value}
            </p>
            {subtitle && (
              <p className={`text-xs ${growthColor} mt-1 truncate font-medium`}>
                {subtitle}
              </p>
            )}
          </div>
          <Icon
            className="h-6 w-6 lg:h-8 lg:w-8 flex-shrink-0 ml-2"
            style={{ color }}
          />
        </div>
      </div>
    );
  };

  // Month selection options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const date = new Date(2025, i, 1);
    return {
      value: month,
      label: date.toLocaleString("default", { month: "long" }),
    };
  });

  // Salon status filtering
  // const filteredSalons = (data?.top_saloons || []).filter(
  //   (salon) => selectedStatus === "all" || salon.status === selectedStatus
  // );
  const resetFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSearchLocation("");
    setSelectedStatus("all");
  };
  const filteredSalons = (data?.top_saloons || []).filter((salon) => {
    const matchStatus =
      selectedStatus === "all" || salon?.status === selectedStatus;

    // Check if there are any active search filters
    const hasSearch =
      searchName.trim() !== "" ||
      searchEmail.trim() !== "" ||
      searchLocation.trim() !== "";

    // If no search filters, just filter by status
    if (!hasSearch) {
      return matchStatus;
    }

    // Safe lowercasing & matching (avoid null/undefined errors)
    const name = salon?.name?.toLowerCase() || "";
    const email = salon?.email?.toLowerCase() || "";
    const location = salon?.cityLocation?.toLowerCase() || "";

    const matchName = name.includes(searchName.toLowerCase());
    const matchEmail = email.includes(searchEmail.toLowerCase());
    const matchLocation = location.includes(searchLocation.toLowerCase());

    return matchStatus && matchName && matchEmail && matchLocation;
  });
  const indexOfLastRecord = currentPage * rowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
  const currentSalons = filteredSalons.slice(
    indexOfFirstRecord,
    indexOfLastRecord,
  );
  const totalPages = Math.ceil(filteredSalons.length / rowsPerPage);

  // Date strings formatting
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Placeholder API toggle
  const toggleSalonStatus = (salonId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    // TODO: Implement API call here
    alert(`Salon status toggled to ${newStatus.toUpperCase()}`);
  };

  // View type change handler
  const handleViewTypeChange = (e) => {
    const newView = e.target.value;
    setViewType(newView);
    setSelectedYear("2025");
    setSelectedMonth("10");
    setFromDate("");
    setToDate("");
    if (newView === "specific") {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Orders"
            value={data?.total_orders || 0}
            icon={Store}
            color="#10B981"
          />

          <MetricCard
            title="Total Customers"
            value={data?.total_customers || 0}
            icon={Users}
            color="#F43F5E"
          />

          <MetricCard
            title="Total Products"
            value={data?.total_products || 0}
            icon={TrendingUp}
            color="#F59E0B"
          />

          <MetricCard
            title="Pending Orders"
            value={data?.pending_orders || 0}
            icon={Calendar}
            color="#0EA5E9"
          />

          <MetricCard
            title="Total Revenue"
            value={`₹${data?.total_revenue || 0}`}
            icon={FaRegMoneyBillAlt}
            color="#EF4444"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardDetail;
