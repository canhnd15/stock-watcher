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
import Header from "@/components/Header.tsx";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Activity, X, RefreshCw, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
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
  "ACB", "BCM", "CTG", "DGC", "FPT", "BFG", "HDB", "HPG", "MWG",
  "LPB", "MBB", "MSN", "PLX", "SAB", "SHB", "SSB", "SSI", "VRE",
  "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB",
  "DXG", "KDH"
];

// LocalStorage key for saving trade filters
const TRADES_FILTERS_STORAGE_KEY = 'trades_filters';

interface TradeFilters {
  code: string;
  type: string;
  minVolume: string;
  maxVolume: string;
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
  
  // Get today's date in yyyy-MM-dd format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  // Load filters from localStorage
  const loadFiltersFromStorage = (): Partial<TradeFilters> => {
    try {
      const stored = localStorage.getItem(TRADES_FILTERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading filters from localStorage:', error);
    }
    return {};
  };

  // Save filters to localStorage
  const saveFiltersToStorage = (filters: Partial<TradeFilters>) => {
    try {
      localStorage.setItem(TRADES_FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  };

  // Load saved filters or use defaults
  const savedFilters = loadFiltersFromStorage();
  const defaultFromDate = savedFilters.fromDate || getTodayDate();
  // Always use today's date for toDate (not saved in localStorage)
  const defaultToDate = getTodayDate();
  const defaultChartFromDate = savedFilters.chartFromDate || getNTradingDaysBack(5);
  // Always use today's date for chartToDate (not saved in localStorage)
  const defaultChartToDate = getTodayDate();

  const [code, setCode] = useState(savedFilters.code || ""); // All by default (empty)
  const [codeOpen, setCodeOpen] = useState(false);
  const [type, setType] = useState(savedFilters.type || "All");
  const [minVolume, setMinVolume] = useState(savedFilters.minVolume || "");
  const [maxVolume, setMaxVolume] = useState(savedFilters.maxVolume || "");
  const [fromDate, setFromDate] = useState(defaultFromDate); // yyyy-MM-dd
  const [toDate, setToDate] = useState(defaultToDate);     // yyyy-MM-dd
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
    const chartFrom = chartFromDate || getNTradingDaysBack(5);
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
    const chartFrom = chartFromDate || getNTradingDaysBack(5);
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

  const fetchTrades = (nextPage = page, nextSize = size, sortFieldParam = sortField, sortDirectionParam = sortDirection) => {
    const params = new URLSearchParams();
    if (code) params.set("code", code.trim());
    if (type && type !== "All") params.set("type", type.toLowerCase());
    if (minVolume) params.set("minVolume", String(parseInt(minVolume)));
    if (maxVolume) params.set("maxVolume", String(parseInt(maxVolume)));
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
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
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load trades");
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
  // Note: toDate and chartToDate are not saved - they always default to today
  useEffect(() => {
    if (!hasInitialLoad.current) return; // Skip saving on initial mount
    
    saveFiltersToStorage({
      code,
      type,
      minVolume,
      maxVolume,
      fromDate,
      // toDate is not saved - always uses today's date
      page,
      size,
      sortField,
      sortDirection,
      chartFromDate,
      // chartToDate is not saved - always uses today's date
    });
  }, [code, type, minVolume, maxVolume, fromDate, page, size, sortField, sortDirection, chartFromDate]);

  // Reset toDate and chartToDate to today when component mounts
  // This ensures they always default to current date on page load/reload
  useEffect(() => {
    const today = getTodayDate();
    setToDate(today);
    setChartToDate(today);
  }, []);

  // Load initial data when component mounts (with saved filters)
  useEffect(() => {
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
  }, []); // Only run on mount

  // Auto-fetch when filter fields change (but not on initial mount)
  useEffect(() => {
    if (!hasInitialLoad.current) return; // Skip on initial mount

    setPage(0);
    fetchTrades(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, type, minVolume, maxVolume, fromDate, toDate]); // Fetch when any filter changes

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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <label className="text-sm font-medium mb-1 block">{t('trades.fromDate')}</label>
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                placeholder="Select from date"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">{t('trades.toDate')}</label>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                placeholder="Select to date"
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
                      value={chartFromDate}
                      onChange={setChartFromDate}
                      placeholder="Select from date"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">To Date</label>
                    <DatePicker
                      value={chartToDate}
                      onChange={setChartToDate}
                      placeholder="Select to date"
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
    </div>
  );
};

export default Trades;
