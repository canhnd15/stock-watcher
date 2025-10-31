import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import Header from "@/components/Header.tsx";
import { toast } from "sonner";
import { Loader2, Check, Trash2, Bell, BellOff } from "lucide-react";
import { useTrackedStockNotifications } from "@/hooks/useTrackedStockNotifications";
import { useTrackedStockStats } from "@/hooks/useTrackedStockStats";
import { api } from "@/lib/api";

interface TrackedStockStats {
  lowestPriceBuy?: number;
  highestPriceBuy?: number;
  lowestPriceSell?: number;
  highestPriceSell?: number;
  largestVolumeBuy?: number;
  largestVolumeSell?: number;
  lastUpdated?: string;
}

interface TrackedStock {
  id: number;
  code: string;
  active: boolean;
  stats?: TrackedStockStats;
}

const TrackedStocks = () => {
  const [stockInput, setStockInput] = useState("");
  const [trackedStocks, setTrackedStocks] = useState<TrackedStock[]>([]);
  const [vn30Codes, setVn30Codes] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loadingVn30, setLoadingVn30] = useState(true);
  const [customCodesModalOpen, setCustomCodesModalOpen] = useState(false);

  // Tracked stock notifications
  const {
    isConnected: notificationsConnected,
    notifications,
    permissionGranted,
    requestPermission,
  } = useTrackedStockNotifications();

  // Tracked stock stats
  const { statsMap, isConnected: statsConnected } = useTrackedStockStats();

  useEffect(() => {
    // Load tracked stocks from backend
    api.get("/api/tracked-stocks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stocks");
        return r.json();
      })
      .then((data: TrackedStock[]) => {
        setTrackedStocks(data);
        // Load stats for tracked stocks
        return api.get("/api/tracked-stocks/stats");
      })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stats");
        return r.json();
      })
      .then((statsData: Record<string, TrackedStockStats>) => {
        // Merge stats with tracked stocks
        setTrackedStocks((prev) => 
          prev.map((stock) => ({
            ...stock,
            stats: statsData[stock.code],
          }))
        );
      })
      .catch((error) => {
        if (error.message !== "Failed to load stats") {
          toast.error("Failed to load tracked stocks");
        }
      });
    
    // Load VN30 codes - using hardcoded list
    setLoadingVn30(true);
    const vn30List = [
      "ACB", "BCM", "CTG", "DGC", "FPT", "BFG", "HDB", "HPG", "MWG",
      "LPB", "MBB", "MSN", "PLX", "SAB", "SHB", "SSB", "SSI", "VRE",
      "TCB", "TPB", "VCB", "VHM", "VIB", "VIC", "VJC", "VNM", "VPB",
      "DXG", "KDH"
    ];
    setVn30Codes(vn30List);
    setLoadingVn30(false);
  }, []);

  // Update stats when WebSocket stats map changes
  useEffect(() => {
    if (statsMap.size > 0) {
      setTrackedStocks((prev) =>
        prev.map((stock) => {
          const stats = statsMap.get(stock.code);
          return stats ? { ...stock, stats } : stock;
        })
      );
    }
  }, [statsMap]);

  const toggleCodeSelection = (code: string) => {
    setSelectedCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleSaveSelectedCodes = async () => {
    if (selectedCodes.size === 0) {
      toast.error("Please select at least one stock code");
      return;
    }

    const codes = Array.from(selectedCodes);
    let successCount = 0;
    
    try {
      // Add stocks one by one
      for (const code of codes) {
        const response = await api.post("/api/tracked-stocks", { code });
        if (response.ok) {
          successCount++;
        }
      }
      
      setSelectedCodes(new Set());
      toast.success(`Added ${successCount} stock code(s)`);
      
      // Refresh the list
      const refreshResponse = await api.get("/api/tracked-stocks");
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setTrackedStocks(data);
      }
    } catch (error) {
      toast.error("Failed to add some codes");
    }
  };

  const handleSaveCodes = async () => {
    const codes = stockInput
      .split(/[\s\n,]+/)
      .map(code => code.trim().toUpperCase())
      .filter(code => code.length > 0);
    if (codes.length === 0) return;

    let successCount = 0;
    
    try {
      // Add stocks one by one
      for (const code of codes) {
        const response = await api.post("/api/tracked-stocks", { code });
        if (response.ok) {
          successCount++;
        }
      }
      
      setStockInput("");
      toast.success(`Added ${successCount} stock code(s)`);
      setCustomCodesModalOpen(false);
      
      // Refresh the list
      const refreshResponse = await api.get("/api/tracked-stocks");
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setTrackedStocks(data);
      }
    } catch (error) {
      toast.error("Failed to add some codes");
    }
  };

  const toggleActive = async (id: number) => {
    const current = trackedStocks.find(s => s.id === id);
    if (!current) return;
    const nextActive = !current.active;
    
    // Optimistic update
    setTrackedStocks(prev => prev.map(s => s.id === id ? { ...s, active: nextActive } : s));
    
    try {
      const response = await api.put(`/api/tracked-stocks/${id}/toggle`);
      if (!response.ok) throw new Error("Failed");
    } catch (error) {
      // Revert on failure
      setTrackedStocks(prev => prev.map(s => s.id === id ? { ...s, active: !nextActive } : s));
      toast.error(`Failed to update ${current.code}`);
    }
  };

  const handleDelete = async (id: number, code: string) => {
    try {
      const response = await api.delete(`/api/tracked-stocks/${id}`);
      if (!response.ok) throw new Error("Failed");
      
      toast.success(`Deleted ${code} from tracked stocks`);
      // Remove from local state
      setTrackedStocks(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      toast.error(`Failed to delete ${code}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header with notification status */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tracked Stocks</h2>
          
          <Card className={`${notificationsConnected && permissionGranted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} transition-colors`}>
            <CardContent className="p-3 flex items-center gap-3">
              {permissionGranted ? (
                <>
                  <Bell className="h-4 w-4 text-green-600" />
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${notificationsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-sm font-medium">
                      🔔 Notifications: {notificationsConnected ? 'Active' : 'Connecting...'}
                    </span>
                  </div>
                  {notifications.length > 0 && (
                    <Badge variant="default" className="ml-1 bg-green-600">
                      {notifications.length}
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 text-gray-400" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={requestPermission}
                    className="text-sm"
                  >
                    Enable Notifications
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* VN30 Stock Selector */}
        <div className="mb-8 space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">
              Select VN30 Stocks {selectedCodes.size > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({selectedCodes.size} selected)
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {loadingVn30 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading VN30 codes...</span>
                </div>
              ) : vn30Codes.length === 0 ? (
                <div className="text-muted-foreground">No VN30 codes available</div>
              ) : (
                vn30Codes.map((code) => {
                  const isSelected = selectedCodes.has(code);
                  return (
                    <Badge
                      key={code}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer text-sm px-3 py-1.5 transition-all hover:scale-105"
                      onClick={() => toggleCodeSelection(code)}
                    >
                      {isSelected && <Check className="w-3 h-3 mr-1" />}
                      {code}
                    </Badge>
                  );
                })
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveSelectedCodes}
                disabled={selectedCodes.size === 0}
              >
                Save Selected Codes
              </Button>
              
              <Dialog open={customCodesModalOpen} onOpenChange={setCustomCodesModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    Custom Codes
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Enter Custom Stock Codes</DialogTitle>
                    <DialogDescription>
                      Add stock codes that are not in the VN30 list. Enter codes separated by comma, space, or newline.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea
                      placeholder="Example: FPT, VCB, HPG"
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value)}
                      className="min-h-32"
                    />
                    <Button onClick={handleSaveCodes} className="w-full">
                      Save Custom Codes
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-center bg-green-50">Buy Low Price</TableHead>
                <TableHead className="text-center bg-green-50">Buy High Price</TableHead>
                <TableHead className="text-center bg-green-50 border-r-2 border-gray-300">Buy Max Volume</TableHead>
                <TableHead className="text-center bg-red-50">Sell Low Price</TableHead>
                <TableHead className="text-center bg-red-50">Sell High Price</TableHead>
                <TableHead className="text-center bg-red-50">Sell Max Volume</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackedStocks.map((stock) => {
                const stats = stock.stats;
                const formatNumber = (value?: number) => {
                  if (value === null || value === undefined) return "N/A";
                  // Format with period as thousands separator
                  return Math.round(value).toLocaleString('de-DE');
                };
                const formatPrice = (value?: number) => {
                  if (value === null || value === undefined) return "N/A";
                  // Format with period as thousands separator and remove decimals
                  return Math.round(value).toLocaleString('de-DE');
                };

                return (
                  <TableRow key={stock.code}>
                    <TableCell className="font-semibold text-lg">{stock.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={stock.active}
                          onCheckedChange={() => toggleActive(stock.id)}
                          id={`active-${stock.code}`}
                        />
                        <label
                          htmlFor={`active-${stock.code}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          Active
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30">
                      <span className="text-sm text-muted-foreground">{formatPrice(stats?.lowestPriceBuy)}</span>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30">
                      <span className="text-sm text-muted-foreground">{formatPrice(stats?.highestPriceBuy)}</span>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30 border-r-2 border-gray-300">
                      <span className="text-sm font-medium text-green-600">{formatNumber(stats?.largestVolumeBuy)}</span>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30">
                      <span className="text-sm text-muted-foreground">{formatPrice(stats?.lowestPriceSell)}</span>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30">
                      <span className="text-sm text-muted-foreground">{formatPrice(stats?.highestPriceSell)}</span>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30">
                      <span className="text-sm font-medium text-red-600">{formatNumber(stats?.largestVolumeSell)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Tracked Stock</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove <strong>{stock.code}</strong> from tracked stocks?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(stock.id, stock.code)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
              {trackedStocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No tracked stocks yet. Add some codes above to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default TrackedStocks;
