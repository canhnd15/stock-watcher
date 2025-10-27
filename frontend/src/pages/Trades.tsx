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
import { Loader2, Check, ChevronsUpDown, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Activity, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket, SignalNotification } from "@/hooks/useWebSocket.ts";

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
  // Get today's date in yyyy-MM-dd format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [code, setCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [type, setType] = useState("All");
  const [minVolume, setMinVolume] = useState("");
  const [maxVolume, setMaxVolume] = useState("");
  const [ingestCode, setIngestCode] = useState("");
  const [ingestCodeOpen, setIngestCodeOpen] = useState(false);
  const [fromDate, setFromDate] = useState(getTodayDate()); // yyyy-MM-dd - default to today
  const [toDate, setToDate] = useState(getTodayDate());     // yyyy-MM-dd - default to today
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortField, setSortField] = useState<"time" | "price" | "volume" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Volume statistics
  const [totalVolume, setTotalVolume] = useState(0);
  const [buyVolume, setBuyVolume] = useState(0);
  const [sellVolume, setSellVolume] = useState(0);
  const [otherVolume, setOtherVolume] = useState(0);
  
  // WebSocket for signals
  const { isConnected, signals, clearSignals } = useWebSocket();

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
    fetch(`http://localhost:8899/api/trades?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load trades");
        return r.json();
      })
      .then((response) => {
        // New response structure: { trades: { content: [...], ... }, totalVolume, buyVolume, sellVolume, otherVolume }
        const tradesPage = response?.trades || {};
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
        
        // Parse pagination data from trades object
        setTotalElements(Number(tradesPage?.totalElements ?? 0));
        setTotalPages(Number(tradesPage?.totalPages ?? 0));
        setPage(Number(tradesPage?.number ?? nextPage));
        setSize(Number(tradesPage?.size ?? nextSize));
        
        // Update volume statistics
        setTotalVolume(Number(response?.totalVolume ?? 0));
        setBuyVolume(Number(response?.buyVolume ?? 0));
        setSellVolume(Number(response?.sellVolume ?? 0));
        setOtherVolume(Number(response?.otherVolume ?? 0));
      })
      .catch(() => toast.error("Failed to load trades"))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => {
    setPage(0);
    fetchTrades(0, size);
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

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = buildFilterParams();
      const resp = await fetch(`http://localhost:8899/api/trades/export?${params.toString()}`);
      if (!resp.ok) throw new Error("Failed to export");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trades-export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Exported trades to Excel");
    } catch {
      toast.error("Failed to export trades");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      setImporting(true);
      const form = new FormData();
      form.append('file', importFile);
      const resp = await fetch('http://localhost:8899/api/trades/import', { method: 'POST', body: form });
      if (!resp.ok) throw new Error('Failed');
      const text = await resp.text();
      toast.success(text || 'Imported successfully');
      setImportFile(null);
      fetchTrades(0, size);
    } catch {
      toast.error("Failed to import trades");
    } finally {
      setImporting(false);
    }
  };

  const handleIngest = () => {
    if (ingestCode) {
      setIngesting(true);
      
      // If "All" is selected, call /ingest/all endpoint
      if (ingestCode === "All") {
        fetch(`http://localhost:8899/api/trades/ingest/all`, { method: "POST" })
          .then((r) => {
            if (!r.ok) throw new Error("Failed");
            return r.text();
          })
          .then((message) => {
            toast.success(message || "Ingestion completed for all stocks");
            setIngestCode("");
          })
          .catch(() => toast.error("Failed to ingest all stocks"))
          .finally(() => setIngesting(false));
      } else {
        // Otherwise, call /ingest/{code} endpoint
        const c = ingestCode.trim().toUpperCase();
        fetch(`http://localhost:8899/api/trades/ingest/${encodeURIComponent(c)}`, { method: "POST" })
          .then((r) => {
            if (!r.ok) throw new Error("Failed");
            toast.success(`Ingestion completed for ${c}`);
            setIngestCode("");
          })
          .catch(() => toast.error(`Failed to ingest ${c}`))
          .finally(() => setIngesting(false));
      }
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchTrades(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Code</label>
              <Popover open={codeOpen} onOpenChange={setCodeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={codeOpen}
                    className="w-full justify-between"
                  >
                    {code || "Select stock..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search stock..." />
                    <CommandList>
                      <CommandEmpty>No stock found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setCode("");
                            setCodeOpen(false);
                            setPage(0);
                            setTimeout(() => fetchTrades(0, size), 0);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              code === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All
                        </CommandItem>
                        {VN30_STOCKS.map((stock) => (
                          <CommandItem
                            key={stock}
                            value={stock}
                            onSelect={(currentValue) => {
                              const newCode = currentValue === code ? "" : currentValue.toUpperCase();
                              setCode(newCode);
                              setCodeOpen(false);
                              setPage(0);
                              setTimeout(() => fetchTrades(0, size), 0);
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
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={type} onValueChange={(value) => {
                setType(value);
                setPage(0);
                setTimeout(() => fetchTrades(0, size), 0);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Volume Range</label>
              <Select
                value={`${minVolume || ''}|${maxVolume || ''}`}
                onValueChange={(v) => {
                  const [minV, maxV] = v.split("|");
                  setMinVolume(minV);
                  setMaxVolume(maxV);
                  setPage(0);
                  fetchTrades(0, size);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="|">All</SelectItem>
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
              <label className="text-sm font-medium mb-1 block">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleSearch} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleExport} disabled={exporting}>
                {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Export Excel
              </Button>
              <Input type="file" accept=".xlsx" className="w-[220px]" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <Button onClick={handleImport} disabled={!importFile || importing}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Excel
              </Button>
            </div>
            
            <div className="ml-auto flex gap-2">
              <Popover open={ingestCodeOpen} onOpenChange={setIngestCodeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ingestCodeOpen}
                    className="w-48 justify-between"
                  >
                    {ingestCode || "Select stock..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Search stock..." />
                    <CommandList>
                      <CommandEmpty>No stock found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="All"
                          onSelect={() => {
                            setIngestCode("All");
                            setIngestCodeOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              ingestCode === "All" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All
                        </CommandItem>
                        {VN30_STOCKS.map((stock) => (
                          <CommandItem
                            key={stock}
                            value={stock}
                            onSelect={(currentValue) => {
                              setIngestCode(currentValue.toUpperCase());
                              setIngestCodeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                ingestCode === stock ? "opacity-100" : "opacity-0"
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
              <Button onClick={handleIngest} disabled={!ingestCode || ingesting}>
                {ingesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingest Now
              </Button>
            </div>
          </div>
        </div>

        {/* Volume Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Total Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVolume.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All matching trades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Buy Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{buyVolume.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-1">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Sell Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{sellVolume.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-1">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                Other Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{otherVolume.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 bg-gray-200 rounded-full flex-1 overflow-hidden">
                  <div 
                    className="h-full bg-gray-500 rounded-full transition-all" 
                    style={{ width: `${totalVolume > 0 ? (otherVolume / totalVolume * 100) : 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalVolume > 0 ? ((otherVolume / totalVolume * 100).toFixed(1)) : 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead className="w-[280px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("time")}
                  >
                    Time
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
                <TableHead className="w-[50px] text-center">Side</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("price")}
                  >
                    Price
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
                    Volume
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
              "No results"
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
                  <h2 className="text-2xl font-bold">Real-time Signals</h2>
                  <p className="text-sm text-muted-foreground">Live buy/sell signals based on trade analysis</p>
                </div>
              </div>
              
              {/* Connection Status */}
              <Card className={`${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} transition-colors`}>
                <CardContent className="p-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-sm font-semibold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                    {isConnected ? 'Active' : 'Disconnected'}
                  </span>
                </CardContent>
              </Card>
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
                Clear All Signals ({signals.length})
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
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead className="w-[100px]">Signal</TableHead>
                      <TableHead className="w-[80px]">Score</TableHead>
                      <TableHead className="w-[150px]">Time</TableHead>
                      <TableHead className="text-right">Buy Volume</TableHead>
                      <TableHead className="text-right">Sell Volume</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead>Reason</TableHead>
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
                  {isConnected ? 'Listening for signals...' : 'Connecting...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Signals appear when strong buy/sell pressure is detected
                </p>
                {isConnected && (
                  <div className="mt-6 text-xs text-muted-foreground space-y-1">
                    <p>✓ Multi-factor analysis (volume, blocks, momentum)</p>
                    <p>✓ Analyzing last 30 minutes of trades</p>
                    <p>✓ Minimum score threshold: 4 points</p>
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
