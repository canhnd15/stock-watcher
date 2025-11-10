import { useState, useEffect, useMemo } from "react";
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
import { getIntradayPrice, IntradayPrice } from "@/lib/api";
import { toast } from "sonner";

interface RealtimePriceTrackingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vn30Codes: string[];
}

const chartConfig = {
  averagePrice: {
    label: "Average Price (VND)",
    color: "#3b82f6", // Blue
  },
};

export function RealtimePriceTracking({
  open,
  onOpenChange,
  vn30Codes,
}: RealtimePriceTrackingProps) {
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [priceData, setPriceData] = useState<IntradayPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    highestPrice: number;
    lowestPrice: number;
    currentPrice: number;
  } | null>(null);
  const [stockSelectOpen, setStockSelectOpen] = useState(false);

  // Fetch intraday price data
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

  // Load data when stock is selected
  useEffect(() => {
    if (open && selectedCode) {
      fetchPriceData(selectedCode);
    }
  }, [selectedCode, open]);

  // Polling for real-time updates (every 30 seconds)
  useEffect(() => {
    if (!open || !selectedCode) return;

    const interval = setInterval(() => {
      fetchPriceData(selectedCode);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [open, selectedCode]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCode("");
      setPriceData([]);
      setStats(null);
      setStockSelectOpen(false);
    }
  }, [open]);

  // Format chart data
  const chartData = useMemo(() => {
    return priceData.map((item) => ({
      time: item.time,
      averagePrice: item.averagePrice,
    }));
  }, [priceData]);

  // Calculate Y-axis domain
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0 || !stats) return [0, "auto"];
    
    const minPrice = stats.lowestPrice;
    const maxPrice = stats.highestPrice;
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) return [0, "auto"];
    
    // Add 10% padding
    const padding = priceRange * 0.1;
    const domainMin = Math.max(0, minPrice - padding);
    const domainMax = maxPrice + padding;
    
    return [domainMin, domainMax];
  }, [chartData, stats]);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "0";
    return Math.round(price).toLocaleString("de-DE"); // Use German format (period as thousands separator)
  };

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
          {/* Stock Selection */}
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
              <PopoverContent className="w-[250px] p-0">
                <Command>
                  <CommandInput placeholder="Tìm kiếm mã cổ phiếu..." />
                  <CommandList>
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
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Stats Cards */}
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
          {loading && priceData.length === 0 ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
                {selectedCode
                  ? "Không có dữ liệu cho mã cổ phiếu này"
                  : "Vui lòng chọn mã cổ phiếu để xem biểu đồ"}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedCode} - Biểu đồ giá theo thời gian (Trung bình mỗi 10 phút)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <LineChart
                    data={chartData}
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
                      domain={yAxisDomain}
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
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#3b82f6" }}
                      activeDot={{ r: 6, fill: "#3b82f6" }}
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

