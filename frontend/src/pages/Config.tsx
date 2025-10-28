import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import Header from "@/components/Header.tsx";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

const Config = () => {
  const [vn30CronEnabled, setVn30CronEnabled] = useState(true);
  const [trackedStocksCronEnabled, setTrackedStocksCronEnabled] = useState(true);
  const [signalCalculationCronEnabled, setSignalCalculationCronEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updatingVn30, setUpdatingVn30] = useState(false);
  const [updatingTracked, setUpdatingTracked] = useState(false);
  const [updatingSignal, setUpdatingSignal] = useState(false);

  const loadConfig = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/config/vn30-cron").then(r => r.json()),
      fetch("/api/config/tracked-stocks-cron").then(r => r.json()),
      fetch("/api/config/signal-calculation-cron").then(r => r.json())
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Configuration</h2>
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

