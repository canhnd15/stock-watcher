import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
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
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Loader2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getIntradayPrice, getBatchIntradayPrice, IntradayPrice, api } from "@/lib/api";
import { toast } from "sonner";

interface RealtimePriceTrackingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vn30Codes: string[];
}

type ViewMode = "single" | "all-tracked";

interface TrackedStock {
  id: number;
  code: string;
  active: boolean;
}

// Color palette for multiple lines
const STOCK_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Orange
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange-600
  "#84cc16", // Lime-500
  "#6366f1", // Indigo-500
  "#a855f7", // Purple-500
];

const chartConfig = {
  averagePrice: {
    label: "Average Price (VND)",
    color: "#3b82f6",
  },
};

export function RealtimePriceTracking({
  open,
  onOpenChange,
  vn30Codes,
}: RealtimePriceTrackingProps) {
  // Mode selection
  const [viewMode, setViewMode] = useState<ViewMode>("single");
  
  // Single stock mode states
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [priceData, setPriceData] = useState<IntradayPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockSelectOpen, setStockSelectOpen] = useState(false);
  
  // All tracked stocks mode states
  const [trackedStocks, setTrackedStocks] = useState<TrackedStock[]>([]);
  const [multiPriceData, setMultiPriceData] = useState<Record<string, IntradayPrice[]>>({});
  const [selectedStockCode, setSelectedStockCode] = useState<string>("");
  const [loadingMulti, setLoadingMulti] = useState(false);
  const [loadingTrackedStocks, setLoadingTrackedStocks] = useState(false);
  
  // Stats (shared between modes)
  const [stats, setStats] = useState<{
    highestPrice: number;
    lowestPrice: number;
    currentPrice: number;
  } | null>(null);

  // Load tracked stocks
  const loadTrackedStocks = useCallback(async () => {
    setLoadingTrackedStocks(true);
    try {
      const response = await api.get("/api/tracked-stocks");
      if (!response.ok) throw new Error("Failed to load tracked stocks");
      const stocks: TrackedStock[] = await response.json();
      const activeStocks = stocks.filter(s => s.active);
      setTrackedStocks(activeStocks);
      
      // Select first stock by default if no stock is selected
      if (activeStocks.length > 0) {
        setSelectedStockCode(prev => prev || activeStocks[0].code);
      }
    } catch (error) {
      console.error("Error loading tracked stocks:", error);
      toast.error("Failed to load tracked stocks");
    } finally {
      setLoadingTrackedStocks(false);
    }
  }, []);

  // Fetch single stock price data
  const fetchPriceData = async (code: string) => {
    if (!code) return;
    
    setLoading(true);
    try {
      const data = await getIntradayPrice(code);
      setPriceData(data);
      
      // Calculate stats
      if (data.length > 0) {
        const highestPrices = data.map((d) => d.highestPrice).filter((p) => p > 0);
        const lowestPrices = data.map((d) => d.lowestPrice).filter((p) => p > 0);
        const currentPrice = data[data.length - 1]?.averagePrice || 0;
        
        if (highestPrices.length > 0 && lowestPrices.length > 0) {
          setStats({
            highestPrice: Math.max(...highestPrices),
            lowestPrice: Math.min(...lowestPrices),
            currentPrice: currentPrice,
          });
        } else {
          setStats(null);
        }
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error("Error fetching intraday price data:", error);
      toast.error(`Failed to load price data for ${code}`);
      setPriceData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch batch price data for all tracked stocks
  const fetchBatchPriceData = useCallback(async () => {
    if (trackedStocks.length === 0) return;
    
    setLoadingMulti(true);
    try {
      const codes = trackedStocks.map(s => s.code);
      const data = await getBatchIntradayPrice(codes);
      setMultiPriceData(data);
    } catch (error) {
      console.error("Error fetching batch price data:", error);
      toast.error("Failed to load price data for tracked stocks");
      setMultiPriceData({});
      setStats(null);
    } finally {
      setLoadingMulti(false);
    }
  }, [trackedStocks]);


  // Load tracked stocks when mode changes to "all-tracked"
  useEffect(() => {
    if (open && viewMode === "all-tracked" && trackedStocks.length === 0) {
      loadTrackedStocks();
    }
  }, [open, viewMode, trackedStocks.length, loadTrackedStocks]);

  // Fetch data when tracked stocks are loaded
  useEffect(() => {
    if (viewMode === "all-tracked" && trackedStocks.length > 0) {
      fetchBatchPriceData();
    }
  }, [viewMode, trackedStocks, fetchBatchPriceData]);

  // Calculate stats for selected stock in all-tracked mode
  useEffect(() => {
    if (viewMode === "all-tracked" && selectedStockCode && multiPriceData[selectedStockCode]) {
      const prices = multiPriceData[selectedStockCode];
      if (prices.length > 0) {
        const highestPrices = prices.map((p) => p.highestPrice).filter((p) => p > 0);
        const lowestPrices = prices.map((p) => p.lowestPrice).filter((p) => p > 0);
        const currentPrice = prices[prices.length - 1]?.averagePrice || 0;
        
        if (highestPrices.length > 0 && lowestPrices.length > 0) {
          setStats({
            highestPrice: Math.max(...highestPrices),
            lowestPrice: Math.min(...lowestPrices),
            currentPrice: currentPrice,
          });
        } else {
          setStats(null);
        }
      } else {
        setStats(null);
      }
    } else if (viewMode === "all-tracked" && !selectedStockCode) {
      setStats(null);
    }
  }, [viewMode, selectedStockCode, multiPriceData]);

  // Load data when stock is selected (single mode)
  useEffect(() => {
    if (open && viewMode === "single" && selectedCode) {
      fetchPriceData(selectedCode);
    }
  }, [selectedCode, open, viewMode]);

  // Polling for real-time updates (every 30 seconds)
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      if (viewMode === "single" && selectedCode) {
        fetchPriceData(selectedCode);
      } else if (viewMode === "all-tracked" && trackedStocks.length > 0) {
        fetchBatchPriceData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [open, viewMode, selectedCode, trackedStocks.length, fetchBatchPriceData]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCode("");
      setPriceData([]);
      setMultiPriceData({});
      setStats(null);
      setStockSelectOpen(false);
      setSelectedStockCode("");
    }
  }, [open]);

  // Format chart data for single mode
  const singleChartData = useMemo(() => {
    return priceData.map((item) => ({
      time: item.time,
      averagePrice: item.averagePrice,
    }));
  }, [priceData]);

  // Format chart data for multi mode - only show selected stock
  const multiChartData = useMemo(() => {
    if (!selectedStockCode || !multiPriceData[selectedStockCode]) {
      return [];
    }
    
    const prices = multiPriceData[selectedStockCode];
    return prices.map((item) => ({
      time: item.time,
      averagePrice: item.averagePrice,
    }));
  }, [multiPriceData, selectedStockCode]);

  // Calculate Y-axis domain for single mode
  const singleYAxisDomain = useMemo(() => {
    if (singleChartData.length === 0 || !stats) return [0, "auto"];
    
    const minPrice = stats.lowestPrice;
    const maxPrice = stats.highestPrice;
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return [0, "auto"];
    
    const padding = priceRange * 0.1;
    const domainMin = Math.max(0, minPrice - padding);
    const domainMax = maxPrice + padding;
    
    return [domainMin, domainMax];
  }, [singleChartData, stats]);

  // Calculate Y-axis domain for multi mode - same as single mode
  const multiYAxisDomain = useMemo(() => {
    if (multiChartData.length === 0 || !stats) return [0, "auto"];
    
    const minPrice = stats.lowestPrice;
    const maxPrice = stats.highestPrice;
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return [0, "auto"];
    
    const padding = priceRange * 0.1;
    const domainMin = Math.max(0, minPrice - padding);
    const domainMax = maxPrice + padding;
    
    return [domainMin, domainMax];
  }, [multiChartData, stats]);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "0";
    return Math.round(price).toLocaleString("de-DE");
  };

  const isLoading = viewMode === "single" ? loading : loadingMulti || loadingTrackedStocks;
  const hasData = viewMode === "single" 
    ? singleChartData.length > 0 
    : multiChartData.length > 0 && selectedStockCode !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price Tracking Realtime</DialogTitle>
          <DialogDescription>
            Theo dõi giá theo thời gian thực trong phiên giao dịch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Chế độ hiển thị:</Label>
            <RadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="cursor-pointer">Single Stock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all-tracked" id="all-tracked" />
                <Label htmlFor="all-tracked" className="cursor-pointer">All Tracked Stocks</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Single Stock Mode */}
          {viewMode === "single" && (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Chọn mã cổ phiếu:</label>
              <Popover open={stockSelectOpen} onOpenChange={setStockSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={stockSelectOpen}
                    className="w-64 justify-between"
                  >
                    {selectedCode || "Chọn mã cổ phiếu"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command className="rounded-lg border-none overflow-visible">
                    <CommandInput placeholder="Tìm kiếm mã cổ phiếu..." />
                    <div 
                      className="max-h-[300px] overflow-y-auto overflow-x-hidden"
                      style={{ 
                        maxHeight: '300px', 
                        overflowY: 'auto', 
                        overflowX: 'hidden',
                        WebkitOverflowScrolling: 'touch'
                      }}
                      onWheel={(e) => {
                        // Prevent event from bubbling to parent
                        e.stopPropagation();
                      }}
                    >
                      <CommandList className="!overflow-visible">
                        <CommandEmpty>Không tìm thấy mã cổ phiếu.</CommandEmpty>
                        <CommandGroup>
                          {vn30Codes.map((code) => (
                            <CommandItem
                              key={code}
                              value={code}
                              onSelect={(currentValue) => {
                                setSelectedCode(currentValue.toUpperCase());
                                setStockSelectOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCode === code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {code}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* All Tracked Stocks Mode - Radio buttons for stock selection */}
          {viewMode === "all-tracked" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tracked Stocks:</Label>
              {loadingTrackedStocks ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading tracked stocks...</span>
                </div>
              ) : trackedStocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracked stocks found. Please add stocks to track first.</p>
              ) : (
                <RadioGroup value={selectedStockCode} onValueChange={setSelectedStockCode}>
                  <div className="flex flex-wrap gap-4 p-4 border rounded-lg">
                    {trackedStocks.map((stock, index) => {
                      const color = STOCK_COLORS[index % STOCK_COLORS.length];
                      const isSelected = selectedStockCode === stock.code;
                      
                      return (
                        <div key={stock.code} className="flex items-center gap-2">
                          <RadioGroupItem value={stock.code} id={`stock-${stock.code}`} />
                          <div 
                            className="w-4 h-1 rounded" 
                            style={{ backgroundColor: color }}
                          />
                          <Label 
                            htmlFor={`stock-${stock.code}`} 
                            className="text-sm font-medium cursor-pointer"
                          >
                            {stock.code}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              )}
            </div>
          )}

          {/* Stats Cards - Show in both modes when stock is selected */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Giá cao nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(stats.highestPrice)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Giá thấp nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatPrice(stats.lowestPrice)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Giá hiện tại
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPrice(stats.currentPrice)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chart */}
          {isLoading && !hasData ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasData ? (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
                {viewMode === "single" 
                  ? (selectedCode ? "Không có dữ liệu cho mã cổ phiếu này" : "Vui lòng chọn mã cổ phiếu để xem biểu đồ")
                  : (trackedStocks.length === 0 ? "Không có tracked stocks" : (selectedStockCode ? "Không có dữ liệu cho mã cổ phiếu này" : "Vui lòng chọn một stock để hiển thị"))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {viewMode === "single" 
                    ? `${selectedCode} - Biểu đồ giá theo thời gian (Trung bình mỗi 10 phút)`
                    : `${selectedStockCode} - Biểu đồ giá theo thời gian (Trung bình mỗi 10 phút)`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <LineChart
                    data={viewMode === "single" ? singleChartData : multiChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="time"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis
                      domain={viewMode === "single" ? singleYAxisDomain : multiYAxisDomain}
                      label={{
                        value: "Price (VND)",
                        angle: -90,
                        position: "insideLeft",
                        style: { textAnchor: "middle" },
                      }}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: any) => {
                            const numValue = Number(value);
                            return (
                              <span className="font-mono font-medium tabular-nums text-foreground">
                                {formatPrice(numValue)} VND
                              </span>
                            );
                          }}
                          labelFormatter={(label) => `Thời gian: ${label}`}
                        />
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="averagePrice"
                      stroke={viewMode === "single" 
                        ? "#3b82f6" 
                        : STOCK_COLORS[trackedStocks.findIndex(s => s.code === selectedStockCode) % STOCK_COLORS.length] || "#3b82f6"}
                      strokeWidth={2}
                      dot={{ r: 4, fill: viewMode === "single" 
                        ? "#3b82f6" 
                        : STOCK_COLORS[trackedStocks.findIndex(s => s.code === selectedStockCode) % STOCK_COLORS.length] || "#3b82f6"}}
                      activeDot={{ r: 6, fill: viewMode === "single" 
                        ? "#3b82f6" 
                        : STOCK_COLORS[trackedStocks.findIndex(s => s.code === selectedStockCode) % STOCK_COLORS.length] || "#3b82f6"}}
                      name="Giá trung bình (VND)"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
