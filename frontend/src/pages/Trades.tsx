import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import Header from "@/components/Header.tsx";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Activity, X, RefreshCw, HelpCircle, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { DailyPriceVolumeChart } from "@/components/DailyPriceVolumeChart.tsx";
import { DailyOHLCChart } from "@/components/DailyOHLCChart.tsx";
import { DatePicker } from "@/components/ui/date-picker.tsx";

interface Trade {
  id: string;
  tradeTime: string; // Format: "HH:mm:ss"
  tradeDate: string; // Format: "DD/MM/YYYY"
  code: string;
  side: "buy" | "sell" | "unknown";
  price: number;
  volume: number;
}

interface DailyChartData {
  date: string; // "DD/MM/YYYY"
  latestPrice: number;
  minPrice?: number;
  maxPrice?: number;
  totalVolume: number; // in shares
}

interface DailyOHLCData {
  date: string; // "DD/MM/YYYY"
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
}

// VN30 Stock Codes
const VN30_STOCKS = [
    "ACB", "BCM", "BID", "CTG", "DGC", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB",
    "MSN", "MWG", "PLX", "SAB", "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM",
    "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"
];

// LocalStorage key for saving trade filters (will be made user-specific)
const getTradesFiltersStorageKey = (userId: number | null) => {
  return userId ? `trades_filters_${userId}` : 'trades_filters';
};

interface TradeFilters {
  code: string;
  type: string;
  minVolume: string;
  maxVolume: string;
  minPrice: string;
  maxPrice: string;
  fromDate: string;
  toDate: string;
  page: number;
  size: number;
  sortField: "code" | "time" | "price" | "volume";
  sortDirection: "asc" | "desc";
  chartFromDate: string;
  chartToDate: string;
}

const Trades = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  
  // Get today's date in yyyy-MM-dd format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if a date is a valid trading day (Monday-Friday)
  const isValidTradingDay = (dateString: string): boolean => {
    // Parse date string in yyyy-MM-dd format
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    // Monday (1) to Friday (5) are valid trading days
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  // Check if current time is within market hours (9 AM - 3 PM)
  const isWithinMarketHours = (): boolean => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeMinutes = hours * 60 + minutes;
    const marketOpenMinutes = 9 * 60; // 9:00 AM
    const marketCloseMinutes = 15 * 60; // 3:00 PM
    return currentTimeMinutes >= marketOpenMinutes && currentTimeMinutes <= marketCloseMinutes;
  };

  // Check if today is a valid transaction date
  const isTodayValidTransactionDate = (): boolean => {
    const today = getTodayDate();
    // Check if it's a weekday (Monday-Friday)
    if (!isValidTradingDay(today)) {
      return false;
    }
    // Check if current time is within market hours (9 AM - 3 PM)
    // Note: Even if it's a weekday, if it's outside market hours, it's not a valid transaction date
    // However, for simplicity, we'll consider it valid if it's a weekday
    // The market hours check can be added if needed for more precision
    return true;
  };

  // Validate date string format (yyyy-MM-dd)
  const isValidDateFormat = (dateString: string | null | undefined): boolean => {
    if (!dateString || typeof dateString !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    const date = new Date(dateString + 'T00:00:00');
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
  };

  // Fetch latest transaction date from backend
  const fetchLatestTransactionDate = async (): Promise<string | null> => {
    try {
      const response = await api.get('/api/trades/latest-date');
      if (!response.ok) throw new Error('Failed to fetch latest transaction date');
      const latestDate = await response.json();
      // Convert from ISO date string (yyyy-MM-dd) to yyyy-MM-dd format
      // The API should return LocalDate which serializes to ISO format
      if (latestDate) {
        const dateString = String(latestDate);
        // Validate the date format
        if (isValidDateFormat(dateString)) {
          return dateString;
        } else {
          console.error('Invalid date format received from backend:', dateString);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching latest transaction date:', error);
      return null;
    }
  };

  // Get default dates based on weekday/weekend logic
  // Case 1: If current day is weekday -> from/to = current day
  // Case 2: If current day is weekend -> from/to = last transaction date (last Friday)
  const getDefaultDates = async (): Promise<{ fromDate: string; toDate: string }> => {
    const today = getTodayDate();
    
    // Check if today is a weekday (Monday-Friday)
    if (isValidTradingDay(today)) {
      // Case 1: Weekday -> use current day
      return { fromDate: today, toDate: today };
    } else {
      // Case 2: Weekend -> use last transaction date (last Friday)
      const latestDate = await fetchLatestTransactionDate();
      if (latestDate && isValidDateFormat(latestDate)) {
        return { fromDate: latestDate, toDate: latestDate };
      } else {
        // Fallback: if we can't get latest date, use today anyway
        console.warn('Could not fetch latest transaction date, using today');
        return { fromDate: today, toDate: today };
      }
    }
  };

  // Helper function to calculate N trading days back (excluding weekends)
  const getNTradingDaysBack = (n: number): string => {
    const today = new Date();
    let daysBack = 0;
    let tradingDaysFound = 0;
    
    while (tradingDaysFound < n) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysBack);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        tradingDaysFound++;
        if (tradingDaysFound === n) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
      daysBack++;
    }
    
    return getTodayDate(); // Fallback
  };

  // Helper function to get one month ago from today
  const getOneMonthAgo = (): string => {
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    const year = oneMonthAgo.getFullYear();
    const month = String(oneMonthAgo.getMonth() + 1).padStart(2, '0');
    const day = String(oneMonthAgo.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load filters from localStorage (user-specific)
  const loadFiltersFromStorage = (): Partial<TradeFilters> => {
    if (!user?.id) return {};
    try {
      const key = getTradesFiltersStorageKey(user.id);
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
    return {};
  };

  // Save filters to localStorage (user-specific)
  const saveFiltersToStorage = (filters: Partial<TradeFilters>) => {
    if (!user?.id) return;
    try {
      const key = getTradesFiltersStorageKey(user.id);
      localStorage.setItem(key, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  };

  // Load saved filters or use defaults
  // Note: We don't use cached fromDate/toDate - they will be reset based on weekday/weekend logic
  const savedFilters = loadFiltersFromStorage();
  
  // Default chart date range: one month ago to today (unless user has saved a preference)
  // If user has saved chart dates, use them; otherwise default to one month range
  const todayDate = getTodayDate();
  const defaultChartFromDate = (savedFilters.chartFromDate && /^\d{4}-\d{2}-\d{2}$/.test(savedFilters.chartFromDate))
    ? savedFilters.chartFromDate
    : getOneMonthAgo();
  const defaultChartToDate = (savedFilters.chartToDate && /^\d{4}-\d{2}-\d{2}$/.test(savedFilters.chartToDate))
    ? savedFilters.chartToDate
    : todayDate;

  const [code, setCode] = useState(savedFilters.code || ""); // All by default (empty)
  const [codeOpen, setCodeOpen] = useState(false);
  const [type, setType] = useState(savedFilters.type || "All");
  const [minVolume, setMinVolume] = useState(savedFilters.minVolume || "");
  const [maxVolume, setMaxVolume] = useState(savedFilters.maxVolume || "");
  const [minPrice, setMinPrice] = useState(savedFilters.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(savedFilters.maxPrice || "");
  // Initialize dates with today - will be updated by useEffect based on weekday/weekend logic
  const [fromDate, setFromDate] = useState(todayDate); // yyyy-MM-dd
  const [toDate, setToDate] = useState(todayDate);     // yyyy-MM-dd
  const [defaultDateInitialized, setDefaultDateInitialized] = useState(false);
  const [page, setPage] = useState(savedFilters.page ?? 0);
  const [size, setSize] = useState(savedFilters.size || 10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<"code" | "time" | "price" | "volume">(savedFilters.sortField || "code");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(savedFilters.sortDirection || "asc");
  
  // Volume statistics
  const [totalVolume, setTotalVolume] = useState(0);
  const [buyVolume, setBuyVolume] = useState(0);
  const [sellVolume, setSellVolume] = useState(0);
  const [unknownVolume, setUnknownVolume] = useState(0);
  
  // Transaction counts
  const [buyCount, setBuyCount] = useState(0);
  const [sellCount, setSellCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  
  // Chart data
  const [chartData, setChartData] = useState<DailyChartData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  // Chart-specific date filters (independent from trade table filters)
  const [chartFromDate, setChartFromDate] = useState(defaultChartFromDate);
  const [chartToDate, setChartToDate] = useState(defaultChartToDate);
  
  // OHLC Chart data
  const [ohlcData, setOhlcData] = useState<DailyOHLCData[]>([]);
  const [ohlcLoading, setOhlcLoading] = useState(false);
  
  // Ref to track if initial data has been loaded
  const hasInitialLoad = useRef(false);
  
  // Alert dialog state for date range validation error
  const [showDateRangeAlert, setShowDateRangeAlert] = useState(false);
  const [dateRangeError, setDateRangeError] = useState<{
    message: string;
    fromDate?: string;
    toDate?: string;
    minimumAllowedFromDate?: string;
  } | null>(null);

  // Initialize default dates based on weekday/weekend logic
  // Case 1: Weekday -> from/to = current day
  // Case 2: Weekend -> from/to = last transaction date
  // Note: We always reset dates on page reload (ignore cached dates)
  useEffect(() => {
    const initializeDefaultDates = async () => {
      const defaultDates = await getDefaultDates();
      setFromDate(defaultDates.fromDate);
      setToDate(defaultDates.toDate);
      setDefaultDateInitialized(true);
    };

    initializeDefaultDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const fetchChartData = async () => {
    // Only fetch if a specific stock code is selected
    if (!code || code.trim() === "") {
      setChartData([]);
      return;
    }

    setChartLoading(true);
    const params = new URLSearchParams();
    params.set("code", code.trim());
    
    // Use chart-specific date filters (independent from trade table filters)
    const chartFrom = chartFromDate || getOneMonthAgo();
    const chartTo = chartToDate || getTodayDate();
    
    if (chartFrom) params.set("fromDate", chartFrom);
    if (chartTo) params.set("toDate", chartTo);

    try {
      const response = await api.get(`/api/trades/daily-stats?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load chart data");
      const data = await response.json();
      setChartData(data.map((item: any) => ({
        date: item.date,
        latestPrice: Number(item.latestPrice) || 0,
        minPrice: item.minPrice ? Number(item.minPrice) : undefined,
        maxPrice: item.maxPrice ? Number(item.maxPrice) : undefined,
        totalVolume: Number(item.totalVolume) || 0,
      })));
    } catch (error) {
      console.error("Error loading chart data:", error);
      toast.error("Failed to load chart data");
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchOHLCData = async () => {
    // Only fetch if a specific stock code is selected
    if (!code || code.trim() === "") {
      setOhlcData([]);
      return;
    }

    setOhlcLoading(true);
    const params = new URLSearchParams();
    params.set("code", code.trim());
    
    // Use chart-specific date filters (independent from trade table filters)
    const chartFrom = chartFromDate || getOneMonthAgo();
    const chartTo = chartToDate || getTodayDate();
    
    if (chartFrom) params.set("fromDate", chartFrom);
    if (chartTo) params.set("toDate", chartTo);

    try {
      const response = await api.get(`/api/trades/daily-ohlc?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load OHLC data");
      const data = await response.json();
      setOhlcData(data.map((item: any) => ({
        date: item.date,
        openPrice: Number(item.openPrice) || 0,
        highPrice: Number(item.highPrice) || 0,
        lowPrice: Number(item.lowPrice) || 0,
        closePrice: Number(item.closePrice) || 0,
      })));
    } catch (error) {
      console.error("Error loading OHLC data:", error);
      toast.error("Failed to load OHLC data");
      setOhlcData([]);
    } finally {
      setOhlcLoading(false);
    }
  };

  const fetchTrades = (nextPage = page, nextSize = size, sortFieldParam = sortField, sortDirectionParam = sortDirection, dateOverride?: { fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams();
    if (code) params.set("code", code.trim());
    if (type && type !== "All") params.set("type", type.toLowerCase());
    if (minVolume) params.set("minVolume", String(parseInt(minVolume)));
    if (maxVolume) params.set("maxVolume", String(parseInt(maxVolume)));
    if (minPrice) params.set("minPrice", String(parseFloat(minPrice)));
    if (maxPrice) params.set("maxPrice", String(parseFloat(maxPrice)));
    // Use date override if provided, otherwise use state values
    const fromDateToUse = dateOverride?.fromDate ?? fromDate;
    const toDateToUse = dateOverride?.toDate ?? toDate;
    if (fromDateToUse) params.set("fromDate", fromDateToUse);
    if (toDateToUse) params.set("toDate", toDateToUse);
    params.set("page", String(nextPage));
    params.set("size", String(nextSize));
    
    // Add sorting parameters if sorting is active
    if (sortFieldParam) {
      // Map frontend field names to backend field names
      const fieldMap: Record<string, string> = {
        code: "code",
        time: "tradeTime",
        price: "price",
        volume: "volume"
      };
      params.set("sort", fieldMap[sortFieldParam] || sortFieldParam);
      params.set("direction", sortDirectionParam);
    }

    setLoading(true);
    api.get(`/api/trades?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          // Check if it's a rate limit error
          if (r.status === 429) {
            try {
              const errorData = await r.json();
              const retryAfter = errorData.retryAfterSeconds || 60;
              toast.error(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`);
              throw new Error(errorData.message || "Rate limit exceeded");
            } catch (e) {
              // If JSON parsing fails, fall through to generic error
            }
          }
          // Check if it's a date range validation error
          if (r.status === 400) {
            try {
              const errorData = await r.json();
              if (errorData.error === "Date range exceeds one month limit") {
                // Show alert dialog instead of toast
                setDateRangeError({
                  message: errorData.message || "The date range you selected exceeds one month. Please upgrade to VIP account to query larger date ranges.",
                  fromDate: errorData.fromDate,
                  toDate: errorData.toDate,
                  minimumAllowedFromDate: errorData.minimumAllowedFromDate,
                });
                setShowDateRangeAlert(true);
                throw new Error(errorData.message || "Date range exceeds one month limit");
              }
            } catch (e) {
              // If JSON parsing fails, fall through to generic error
            }
          }
          throw new Error("Failed to load trades");
        }
        return r.json();
      })
      .then((response) => {
        // Backend may return either:
        // A) Page<Trade> at root level (Spring Data default)
        // B) Wrapped object: { trades: Page<Trade>, ...stats }
        const tradesPage = response?.trades ?? response ?? {};

        const items = (tradesPage?.content || []).map((t: any) => {
          const side = (t.side ?? "").toLowerCase();
          return {
            id: String(t.id ?? `${t.code}-${t.tradeDate}-${t.tradeTime}`),
            tradeTime: t.tradeTime ?? "", // Format: "HH:mm:ss"
            tradeDate: t.tradeDate ?? "", // Format: "DD/MM/YYYY"
            code: t.code ?? "",
            side: side === "buy" ? "buy" : side === "sell" ? "sell" : "unknown",
            price: Number(t.price ?? 0),
            volume: Number(t.volume ?? 0),
          };
        }) as Trade[];
        setFilteredTrades(items);
        
        // Parse pagination data (prefer tradesPage, fallback to wrapper fields)
        setTotalElements(Number(tradesPage?.totalElements ?? response?.totalRecords ?? 0));
        setTotalPages(Number(tradesPage?.totalPages ?? 0));
        setPage(Number(tradesPage?.number ?? nextPage));
        setSize(Number(tradesPage?.size ?? nextSize));
        
        // Calculate volume statistics from trades
        const buyTrades = items.filter(t => t.side === 'buy');
        const sellTrades = items.filter(t => t.side === 'sell');
        const unknownTrades = items.filter(t => t.side === 'unknown');
        
        const buyVol = buyTrades.reduce((sum, t) => sum + t.volume, 0);
        const sellVol = sellTrades.reduce((sum, t) => sum + t.volume, 0);
        const unknownVol = unknownTrades.reduce((sum, t) => sum + t.volume, 0);
        
        // If backend provided stats, prefer them; else compute from page items
        setTotalVolume(Number(response?.totalVolume ?? (buyVol + sellVol + unknownVol)));
        setBuyVolume(Number(response?.buyVolume ?? buyVol));
        setSellVolume(Number(response?.sellVolume ?? sellVol));
        setUnknownVolume(Number(response?.unknownVolume ?? unknownVol));
        setBuyCount(Number(response?.buyCount ?? buyTrades.length));
        setSellCount(Number(response?.sellCount ?? sellTrades.length));
        setUnknownCount(Number(response?.unknownCount ?? unknownTrades.length));
      })
      .catch(() => toast.error(t('error.loadFailed')))
      .finally(() => setLoading(false));
  };

  const handleSort = (field: "code" | "time" | "price" | "volume") => {
    let newDirection: "asc" | "desc" = "asc";
    
    if (sortField === field) {
      // Toggle direction if same field
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      // New field, default to ascending
      newDirection = "asc";
    }
    
    // Update state
    setSortField(field);
    setSortDirection(newDirection);
    
    // Reset to first page and fetch sorted data from backend
    setPage(0);
    fetchTrades(0, size, field, newDirection);
  };

  // No client-side sorting - backend handles it
  const displayTrades = filteredTrades;

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (code) params.set("code", code.trim());
    if (type && type !== "All") params.set("type", type.toLowerCase());
    if (minVolume) params.set("minVolume", String(parseInt(minVolume)));
    if (maxVolume) params.set("maxVolume", String(parseInt(maxVolume)));
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    return params;
  };


  // Save filters to localStorage whenever they change (but not on initial mount)
  // Note: fromDate and toDate are saved so user's manual selections are remembered
  // But they will be reset on page reload based on weekday/weekend logic
  useEffect(() => {
    if (!hasInitialLoad.current) return; // Skip saving on initial mount
    
    saveFiltersToStorage({
      code,
      type,
      minVolume,
      maxVolume,
      minPrice,
      maxPrice,
      fromDate, // Save fromDate so user's manual selection is remembered during session
      // Note: toDate is also saved, but will be reset on page reload
      page,
      size,
      sortField,
      sortDirection,
      chartFromDate,
      chartToDate, // Save chartToDate so user's selection is remembered
    });
  }, [code, type, minVolume, maxVolume, minPrice, maxPrice, fromDate, toDate, page, size, sortField, sortDirection, chartFromDate, chartToDate]);

  // Note: toDate is initialized by initializeDefaultDates useEffect above
  // It will be set to today if today is valid, or latest transaction date if not

  // Clear all filters and reset to defaults
  // Dates will be reset based on weekday/weekend logic (Case 1 or Case 2)
  const clearFilters = async () => {
    // Reset all filter states to defaults
    setCode("");
    setType("All");
    setMinVolume("");
    setMaxVolume("");
    setMinPrice("");
    setMaxPrice("");
    
    // Reset dates based on weekday/weekend logic
    const defaultDates = await getDefaultDates();
    setFromDate(defaultDates.fromDate);
    setToDate(defaultDates.toDate);
    
    // Reset chart dates to default one month range
    const today = getTodayDate();
    setChartFromDate(getOneMonthAgo());
    setChartToDate(today);
    setPage(0);
    setSortField("code");
    setSortDirection("asc");
    
    // Clear localStorage (user-specific)
    if (user?.id) {
      const key = getTradesFiltersStorageKey(user.id);
      localStorage.removeItem(key);
    }
    
    toast.success("Filters cleared");
    // Note: useEffect will automatically trigger fetchTrades when filter states change
  };

  // Load initial data when component mounts (with saved filters)
  // Wait for default date initialization before fetching
  useEffect(() => {
    if (!defaultDateInitialized) return; // Wait for date initialization
    
    // Mark that we've loaded initial data
    hasInitialLoad.current = true;
    
    // Fetch trades with saved filters
    fetchTrades(page, size, sortField, sortDirection);
    // Fetch chart data if code is selected
    if (code && code.trim() !== "") {
      fetchChartData();
      fetchOHLCData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDateInitialized]); // Run when default date is initialized

  // Auto-fetch when filter fields change (but not on initial mount)
  useEffect(() => {
    if (!hasInitialLoad.current) return; // Skip on initial mount

    setPage(0);
    fetchTrades(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, type, minVolume, maxVolume, minPrice, maxPrice, fromDate, toDate]); // Fetch when any filter changes

  // Fetch chart data when code or chart-specific date range changes (but not on initial mount)
  useEffect(() => {
    if (!hasInitialLoad.current) return; // Skip on initial mount
    
    // Only fetch if code is selected
    if (code && code.trim() !== "") {
      fetchChartData();
      fetchOHLCData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, chartFromDate, chartToDate]); // Fetch chart data when chart-specific filters change

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('trades.code')}</label>
              <Popover open={codeOpen} onOpenChange={setCodeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={codeOpen}
                    className="w-full justify-between"
                  >
                    {code || t('common.all')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder={t('trades.searchStock')} />
                    <CommandList>
                      <CommandEmpty>{t('trades.noStockFound')}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setCode("");
                            setCodeOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              code === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {t('common.all')}
                        </CommandItem>
                        {VN30_STOCKS.map((stock) => (
                          <CommandItem
                            key={stock}
                            value={stock}
                            onSelect={(currentValue) => {
                              const newCode = currentValue === code ? "" : currentValue.toUpperCase();
                              setCode(newCode);
                              setCodeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                code === stock ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {stock}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">{t('trades.type')}</label>
              <Select value={type} onValueChange={(value) => {
                setType(value);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('common.all')}</SelectItem>
                  <SelectItem value="Buy">{t('trades.buy')}</SelectItem>
                  <SelectItem value="Sell">{t('trades.sell')}</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">{t('trades.volumeRange')}</label>
              <Select
                value={`${minVolume || ''}|${maxVolume || ''}`}
                onValueChange={(v) => {
                  const [minV, maxV] = v.split("|");
                  setMinVolume(minV);
                  setMaxVolume(maxV);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="|">{t('common.all')}</SelectItem>
                  <SelectItem value="|1000">{"<=1000"}</SelectItem>
                  <SelectItem value="1000|5000">{"1000 - 5000"}</SelectItem>
                  <SelectItem value="5000|10000">{"5000 - 10000"}</SelectItem>
                  <SelectItem value="10000|100000">{"10000 - 100000"}</SelectItem>
                  <SelectItem value="100000|400000">{"100000 - 400000"}</SelectItem>
                  <SelectItem value="400000|1000000">{"400000 - 1000000"}</SelectItem>
                  <SelectItem value="1000000|">{">= 1000000"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Price Range</label>
              <Select
                value={`${minPrice || ''}|${maxPrice || ''}`}
                onValueChange={(v) => {
                  const [minP, maxP] = v.split("|");
                  setMinPrice(minP);
                  setMaxPrice(maxP);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="|">{t('common.all')}</SelectItem>
                  <SelectItem value="|10000">{"<=10,000"}</SelectItem>
                  <SelectItem value="10000|20000">{"10,000 - 20,000"}</SelectItem>
                  <SelectItem value="20000|50000">{"20,000 - 50,000"}</SelectItem>
                  <SelectItem value="50000|100000">{"50,000 - 100,000"}</SelectItem>
                  <SelectItem value="100000|200000">{"100,000 - 200,000"}</SelectItem>
                  <SelectItem value="200000|500000">{"200,000 - 500,000"}</SelectItem>
                  <SelectItem value="500000|">{">= 500,000"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">{t('trades.fromDate')}</label>
              <DatePicker
                key={`from-date-${fromDate}`}
                value={fromDate || getTodayDate()}
                onChange={setFromDate}
                placeholder="Select from date"
                maxDate={toDate || undefined}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">{t('trades.toDate')}</label>
              <DatePicker
                key={`to-date-${toDate}`}
                value={toDate || getTodayDate()}
                onChange={setToDate}
                placeholder="Select to date"
                minDate={fromDate || undefined}
              />
            </div>
            
          </div>
        </div>

        {/* Volume Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className={loading ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                {t('trades.totalVolume')}
                {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : totalVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 font-bold">{loading ? "..." : `${(buyCount + sellCount + unknownCount).toLocaleString()} ${t('trades.transactions')}`}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('trades.allMatchingTrades')}</p>
            </CardContent>
          </Card>

          <Card className={loading ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                {t('trades.buyVolume')}
                {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{loading ? "..." : buyVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 font-bold">{loading ? "..." : `${buyCount.toLocaleString()} ${t('trades.transactions')}`}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all" 
                    style={{ width: `${totalVolume > 0 ? (buyVolume / totalVolume * 100) : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalVolume > 0 ? ((buyVolume / totalVolume * 100).toFixed(1)) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className={loading ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                {t('trades.sellVolume')}
                {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{loading ? "..." : sellVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 font-bold">{loading ? "..." : `${sellCount.toLocaleString()} ${t('trades.transactions')}`}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all" 
                    style={{ width: `${totalVolume > 0 ? (sellVolume / totalVolume * 100) : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalVolume > 0 ? ((sellVolume / totalVolume * 100).toFixed(1)) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className={loading ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-gray-500" />
                Unknown Volume
                {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{loading ? "..." : unknownVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 font-bold">{loading ? "..." : `${unknownCount.toLocaleString()} ${t('trades.transactions')}`}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                  <div 
                    className="h-full bg-gray-500 rounded-full transition-all" 
                    style={{ width: `${totalVolume > 0 ? (unknownVolume / totalVolume * 100) : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalVolume > 0 ? ((unknownVolume / totalVolume * 100).toFixed(1)) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div className="flex justify-end items-center gap-2 p-2 border-b bg-muted/30">
            <Button
              onClick={clearFilters}
              variant="outline"
              size="sm"
              className="h-8 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Clear Filter
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Reset dates based on weekday/weekend logic when reloading
                  const defaultDates = await getDefaultDates();
                  
                  // Update dates in state
                  setFromDate(defaultDates.fromDate);
                  setToDate(defaultDates.toDate);
                  
                  // Reset to first page
                  setPage(0);
                  
                  // Fetch trades immediately with the new dates (using date override)
                  // This ensures we use the new dates even before state updates
                  fetchTrades(0, size, sortField, sortDirection, {
                    fromDate: defaultDates.fromDate,
                    toDate: defaultDates.toDate
                  });
                  
                  // Also refresh chart data if a code is selected
                  if (code && code.trim() !== "") {
                    fetchChartData();
                    fetchOHLCData();
                  }
                  
                  toast.success("Data reloaded");
                } catch (error) {
                  console.error("Error reloading data:", error);
                  toast.error("Failed to reload data");
                }
              }}
              variant="outline"
              size="sm"
              className="h-8 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Reload Data
            </Button>
          </div>
          <Table className={loading ? "opacity-50 pointer-events-none" : ""}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("code")}
                  >
                    {t('trades.code')}
                    {sortField === "code" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-[280px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("time")}
                  >
                    {t('trades.time')}
                    {sortField === "time" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="w-[50px] text-center">{t('trades.side')}</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("price")}
                  >
                    {t('trades.price')}
                    {sortField === "price" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("volume")}
                  >
                    {t('trades.volume')}
                    {sortField === "volume" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-bold">{trade.code}</TableCell>
                  <TableCell className="font-mono text-xs">{trade.tradeTime} {trade.tradeDate}</TableCell>
                  <TableCell className="text-center">
                    <span 
                      className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${
                        trade.side === "buy" 
                          ? "bg-green-600 text-white" 
                          : trade.side === "sell"
                          ? "bg-red-600 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {trade.side === "buy" ? "B" : trade.side === "sell" ? "S" : "U"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {trade.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {trade.volume.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {totalElements === 0 ? (
              t('trades.noResults')
            ) : (
              <div className="flex items-center gap-4">
                <span>Page size: <span className="font-semibold">{size}</span></span>
                <span>•</span>
                <span>Current page: <span className="font-semibold">{page + 1}</span></span>
                <span>•</span>
                <span>Total pages: <span className="font-semibold">{totalPages}</span></span>
                <span>•</span>
                <span>Total records: <span className="font-semibold">{totalElements.toLocaleString()}</span></span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={String(size)} onValueChange={(v) => { const n = Number(v); setSize(n); setPage(0); fetchTrades(0, n); }}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page <= 0 || loading} onClick={() => { const p = page - 1; setPage(p); fetchTrades(p, size); }}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => { const p = page + 1; setPage(p); fetchTrades(p, size); }}>Next</Button>
          </div>
        </div>

        {/* Price & Volume Chart - Only show when a specific stock code is selected */}
        {code && code.trim() !== "" && (
          <div className="mb-6 mt-8">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Chart Date Range</CardTitle>
                <CardDescription>
                  Select a date range for the price & volume chart (independent from trade table filters)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">From Date</label>
                    <DatePicker
                      value={chartFromDate && isValidDateFormat(chartFromDate) ? chartFromDate : getOneMonthAgo()}
                      onChange={setChartFromDate}
                      placeholder="Select from date"
                      maxDate={chartToDate && isValidDateFormat(chartToDate) ? chartToDate : undefined}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">To Date</label>
                    <DatePicker
                      value={chartToDate && isValidDateFormat(chartToDate) ? chartToDate : getTodayDate()}
                      onChange={setChartToDate}
                      placeholder="Select to date"
                      minDate={chartFromDate && isValidDateFormat(chartFromDate) ? chartFromDate : undefined}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <DailyPriceVolumeChart 
              data={chartData} 
              code={code}
              loading={chartLoading}
              onRefresh={fetchChartData}
            />
            
            {/* Daily OHLC Chart - Below Price & Volume Chart */}
            <div className="mt-6">
              <DailyOHLCChart 
                data={ohlcData} 
                code={code}
                loading={ohlcLoading}
                onRefresh={fetchOHLCData}
              />
            </div>
          </div>
        )}

      </main>
      
      {/* Date Range Validation Alert Dialog */}
      <AlertDialog open={showDateRangeAlert} onOpenChange={setShowDateRangeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Date Range Limit Exceeded
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              {dateRangeError?.message || "The date range you selected exceeds one month. Please upgrade to VIP account to query larger date ranges."}
              {dateRangeError?.minimumAllowedFromDate && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-1">Date Range Details:</p>
                  <p className="text-xs text-muted-foreground">
                    Selected From Date: <span className="font-mono">{dateRangeError.fromDate}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Selected To Date: <span className="font-mono">{dateRangeError.toDate}</span>
                  </p>
                  <p className="text-xs font-medium mt-2 text-orange-600">
                    Minimum Allowed From Date: <span className="font-mono">{dateRangeError.minimumAllowedFromDate}</span>
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDateRangeAlert(false)}>
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Trades;
