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
import { toast } from "sonner";
import { Loader2, RefreshCw, Upload, Download, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// VN30 Stock Codes
const VN30_STOCKS = [
  "ACB", "BCM", "CTG", "DGC", "FPT", "BFG", "HDB", "HPG", "MWG",
  "LPB", "MBB", "MSN", "PLX", "SAB", "SHB", "SSB", "SSI", "VRE",
  "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB",
  "DXG", "KDH"
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
      const resp = await fetch(`/api/trades/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Management</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={loading}
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
              <div className="flex items-center gap-4">
                <Popover open={ingestCodeOpen} onOpenChange={setIngestCodeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={ingestCodeOpen}
                      className="w-64 justify-between"
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
                <Button onClick={handleIngest} disabled={!ingestCode || ingesting}>
                  {ingesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!ingesting && <RefreshCw className="mr-2 h-4 w-4" />}
                  Ingest Now
                </Button>
                {ingestCode && !ingesting && (
                  <p className="text-sm text-muted-foreground">
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
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label htmlFor="import-file-input" className="text-sm font-medium mb-2 block">
                      Import Trades from Excel
                    </label>
                    <Input
                      id="import-file-input"
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      disabled={importing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload an Excel file (.xlsx) with trade data
                    </p>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="mt-6"
                  >
                    {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!importing && <Upload className="mr-2 h-4 w-4" />}
                    Import
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Export All Trades to Excel</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Download all trades data as an Excel file
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleExport}
                      disabled={exporting}
                    >
                      {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {!exporting && <Download className="mr-2 h-4 w-4" />}
                      Export
                    </Button>
                  </div>
                </div>
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
              <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
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

              <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
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

              <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
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

