import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Input } from "@/components/ui/input.tsx";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import Header from "@/components/Header.tsx";
import { useAuth } from "@/contexts/AuthContext";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { toast } from "sonner";
import { Loader2, RefreshCw, Upload, Download, Check, ChevronsUpDown, Database } from "lucide-react";
import { cn } from "@/lib/utils";

// VN30 Stock Codes
const VN30_STOCKS = [
    "ACB", "BCM", "BID", "CTG", "DGC", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB",
    "MSN", "MWG", "PLX", "SAB", "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM",
    "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"
];

const Config = () => {
  const { token } = useAuth();
  const [vn30CronEnabled, setVn30CronEnabled] = useState(true);
  const [trackedStocksCronEnabled, setTrackedStocksCronEnabled] = useState(true);
  const [signalCalculationCronEnabled, setSignalCalculationCronEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingVn30, setUpdatingVn30] = useState(false);
  const [updatingTracked, setUpdatingTracked] = useState(false);
  const [updatingSignal, setUpdatingSignal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [ingestCode, setIngestCode] = useState("");
  const [ingestCodeOpen, setIngestCodeOpen] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");
  const [exportAllTrades, setExportAllTrades] = useState(true);
  const [indexingMaxDays, setIndexingMaxDays] = useState<string>("180");
  const [indexingBatchSize, setIndexingBatchSize] = useState<string>("30");
  const [indexing, setIndexing] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<{
    status?: string;
    processed?: number;
    total?: number;
    chunksIndexed?: number;
    message?: string;
  } | null>(null);
  const [indexingTrackedStocks, setIndexingTrackedStocks] = useState(false);
  const [trackedStocksIndexingStatus, setTrackedStocksIndexingStatus] = useState<{
    status?: string;
    chunksIndexed?: number;
    message?: string;
  } | null>(null);
  const [indexingShortTermTrackedStocks, setIndexingShortTermTrackedStocks] = useState(false);
  const [shortTermTrackedStocksIndexingStatus, setShortTermTrackedStocksIndexingStatus] = useState<{
    status?: string;
    chunksIndexed?: number;
    message?: string;
  } | null>(null);

  const loadConfig = () => {
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${token}` };
    Promise.all([
      fetch("/api/config/vn30-cron", { headers }).then(r => r.json()),
      fetch("/api/config/tracked-stocks-cron", { headers }).then(r => r.json()),
      fetch("/api/config/signal-calculation-cron", { headers }).then(r => r.json())
    ])
      .then(([vn30Data, trackedData, signalData]) => {
        setVn30CronEnabled(vn30Data.enabled);
        setTrackedStocksCronEnabled(trackedData.enabled);
        setSignalCalculationCronEnabled(signalData.enabled);
      })
      .catch(() => toast.error("Failed to load configuration"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleToggleVn30Cron = (checked: boolean) => {
    setUpdatingVn30(true);
    fetch("/api/config/vn30-cron", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ enabled: checked }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to update");
        return r.json();
      })
      .then((data) => {
        setVn30CronEnabled(data.enabled);
        toast.success(`VN30 Cron Job ${data.enabled ? "enabled" : "disabled"}`);
      })
      .catch(() => {
        toast.error("Failed to update configuration");
        // Revert on error
        setVn30CronEnabled(!checked);
      })
      .finally(() => setUpdatingVn30(false));
  };

  const handleToggleTrackedStocksCron = (checked: boolean) => {
    setUpdatingTracked(true);
    fetch("/api/config/tracked-stocks-cron", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ enabled: checked }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to update");
        return r.json();
      })
      .then((data) => {
        setTrackedStocksCronEnabled(data.enabled);
        toast.success(`Tracked Stocks Cron Job ${data.enabled ? "enabled" : "disabled"}`);
      })
      .catch(() => {
        toast.error("Failed to update configuration");
        // Revert on error
        setTrackedStocksCronEnabled(!checked);
      })
      .finally(() => setUpdatingTracked(false));
  };

  const handleToggleSignalCalculationCron = (checked: boolean) => {
    setUpdatingSignal(true);
    fetch("/api/config/signal-calculation-cron", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ enabled: checked }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to update");
        return r.json();
      })
      .then((data) => {
        setSignalCalculationCronEnabled(data.enabled);
        toast.success(`Signal Calculation Cron Job ${data.enabled ? "enabled" : "disabled"}`);
      })
      .catch(() => {
        toast.error("Failed to update configuration");
        // Revert on error
        setSignalCalculationCronEnabled(!checked);
      })
      .finally(() => setUpdatingSignal(false));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      
      // Add date parameters only if exportAllTrades is false
      if (!exportAllTrades) {
        if (exportFromDate) {
          params.set('fromDate', exportFromDate);
        }
        if (exportToDate) {
          params.set('toDate', exportToDate);
        }
      }
      
      const url = `/api/trades/export${params.toString() ? `?${params.toString()}` : ''}`;
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error("Failed to export");
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'trades-export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success(exportAllTrades ? "Exported all trades to Excel" : "Exported trades to Excel");
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
      const resp = await fetch('/api/trades/import', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: form 
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(errorText || 'Failed to import');
      }
      const text = await resp.text();
      toast.success(text || 'Imported successfully');
      setImportFile(null);
      // Reset file input
      const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      toast.error(error.message || "Failed to import trades");
    } finally {
      setImporting(false);
    }
  };

  const handleIngest = () => {
    if (ingestCode) {
      setIngesting(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // If "All" is selected, call /ingest/all endpoint
      if (ingestCode === "All") {
        fetch(`/api/trades/ingest/all`, { method: "POST", headers })
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
        fetch(`/api/trades/ingest/${encodeURIComponent(c)}`, { method: "POST", headers })
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

  const handleIndexAll = async () => {
    try {
      setIndexing(true);
      setIndexingStatus(null);
      
      const maxDays = indexingMaxDays ? parseInt(indexingMaxDays) : undefined;
      const batchSize = indexingBatchSize ? parseInt(indexingBatchSize) : undefined;
      
      const requestBody: any = {};
      if (maxDays !== undefined && !isNaN(maxDays)) {
        requestBody.maxDays = maxDays;
      }
      if (batchSize !== undefined && !isNaN(batchSize)) {
        requestBody.batchSize = batchSize;
      }
      
      const response = await fetch("/api/internal/rag/index-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to start indexing" }));
        throw new Error(errorData.message || errorData.error || "Failed to start indexing");
      }
      
      const result = await response.json();
      setIndexingStatus(result);
      
      if (result.status === "completed") {
        toast.success(
          `Indexing completed! Processed ${result.processed || 0}/${result.total || 0} dates, ` +
          `indexed ${result.chunksIndexed || 0} chunks`
        );
      } else if (result.status === "error") {
        toast.error(result.message || "Indexing failed");
      } else {
        toast.success("Indexing started successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start indexing");
      setIndexingStatus({ status: "error", message: error.message });
    } finally {
      setIndexing(false);
    }
  };

  const handleIndexTrackedStocks = async () => {
    try {
      setIndexingTrackedStocks(true);
      setTrackedStocksIndexingStatus(null);
      
      const response = await fetch("/api/internal/rag/index-tracked-stocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to index tracked stocks" }));
        throw new Error(errorData.message || errorData.error || "Failed to index tracked stocks");
      }
      
      const result = await response.json();
      setTrackedStocksIndexingStatus(result);
      
      if (result.status === "completed") {
        toast.success(`Tracked stocks indexing completed! Indexed ${result.chunksIndexed || 0} chunks`);
      } else if (result.status === "error") {
        toast.error(result.message || "Indexing failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to index tracked stocks");
      setTrackedStocksIndexingStatus({ status: "error", message: error.message });
    } finally {
      setIndexingTrackedStocks(false);
    }
  };

  const handleIndexShortTermTrackedStocks = async () => {
    try {
      setIndexingShortTermTrackedStocks(true);
      setShortTermTrackedStocksIndexingStatus(null);
      
      const response = await fetch("/api/internal/rag/index-short-term-tracked-stocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to index short-term tracked stocks" }));
        throw new Error(errorData.message || errorData.error || "Failed to index short-term tracked stocks");
      }
      
      const result = await response.json();
      setShortTermTrackedStocksIndexingStatus(result);
      
      if (result.status === "completed") {
        toast.success(`Short-term tracked stocks indexing completed! Indexed ${result.chunksIndexed || 0} chunks`);
      } else if (result.status === "error") {
        toast.error(result.message || "Indexing failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to index short-term tracked stocks");
      setShortTermTrackedStocksIndexingStatus({ status: "error", message: error.message });
    } finally {
      setIndexingShortTermTrackedStocks(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">Management</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Data Ingestion</CardTitle>
              <CardDescription>
                Manually ingest trade data for specific stocks or all VN30 stocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Popover open={ingestCodeOpen} onOpenChange={setIngestCodeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={ingestCodeOpen}
                      className="w-full sm:w-64 justify-between"
                    >
                      {ingestCode || "Select stock..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0">
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
                            All VN30 Stocks
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
                <Button onClick={handleIngest} disabled={!ingestCode || ingesting} className="w-full sm:w-auto">
                  {ingesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!ingesting && <RefreshCw className="mr-2 h-4 w-4" />}
                  Ingest Now
                </Button>
                {ingestCode && !ingesting && (
                  <p className="text-sm text-muted-foreground text-center sm:text-left">
                    {ingestCode === "All" ? "Ingest all VN30 stocks" : `Ingest ${ingestCode}`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Import/Export</CardTitle>
              <CardDescription>
                Import trades from Excel or export all trades to Excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {/* Import Section */}
                <div>
                  <label htmlFor="import-file-input" className="text-sm font-medium mb-2 block">
                    Import Trades from Excel
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <Input
                      id="import-file-input"
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      disabled={importing}
                      className="flex-1 cursor-pointer"
                    />
                    <Button
                      onClick={handleImport}
                      disabled={!importFile || importing}
                      className="w-full sm:w-auto"
                    >
                      {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {!importing && <Upload className="mr-2 h-4 w-4" />}
                      Import
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload an Excel file (.xlsx) with trade data
                  </p>
                </div>

                {/* Export Section */}
                <div className="border-t pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Export Trades to Excel</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {exportAllTrades 
                            ? "Download all trades data as an Excel file"
                            : "Download trades by date range as an Excel file"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="export-all-checkbox"
                          checked={exportAllTrades}
                          onChange={(e) => setExportAllTrades(e.target.checked)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="export-all-checkbox" className="text-sm text-muted-foreground cursor-pointer">
                          Export All
                        </label>
                      </div>
                    </div>

                    {!exportAllTrades && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="flex-1">
                          <label htmlFor="export-from-date" className="text-sm font-medium mb-1 block">
                            From Date
                          </label>
                          <DatePicker
                            value={exportFromDate}
                            onChange={setExportFromDate}
                            placeholder="Select from date"
                          />
                        </div>
                        <div className="flex-1">
                          <label htmlFor="export-to-date" className="text-sm font-medium mb-1 block">
                            To Date
                          </label>
                          <DatePicker
                            value={exportToDate}
                            onChange={setExportToDate}
                            placeholder="Select to date"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={handleExport}
                        disabled={exporting || (!exportAllTrades && !exportFromDate && !exportToDate)}
                      >
                        {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!exporting && <Download className="mr-2 h-4 w-4" />}
                        Export
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vector Database Indexing</CardTitle>
              <CardDescription>
                Index existing trade data into the vector database for AI-powered search and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="indexing-max-days" className="text-sm font-medium mb-2 block">
                      Max Days
                    </label>
                    <Input
                      id="indexing-max-days"
                      type="number"
                      min="0"
                      placeholder="180 (0 = all days)"
                      value={indexingMaxDays}
                      onChange={(e) => setIndexingMaxDays(e.target.value)}
                      disabled={indexing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum number of days to index (0 = index all available dates)
                    </p>
                  </div>
                  <div>
                    <label htmlFor="indexing-batch-size" className="text-sm font-medium mb-2 block">
                      Batch Size
                    </label>
                    <Input
                      id="indexing-batch-size"
                      type="number"
                      min="1"
                      placeholder="30"
                      value={indexingBatchSize}
                      onChange={(e) => setIndexingBatchSize(e.target.value)}
                      disabled={indexing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of dates to process per batch
                    </p>
                  </div>
                </div>
                
                {indexingStatus && (
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4" />
                      <span className="text-sm font-medium">Indexing Status</span>
                    </div>
                    {indexingStatus.status === "completed" && (
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600 dark:text-green-400">
                          ✓ Completed successfully
                        </p>
                        {indexingStatus.processed !== undefined && indexingStatus.total !== undefined && (
                          <p className="text-muted-foreground">
                            Processed: {indexingStatus.processed} / {indexingStatus.total} dates
                          </p>
                        )}
                        {indexingStatus.chunksIndexed !== undefined && (
                          <p className="text-muted-foreground">
                            Chunks indexed: {indexingStatus.chunksIndexed.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    {indexingStatus.status === "error" && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        ✗ Error: {indexingStatus.message || "Unknown error"}
                      </p>
                    )}
                    {indexingStatus.status === "in_progress" && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-muted-foreground">Indexing in progress...</p>
                      </div>
                    )}
                  </div>
                )}
                
                <Button
                  onClick={handleIndexAll}
                  disabled={indexing}
                  className="w-full sm:w-auto"
                >
                  {indexing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!indexing && <Database className="mr-2 h-4 w-4" />}
                  {indexing ? "Indexing..." : "Start Indexing"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracked Stocks Indexing</CardTitle>
              <CardDescription>
                Index tracked stocks data into the vector database for AI-powered search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trackedStocksIndexingStatus && (
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4" />
                      <span className="text-sm font-medium">Indexing Status</span>
                    </div>
                    {trackedStocksIndexingStatus.status === "completed" && (
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600 dark:text-green-400">
                          ✓ Completed successfully
                        </p>
                        {trackedStocksIndexingStatus.chunksIndexed !== undefined && (
                          <p className="text-muted-foreground">
                            Chunks indexed: {trackedStocksIndexingStatus.chunksIndexed.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    {trackedStocksIndexingStatus.status === "error" && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        ✗ Error: {trackedStocksIndexingStatus.message || "Unknown error"}
                      </p>
                    )}
                  </div>
                )}
                
                <Button
                  onClick={handleIndexTrackedStocks}
                  disabled={indexingTrackedStocks}
                  className="w-full sm:w-auto"
                >
                  {indexingTrackedStocks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!indexingTrackedStocks && <Database className="mr-2 h-4 w-4" />}
                  {indexingTrackedStocks ? "Indexing..." : "Index Tracked Stocks"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Short-Term Tracked Stocks Indexing</CardTitle>
              <CardDescription>
                Index short-term tracked stocks data into the vector database for AI-powered search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shortTermTrackedStocksIndexingStatus && (
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4" />
                      <span className="text-sm font-medium">Indexing Status</span>
                    </div>
                    {shortTermTrackedStocksIndexingStatus.status === "completed" && (
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600 dark:text-green-400">
                          ✓ Completed successfully
                        </p>
                        {shortTermTrackedStocksIndexingStatus.chunksIndexed !== undefined && (
                          <p className="text-muted-foreground">
                            Chunks indexed: {shortTermTrackedStocksIndexingStatus.chunksIndexed.toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    {shortTermTrackedStocksIndexingStatus.status === "error" && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        ✗ Error: {shortTermTrackedStocksIndexingStatus.message || "Unknown error"}
                      </p>
                    )}
                  </div>
                )}
                
                <Button
                  onClick={handleIndexShortTermTrackedStocks}
                  disabled={indexingShortTermTrackedStocks}
                  className="w-full sm:w-auto"
                >
                  {indexingShortTermTrackedStocks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!indexingShortTermTrackedStocks && <Database className="mr-2 h-4 w-4" />}
                  {indexingShortTermTrackedStocks ? "Indexing..." : "Index Short-Term Tracked Stocks"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Jobs</CardTitle>
              <CardDescription>
                Manage automated tasks and cron jobs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    VN30 Stock Ingestion Cron Job
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Automatically ingest trade data for all VN30 stocks every 10 minutes
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Schedule: Every 10 minutes (00:00, 00:10, 00:20, ... 23:50)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingVn30 && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Switch
                    checked={vn30CronEnabled}
                    onCheckedChange={handleToggleVn30Cron}
                    disabled={loading || updatingVn30}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Tracked Stocks Refresh & Recommendation Cron Job
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Refresh active tracked stocks and generate buy/sell recommendations every 5 minutes
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Schedule: Every 5 minutes (00:00, 00:05, 00:10, ... 23:55)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingTracked && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Switch
                    checked={trackedStocksCronEnabled}
                    onCheckedChange={handleToggleTrackedStocksCron}
                    disabled={loading || updatingTracked}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Signal Calculation & WebSocket Notification Cron Job
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Calculate buy/sell signals and broadcast real-time notifications via WebSocket every minute
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Schedule: Every 1 minute (00:00, 00:01, 00:02, ... 23:59)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {updatingSignal && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Switch
                    checked={signalCalculationCronEnabled}
                    onCheckedChange={handleToggleSignalCalculationCron}
                    disabled={loading || updatingSignal}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Config;

