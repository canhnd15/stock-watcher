import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
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
import Header from "@/components/Header.tsx";
import { TrendingUp, TrendingDown, Loader2, RefreshCw, Plus, Pencil, Trash2, Bell, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatNumberWithDots, parseFormattedNumber } from "@/lib/utils";
import { usePriceAlertNotifications } from "@/hooks/usePriceAlertNotifications";

interface PriceAlert {
  id: number;
  code: string;
  reachPrice?: number;
  dropPrice?: number;
  reachVolume?: number;
  active: boolean;
  createdAt: string;
  marketPrice?: number;
  marketVolume?: number;
}

const PriceAlerts = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(5);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Form states
  const [code, setCode] = useState("");
  const [reachPrice, setReachPrice] = useState("");
  const [dropPrice, setDropPrice] = useState("");
  const [reachVolume, setReachVolume] = useState("");
  
  // WebSocket notifications
  const { isConnected, notifications: wsNotifications } = usePriceAlertNotifications();
  const processedNotificationsRef = useRef<Set<number>>(new Set());

  const fetchAlerts = async (nextPage = page, nextSize = size) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("size", String(nextSize));
      // Default sort by createdAt descending (newest first)
      params.set("sort", "createdAt");
      params.set("direction", "desc");
      
      const response = await api.get(`/api/price-alerts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch price alerts');
      }
      
      const data = await response.json();
      
      // Handle paginated response (Page<PriceAlertDTO>)
      const alertsPage = data?.content ?? data ?? [];
      const alertsList = Array.isArray(alertsPage) ? alertsPage : [];
      
      setAlerts(alertsList);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? alertsList.length);
      setPage(data?.number ?? nextPage);
      setSize(data?.size ?? nextSize);
    } catch (error) {
      console.error('Error fetching price alerts:', error);
      toast.error('Failed to load price alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchAlerts(page, size);
      toast.success('Price alerts refreshed');
    } catch (error) {
      console.error('Error refreshing price alerts:', error);
      toast.error('Failed to refresh price alerts');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts(page, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  const formatPrice = (price?: number) => {
    if (price === null || price === undefined) return "N/A";
    return Math.round(price).toLocaleString('vi-VN');
  };

  const formatVolume = (volume?: number) => {
    if (volume === null || volume === undefined) return "N/A";
    return volume.toLocaleString('vi-VN');
  };

  // Listen for WebSocket notifications and refresh alerts when one is received
  useEffect(() => {
    if (wsNotifications.length > 0) {
      // Process only new notifications (not already processed)
      const newNotifications = wsNotifications.filter(
        notif => !processedNotificationsRef.current.has(notif.alertId)
      );

      newNotifications.forEach(notification => {
        // Mark as processed
        processedNotificationsRef.current.add(notification.alertId);
        
        // Show toast notification
        toast.success(
          `${notification.code}: ${notification.message}`,
          {
            description: `Current price: ${formatPrice(notification.currentPrice)}`,
            duration: 5000,
          }
        );
      });

      // Refresh alerts if we have new notifications
      if (newNotifications.length > 0) {
        fetchAlerts(page, size);
      }
    }
  }, [wsNotifications]);

  const resetForm = () => {
    setCode("");
    setReachPrice("");
    setDropPrice("");
    setReachVolume("");
    setEditingAlert(null);
  };

  const handleCreate = async () => {
    if (!code.trim()) {
      toast.error('Stock code is required');
      return;
    }

    const reachPriceNum = reachPrice.trim() ? parseFloat(parseFormattedNumber(reachPrice)) : undefined;
    const dropPriceNum = dropPrice.trim() ? parseFloat(parseFormattedNumber(dropPrice)) : undefined;
    const reachVolumeNum = reachVolume.trim() ? parseInt(parseFormattedNumber(reachVolume)) : undefined;

    if (reachPriceNum === undefined && dropPriceNum === undefined && reachVolumeNum === undefined) {
      toast.error('At least one alert condition (price or volume) must be provided');
      return;
    }

    if (reachPriceNum !== undefined && (isNaN(reachPriceNum) || reachPriceNum <= 0)) {
      toast.error('Invalid reach price');
      return;
    }

    if (dropPriceNum !== undefined && (isNaN(dropPriceNum) || dropPriceNum <= 0)) {
      toast.error('Invalid drop price');
      return;
    }

    if (reachVolumeNum !== undefined && (isNaN(reachVolumeNum) || reachVolumeNum <= 0)) {
      toast.error('Invalid reach volume');
      return;
    }

    try {
      const response = await api.post('/api/price-alerts', {
        code: code.toUpperCase().trim(),
        reachPrice: reachPriceNum,
        dropPrice: dropPriceNum,
        reachVolume: reachVolumeNum,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create price alert');
      }

      toast.success(`Price alert created for ${code.toUpperCase()}`);
      resetForm();
      setCreateDialogOpen(false);
      // Reset to first page to show the newly created alert
      setPage(0);
      await fetchAlerts(0, size);
    } catch (error: any) {
      console.error('Error creating price alert:', error);
      toast.error(error.message || 'Failed to create price alert');
    }
  };

  const handleEdit = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setCode(alert.code);
    setReachPrice(alert.reachPrice ? formatNumberWithDots(alert.reachPrice.toString()) : "");
    setDropPrice(alert.dropPrice ? formatNumberWithDots(alert.dropPrice.toString()) : "");
    setReachVolume(alert.reachVolume ? formatNumberWithDots(alert.reachVolume.toString()) : "");
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingAlert) return;

    const reachPriceNum = reachPrice.trim() ? parseFloat(parseFormattedNumber(reachPrice)) : null;
    const dropPriceNum = dropPrice.trim() ? parseFloat(parseFormattedNumber(dropPrice)) : null;
    const reachVolumeNum = reachVolume.trim() ? parseInt(parseFormattedNumber(reachVolume)) : null;

    if (reachPriceNum === null && dropPriceNum === null && reachVolumeNum === null) {
      toast.error('At least one alert condition (price or volume) must be provided');
      return;
    }

    if (reachPriceNum !== null && (isNaN(reachPriceNum) || reachPriceNum <= 0)) {
      toast.error('Invalid reach price');
      return;
    }

    if (dropPriceNum !== null && (isNaN(dropPriceNum) || dropPriceNum <= 0)) {
      toast.error('Invalid drop price');
      return;
    }

    if (reachVolumeNum !== null && (isNaN(reachVolumeNum) || reachVolumeNum <= 0)) {
      toast.error('Invalid reach volume');
      return;
    }

    try {
      const response = await api.put(`/api/price-alerts/${editingAlert.id}`, {
        code: code.toUpperCase().trim(),
        reachPrice: reachPriceNum,
        dropPrice: dropPriceNum,
        reachVolume: reachVolumeNum,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update price alert');
      }

      toast.success(`Price alert updated for ${code.toUpperCase()}`);
      resetForm();
      setEditDialogOpen(false);
      await fetchAlerts(page, size);
    } catch (error: any) {
      console.error('Error updating price alert:', error);
      toast.error(error.message || 'Failed to update price alert');
    }
  };

  const handleDelete = async (id: number, code: string) => {
    try {
      const response = await api.delete(`/api/price-alerts/${id}`);

      if (!response.ok) {
        throw new Error('Failed to delete price alert');
      }

      toast.success(`Price alert deleted for ${code}`);
      // If we deleted the last item on the page and it's not the first page, go to previous page
      if (alerts.length === 1 && page > 0) {
        const prevPage = page - 1;
        setPage(prevPage);
        await fetchAlerts(prevPage, size);
      } else {
        await fetchAlerts(page, size);
      }
    } catch (error) {
      console.error('Error deleting price alert:', error);
      toast.error('Failed to delete price alert');
    }
  };

  const handleToggleActive = async (alert: PriceAlert) => {
    try {
      const response = await api.put(`/api/price-alerts/${alert.id}/toggle`);

      if (!response.ok) {
        throw new Error('Failed to toggle price alert');
      }

      toast.success(`Price alert ${alert.active ? 'deactivated' : 'activated'} for ${alert.code}`);
      await fetchAlerts(page, size);
    } catch (error) {
      console.error('Error toggling price alert:', error);
      toast.error('Failed to toggle price alert');
    }
  };

  const activeCount = alerts.filter(a => a.active).length;
  const inactiveCount = alerts.filter(a => !a.active).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold">Price Alerts</h2>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>Disconnected</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Alert</DialogTitle>
                  <DialogDescription>
                    Set up alerts to get notified when stock prices or trading volumes reach your target values.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="code">Stock Code</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g., FPT"
                    />
                  </div>
                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold mb-3 block">Price Alerts</Label>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="reachPrice">Reach Price (VND)</Label>
                        <Input
                          id="reachPrice"
                          type="text"
                          value={formatNumberWithDots(reachPrice)}
                          onChange={(e) => {
                            const rawValue = parseFormattedNumber(e.target.value);
                            if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
                              setReachPrice(rawValue);
                            }
                          }}
                          placeholder="e.g., 100000"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Notify when price goes up to this level</p>
                      </div>
                      <div>
                        <Label htmlFor="dropPrice">Drop Price (VND)</Label>
                        <Input
                          id="dropPrice"
                          type="text"
                          value={formatNumberWithDots(dropPrice)}
                          onChange={(e) => {
                            const rawValue = parseFormattedNumber(e.target.value);
                            if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
                              setDropPrice(rawValue);
                            }
                          }}
                          placeholder="e.g., 90000"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Notify when price falls to this level</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold mb-3 block">Volume Alerts</Label>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="reachVolume">Reach Volume</Label>
                        <Input
                          id="reachVolume"
                          type="text"
                          value={formatNumberWithDots(reachVolume)}
                          onChange={(e) => {
                            const rawValue = parseFormattedNumber(e.target.value);
                            if (rawValue === "" || /^\d*$/.test(rawValue)) {
                              setReachVolume(rawValue);
                            }
                          }}
                          placeholder="e.g., 5000000"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Notify when trading volume exceeds this amount</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setCreateDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeCount}</div>
              <CardDescription>Monitoring prices and volumes</CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
              <CardDescription>Currently paused</CardDescription>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading price alerts...</p>
            </CardContent>
          </Card>
        ) : alerts.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first alert to get notified when stocks reach target prices or volumes.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Stock</TableHead>
                    <TableHead className="min-w-[200px]">Price Settings</TableHead>
                    <TableHead className="min-w-[200px]">Volume Settings</TableHead>
                    <TableHead className="min-w-[180px]">Alert Conditions</TableHead>
                    <TableHead className="min-w-[100px] text-center">Status</TableHead>
                    <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const isReached = alert.reachPrice && alert.marketPrice && alert.marketPrice >= alert.reachPrice;
                    const isDropped = alert.dropPrice && alert.marketPrice && alert.marketPrice <= alert.dropPrice;
                    const isVolumeReached = alert.reachVolume && alert.marketVolume && alert.marketVolume >= alert.reachVolume;
                    const hasActiveCondition = isReached || isDropped || isVolumeReached;
                    
                    return (
                      <TableRow key={alert.id} className={hasActiveCondition && alert.active ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : ""}>
                        {/* Stock Code Column */}
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{alert.code}</span>
                              {hasActiveCondition && alert.active && (
                                <Badge variant="default" className="bg-green-600 text-white animate-pulse text-xs">
                                  <Bell className="h-3 w-3 mr-1" />
                                  Triggered
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        
                        {/* Price Settings Column */}
                        <TableCell>
                          <div className="space-y-2">
                            {alert.reachPrice && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="text-xs text-muted-foreground mb-0.5">Alert when price reaches</div>
                                  <div className="font-mono font-semibold">{formatPrice(alert.reachPrice)}</div>
                                </div>
                                {isReached && (
                                  <Badge variant="default" className="bg-green-600 text-white shrink-0">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    ✓
                                  </Badge>
                                )}
                              </div>
                            )}
                            {alert.dropPrice && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="text-xs text-muted-foreground mb-0.5">Alert when price drops to</div>
                                  <div className="font-mono font-semibold">{formatPrice(alert.dropPrice)}</div>
                                </div>
                                {isDropped && (
                                  <Badge variant="destructive" className="bg-red-600 shrink-0">
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    ✓
                                  </Badge>
                                )}
                              </div>
                            )}
                            {!alert.reachPrice && !alert.dropPrice && (
                              <span className="text-sm text-muted-foreground italic">No price alerts set</span>
                            )}
                            {alert.marketPrice && (
                              <div className="pt-1 border-t">
                                <div className="text-xs text-muted-foreground">Current: <span className={`font-mono font-semibold ${hasActiveCondition ? "text-green-600 dark:text-green-400" : ""}`}>{formatPrice(alert.marketPrice)}</span></div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* Volume Settings Column */}
                        <TableCell>
                          <div className="space-y-2">
                            {alert.reachVolume ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="text-xs text-muted-foreground mb-0.5">Alert when volume reaches</div>
                                  <div className="font-mono font-semibold">{formatVolume(alert.reachVolume)}</div>
                                </div>
                                {isVolumeReached && (
                                  <Badge variant="default" className="bg-green-600 text-white shrink-0">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    ✓
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">No volume alerts set</span>
                            )}
                            {alert.marketVolume !== undefined && alert.reachVolume && (
                              <div className="pt-1 border-t">
                                <div className="text-xs text-muted-foreground">Current: <span className={`font-mono font-semibold ${isVolumeReached ? "text-green-600 dark:text-green-400" : ""}`}>{formatVolume(alert.marketVolume)}</span></div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* Alert Conditions Summary */}
                        <TableCell>
                          <div className="space-y-1.5 text-xs">
                            {(alert.reachPrice || alert.dropPrice) && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-muted-foreground shrink-0">📈 Price:</span>
                                <div className="flex flex-col gap-0.5">
                                  {alert.reachPrice && (
                                    <span className="font-medium">≥ {formatPrice(alert.reachPrice)}</span>
                                  )}
                                  {alert.dropPrice && (
                                    <span className="font-medium">≤ {formatPrice(alert.dropPrice)}</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {alert.reachVolume && (
                              <div className="flex items-start gap-1.5">
                                <span className="text-muted-foreground shrink-0">📊 Volume:</span>
                                <span className="font-medium">≥ {formatVolume(alert.reachVolume)}</span>
                              </div>
                            )}
                            {!alert.reachPrice && !alert.dropPrice && !alert.reachVolume && (
                              <span className="text-muted-foreground italic">No conditions set</span>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* Status Column */}
                        <TableCell className="text-center">
                          <Badge variant={alert.active ? "default" : "secondary"} className="text-xs">
                            {alert.active ? "✓ Active" : "○ Inactive"}
                          </Badge>
                        </TableCell>
                        {/* Actions Column */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(alert)}
                              className="h-8 px-2"
                              title={alert.active ? "Pause alert" : "Activate alert"}
                            >
                              {alert.active ? "Pause" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(alert)}
                              className="h-8 w-8 p-0"
                              title="Edit alert"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  title="Delete alert"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Alert</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the alert for <strong>{alert.code}</strong>?
                                    <br />
                                    <span className="text-destructive text-sm mt-1 block">This action cannot be undone.</span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDelete(alert.id, alert.code)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing {page * size + 1} to {Math.min((page + 1) * size, totalElements)} of {totalElements} alerts
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Select value={String(size)} onValueChange={(v) => { 
                    const n = Number(v); 
                    setSize(n); 
                    setPage(0); 
                    fetchAlerts(0, n); 
                  }}>
                    <SelectTrigger className="w-full sm:w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 / page</SelectItem>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 0 || loading} 
                    onClick={() => { 
                      const p = page - 1; 
                      setPage(p); 
                      fetchAlerts(p, size); 
                    }} 
                    className="flex-1 sm:flex-none"
                  >
                    Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page + 1 >= totalPages || loading} 
                    onClick={() => { 
                      const p = page + 1; 
                      setPage(p); 
                      fetchAlerts(p, size); 
                    }} 
                    className="flex-1 sm:flex-none"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Alert</DialogTitle>
              <DialogDescription>
                Update your alert settings for price and/or volume conditions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-code">Stock Code</Label>
                <Input
                  id="edit-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g., FPT"
                />
              </div>
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Price Alerts</Label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-reachPrice">Reach Price (VND)</Label>
                    <Input
                      id="edit-reachPrice"
                      type="text"
                      value={formatNumberWithDots(reachPrice)}
                      onChange={(e) => {
                        const rawValue = parseFormattedNumber(e.target.value);
                        if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
                          setReachPrice(rawValue);
                        }
                      }}
                      placeholder="e.g., 100000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Notify when price goes up to this level</p>
                  </div>
                  <div>
                    <Label htmlFor="edit-dropPrice">Drop Price (VND)</Label>
                    <Input
                      id="edit-dropPrice"
                      type="text"
                      value={formatNumberWithDots(dropPrice)}
                      onChange={(e) => {
                        const rawValue = parseFormattedNumber(e.target.value);
                        if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
                          setDropPrice(rawValue);
                        }
                      }}
                      placeholder="e.g., 90000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Notify when price falls to this level</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Volume Alerts</Label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-reachVolume">Reach Volume</Label>
                    <Input
                      id="edit-reachVolume"
                      type="text"
                      value={formatNumberWithDots(reachVolume)}
                      onChange={(e) => {
                        const rawValue = parseFormattedNumber(e.target.value);
                        if (rawValue === "" || /^\d*$/.test(rawValue)) {
                          setReachVolume(rawValue);
                        }
                      }}
                      placeholder="e.g., 5000000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Notify when trading volume exceeds this amount</p>
                  </div>
                    </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Update</Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-sm">How alerts work</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Price alerts:</strong> Set a target price to reach (≥) or drop to (≤). You'll be notified when the stock price crosses these thresholds.
                </li>
                <li>
                  <strong>Volume alerts:</strong> Set a target volume to reach (≥). You'll be notified when trading volume exceeds this amount.
                </li>
                <li>
                  <strong>Continuous monitoring:</strong> Alerts stay active and check every minute until you manually pause or delete them.
                </li>
                <li>
                  <strong>Notifications:</strong> You'll receive real-time notifications via WebSocket and browser notifications. To prevent spam, notifications are sent at most once every 5 minutes per alert.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PriceAlerts;

