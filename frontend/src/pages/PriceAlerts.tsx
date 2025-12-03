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
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatNumberWithDots, parseFormattedNumber } from "@/lib/utils";
import { usePriceAlertNotifications } from "@/hooks/usePriceAlertNotifications";

interface PriceAlert {
  id: number;
  code: string;
  reachPrice?: number;
  dropPrice?: number;
  active: boolean;
  createdAt: string;
  marketPrice?: number;
}

const PriceAlerts = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  
  // Form states
  const [code, setCode] = useState("");
  const [reachPrice, setReachPrice] = useState("");
  const [dropPrice, setDropPrice] = useState("");
  
  // WebSocket notifications
  const { isConnected, notifications: wsNotifications } = usePriceAlertNotifications();
  const processedNotificationsRef = useRef<Set<number>>(new Set());

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/price-alerts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch price alerts');
      }
      
      const data: PriceAlert[] = await response.json();
      setAlerts(data);
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
      await fetchAlerts();
      toast.success('Price alerts refreshed');
    } catch (error) {
      console.error('Error refreshing price alerts:', error);
      toast.error('Failed to refresh price alerts');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const formatPrice = (price?: number) => {
    if (price === null || price === undefined) return "N/A";
    return Math.round(price).toLocaleString('vi-VN');
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
        fetchAlerts();
      }
    }
  }, [wsNotifications]);

  const resetForm = () => {
    setCode("");
    setReachPrice("");
    setDropPrice("");
    setEditingAlert(null);
  };

  const handleCreate = async () => {
    if (!code.trim()) {
      toast.error('Stock code is required');
      return;
    }

    const reachPriceNum = reachPrice.trim() ? parseFloat(parseFormattedNumber(reachPrice)) : undefined;
    const dropPriceNum = dropPrice.trim() ? parseFloat(parseFormattedNumber(dropPrice)) : undefined;

    if (reachPriceNum === undefined && dropPriceNum === undefined) {
      toast.error('At least one of reach price or drop price must be provided');
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

    try {
      const response = await api.post('/api/price-alerts', {
        code: code.toUpperCase().trim(),
        reachPrice: reachPriceNum,
        dropPrice: dropPriceNum,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create price alert');
      }

      toast.success(`Price alert created for ${code.toUpperCase()}`);
      resetForm();
      setCreateDialogOpen(false);
      await fetchAlerts();
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
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingAlert) return;

    const reachPriceNum = reachPrice.trim() ? parseFloat(parseFormattedNumber(reachPrice)) : null;
    const dropPriceNum = dropPrice.trim() ? parseFloat(parseFormattedNumber(dropPrice)) : null;

    if (reachPriceNum === null && dropPriceNum === null) {
      toast.error('At least one of reach price or drop price must be provided');
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

    try {
      const response = await api.put(`/api/price-alerts/${editingAlert.id}`, {
        code: code.toUpperCase().trim(),
        reachPrice: reachPriceNum,
        dropPrice: dropPriceNum,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update price alert');
      }

      toast.success(`Price alert updated for ${code.toUpperCase()}`);
      resetForm();
      setEditDialogOpen(false);
      await fetchAlerts();
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
      await fetchAlerts();
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
      await fetchAlerts();
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
                  <DialogTitle>Create Price Alert</DialogTitle>
                  <DialogDescription>
                    Set up an alert when stock price reaches or drops to a target price.
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
                      placeholder="Alert when price reaches this value"
                    />
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
                      placeholder="Alert when price drops to this value"
                    />
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeCount}</div>
              <CardDescription>Alerts currently monitoring prices</CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{inactiveCount}</div>
              <CardDescription>Alerts that are currently disabled</CardDescription>
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
              <p className="text-muted-foreground">No price alerts yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first price alert to get notified when stocks reach target prices.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Stock Code</TableHead>
                    <TableHead className="min-w-[120px]">Reach Price</TableHead>
                    <TableHead className="min-w-[120px]">Drop Price</TableHead>
                    <TableHead className="min-w-[120px]">Current Price</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[150px]">Condition</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const isReached = alert.reachPrice && alert.marketPrice && alert.marketPrice >= alert.reachPrice;
                    const isDropped = alert.dropPrice && alert.marketPrice && alert.marketPrice <= alert.dropPrice;
                    
                    return (
                      <TableRow key={alert.id}>
                        <TableCell className="font-semibold text-lg">{alert.code}</TableCell>
                        <TableCell>
                          {alert.reachPrice ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{formatPrice(alert.reachPrice)}</span>
                              {isReached && (
                                <Badge variant="default" className="bg-green-600">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  Reached
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.dropPrice ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{formatPrice(alert.dropPrice)}</span>
                              {isDropped && (
                                <Badge variant="destructive">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  Dropped
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {alert.marketPrice ? (
                            <span className="font-mono font-semibold">{formatPrice(alert.marketPrice)}</span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.active ? "default" : "secondary"}>
                            {alert.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {alert.reachPrice && alert.dropPrice && (
                            <span>Price &gt;= {formatPrice(alert.reachPrice)} OR Price &lt;= {formatPrice(alert.dropPrice)}</span>
                          )}
                          {alert.reachPrice && !alert.dropPrice && (
                            <span>Price &gt;= {formatPrice(alert.reachPrice)}</span>
                          )}
                          {!alert.reachPrice && alert.dropPrice && (
                            <span>Price &lt;= {formatPrice(alert.dropPrice)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(alert)}
                            >
                              {alert.active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(alert)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Price Alert</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the price alert for <strong>{alert.code}</strong>?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(alert.id, alert.code)}>
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
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Price Alert</DialogTitle>
              <DialogDescription>
                Update the price alert settings.
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
                  placeholder="Alert when price reaches this value"
                />
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
                  placeholder="Alert when price drops to this value"
                />
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
        
        <p className="mt-4 text-sm text-muted-foreground text-center">
          * Alerts will notify you via WebSocket when stock prices meet your specified conditions (price &gt;= reach price OR price &lt;= drop price). 
          You will receive browser notifications when alerts are triggered.
        </p>
      </main>
    </div>
  );
};

export default PriceAlerts;

