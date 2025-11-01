import { useState, useEffect } from "react";
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
import { Loader2, Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Activity, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket, SignalNotification } from "@/hooks/useWebSocket.ts";
import { api } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";

interface Trade {
  id: string;
  tradeTime: string; // Format: "HH:mm:ss"
  tradeDate: string; // Format: "DD/MM/YYYY"
  code: string;
  side: "buy" | "sell";
  price: number;
  volume: number;
}

// VN30 Stock Codes
const VN30_STOCKS = [
  "ACB", "BCM", "CTG", "DGC", "FPT", "BFG", "HDB", "HPG", "MWG",
  "LPB", "MBB", "MSN", "PLX", "SAB", "SHB", "SSB", "SSI", "VRE",
  "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB",
  "DXG", "KDH"
];

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

  const [code, setCode] = useState(""); // All by default (empty)
  const [codeOpen, setCodeOpen] = useState(false);
  const [type, setType] = useState("All");
  const [minVolume, setMinVolume] = useState("");
  const [maxVolume, setMaxVolume] = useState("");
  const [fromDate, setFromDate] = useState(getTodayDate()); // yyyy-MM-dd - default to today
  const [toDate, setToDate] = useState(getTodayDate());     // yyyy-MM-dd - default to today
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<"time" | "price" | "volume" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Volume statistics
  const [totalVolume, setTotalVolume] = useState(0);
  const [buyVolume, setBuyVolume] = useState(0);
  const [sellVolume, setSellVolume] = useState(0);
  
  // Transaction counts
  const [buyCount, setBuyCount] = useState(0);
  const [sellCount, setSellCount] = useState(0);
  
  // WebSocket for signals
  const { isConnected, signals, clearSignals } = useWebSocket();
  const [refreshingSignals, setRefreshingSignals] = useState(false);

  const handleRefreshSignals = async () => {
    try {
      setRefreshingSignals(true);
      
      // Clear old signals first
      clearSignals();
      
      const response = await api.post('/api/signals/refresh');
      
      if (!response.ok) {
        throw new Error('Failed to refresh signals');
      }
      
      const data = await response.json();
      toast.success(data.message || 'Signals refreshed successfully');
    } catch (error) {
      console.error('Error refreshing signals:', error);
      toast.error('Failed to refresh signals');
    } finally {
      setRefreshingSignals(false);
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
          return {
            id: String(t.id ?? `${t.code}-${t.tradeDate}-${t.tradeTime}`),
            tradeTime: t.tradeTime ?? "", // Format: "HH:mm:ss"
            tradeDate: t.tradeDate ?? "", // Format: "DD/MM/YYYY"
            code: t.code ?? "",
            side: (t.side ?? "").toLowerCase() === "buy" ? "buy" : "sell",
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
        
        const buyVol = buyTrades.reduce((sum, t) => sum + t.volume, 0);
        const sellVol = sellTrades.reduce((sum, t) => sum + t.volume, 0);
        
        // If backend provided stats, prefer them; else compute from page items
        setTotalVolume(Number(response?.totalVolume ?? (buyVol + sellVol)));
        setBuyVolume(Number(response?.buyVolume ?? buyVol));
        setSellVolume(Number(response?.sellVolume ?? sellVol));
        setBuyCount(Number(response?.buyCount ?? buyTrades.length));
        setSellCount(Number(response?.sellCount ?? sellTrades.length));
      })
      .catch(() => toast.error(t('error.loadFailed')))
      .finally(() => setLoading(false));
  };

  const handleSort = (field: "time" | "price" | "volume") => {
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


  // Auto-fetch when filter fields change
  useEffect(() => {
    setPage(0);
    fetchTrades(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, type, minVolume, maxVolume, fromDate, toDate]); // Fetch when any filter changes

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
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">{t('trades.toDate')}</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Volume Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <TableHead className="w-[120px]">{t('trades.code')}</TableHead>
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
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {trade.side === "buy" ? "B" : "S"}
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

        {/* Signals Section */}
        <div className="mt-12 pt-8 border-t">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-2xl font-bold">{t('signals.realTimeSignals')}</h2>
                  <p className="text-sm text-muted-foreground">{t('signals.liveSignalsDescription')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Refresh Button */}
                <Button
                  variant="outline"
                  onClick={handleRefreshSignals}
                  disabled={refreshingSignals || !isConnected}
                  className="border-2"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshingSignals ? 'animate-spin' : ''}`} />
                  {t('signals.refresh')}
                </Button>
                
                {/* Connection Status */}
                <Card className={`${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} transition-colors`}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-sm font-semibold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                      {isConnected ? t('signals.active') : t('signals.disconnected')}
                    </span>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Clear Button */}
            {signals.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearSignals}
                className="mb-4"
              >
                <X className="h-4 w-4 mr-2" />
                {t('signals.clear', { count: signals.length })}
              </Button>
            )}
          </div>

          {/* Signals Table */}
          {signals.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">{t('trades.code')}</TableHead>
                      <TableHead className="w-[100px]">{t('signals.title')}</TableHead>
                      <TableHead className="w-[80px]">{t('signals.score')}</TableHead>
                      <TableHead className="w-[150px]">{t('signals.time')}</TableHead>
                      <TableHead className="text-right">{t('signals.buyVolume')}</TableHead>
                      <TableHead className="text-right">{t('signals.sellVolume')}</TableHead>
                      <TableHead className="text-right">{t('signals.price')}</TableHead>
                      <TableHead className="text-right">{t('signals.change')}</TableHead>
                      <TableHead>{t('signals.reason')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signals.map((signal, index) => (
                      <TableRow 
                        key={`${signal.code}-${signal.timestamp}-${index}`}
                        className={`${signal.signalType === 'BUY' ? 'bg-green-50/50' : 'bg-red-50/50'} animate-in fade-in duration-300`}
                      >
                        <TableCell className="font-bold">{signal.code}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={signal.signalType === 'BUY' ? 'default' : 'destructive'}
                            className={`${signal.signalType === 'BUY' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          >
                            {signal.signalType === 'BUY' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {signal.signalType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            ⭐ {signal.score}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(signal.timestamp).toLocaleString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-700">
                          {signal.buyVolume.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-700">
                          {signal.sellVolume.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {signal.lastPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={signal.priceChange > 0 ? 'default' : 'destructive'}
                            className={`${signal.priceChange > 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          >
                            {signal.priceChange > 0 ? '+' : ''}{signal.priceChange.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {signal.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            /* No Signals Message */
            <Card className="max-w-md mx-auto">
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4 opacity-50">📊</div>
                <h3 className="text-lg font-semibold mb-2">
                  {isConnected ? t('signals.listening') : t('signals.connecting')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('signals.signalsDetected')}
                </p>
                {isConnected && (
                  <div className="mt-6 text-xs text-muted-foreground space-y-1">
                    <p>{t('signals.multiFactorAnalysis')}</p>
                    <p>{t('signals.analyzingLast30Minutes')}</p>
                    <p>{t('signals.minimumScoreThreshold')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Trades;
