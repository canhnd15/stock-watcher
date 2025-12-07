import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
import { Loader2, Check, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Pencil, X, Activity, RefreshCw, TrendingUp, TrendingDown, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { useTrackedStockStats } from "@/hooks/useTrackedStockStats";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api, getStockRoombars, RoombarResponse } from "@/lib/api";
import { formatNumberWithDots, parseFormattedNumber } from "@/lib/utils";
import { StockRoombarStats } from "@/components/StockRoombarStats";
import { RealtimePriceTracking } from "@/components/RealtimePriceTracking";
import { PortfolioSimulationModal } from "@/components/PortfolioSimulationModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

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
  costBasis?: number;
  volume?: number;
  marketPrice?: number;
  priceChangePercent?: number;
  stats?: TrackedStockStats;
}

type SortField = "code" | "buyLowPrice" | "buyHighPrice" | "buyMaxVolume" | "sellLowPrice" | "sellHighPrice" | "sellMaxVolume";

const ShortTermPortfolio = () => {
  const [stockInput, setStockInput] = useState("");
  const [trackedStocks, setTrackedStocks] = useState<TrackedStock[]>([]);
  const [vn30Codes, setVn30Codes] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loadingVn30, setLoadingVn30] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [customCodesModalOpen, setCustomCodesModalOpen] = useState(false);
  const [costBasisDialogOpen, setCostBasisDialogOpen] = useState(false);
  const [costBasisValues, setCostBasisValues] = useState<Record<string, string>>({});
  const [volumeValuesModal, setVolumeValuesModal] = useState<Record<string, string>>({});
  const [targetPriceValuesModal, setTargetPriceValuesModal] = useState<Record<string, string>>({});
  const [targetPriceModeModal, setTargetPriceModeModal] = useState<Record<string, "value" | "percent">>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<TrackedStock | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editCostBasis, setEditCostBasis] = useState("");
  
  // Volume state for profit calculation - will be synced with backend
  const [volumeValues, setVolumeValues] = useState<Record<string, string>>({});
  const [savingVolume, setSavingVolume] = useState<Record<string, boolean>>({});
  
  // Room bar statistics state
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);
  const [roombarData, setRoombarData] = useState<RoombarResponse | null>(null);
  const [loadingRoombars, setLoadingRoombars] = useState(false);
  const [roombarDialogOpen, setRoombarDialogOpen] = useState(false);
  
  // Realtime price tracking state
  const [realtimePriceTrackingOpen, setRealtimePriceTrackingOpen] = useState(false);
  
  // Portfolio simulation state
  const [portfolioSimulationOpen, setPortfolioSimulationOpen] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  
  // Sorting state - default to code ascending
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");


  // Tracked stock stats
  const { statsMap, isConnected: statsConnected } = useTrackedStockStats();

  // Real-time Signals
  const { isConnected: signalsConnected, signals, clearSignals } = useWebSocket();
  const [refreshingSignals, setRefreshingSignals] = useState(false);
  
  // Refresh market price state
  const [refreshingMarketPrice, setRefreshingMarketPrice] = useState(false);

  // Function to load Short-Term Portfolio and stats
  const loadTrackedStocks = async () => {
    try {
      setLoadingStocks(true);
      
      // Load stocks first (fast, without market price)
      const stocksResponse = await api.get("/api/short-term-tracked-stocks");
      if (!stocksResponse.ok) throw new Error("Failed to load stocks");
      const stocksData: TrackedStock[] = await stocksResponse.json();
      setTrackedStocks(stocksData);
      
      // Initialize volume values from backend data
      const volumeMap: Record<string, string> = {};
      stocksData.forEach(stock => {
        if (stock.volume !== undefined && stock.volume !== null) {
          volumeMap[stock.code] = stock.volume.toString();
        }
      });
      setVolumeValues(volumeMap);
      
      // Load stats for Short-Term Portfolio
      const statsResponse = await api.get("/api/short-term-tracked-stocks/stats");
      if (statsResponse.ok) {
        const statsData: Record<string, TrackedStockStats> = await statsResponse.json();
        // Merge stats with Short-Term Portfolio
        setTrackedStocks((prev) => 
          prev.map((stock) => ({
            ...stock,
            stats: statsData[stock.code],
          }))
        );
      }

      // Load market prices async (non-blocking, after stocks are displayed)
      if (stocksData.length > 0) {
        loadMarketPricesAsync(stocksData.map(s => s.code));
      }
    } catch (error) {
      toast.error("Failed to load Short-Term Portfolio");
    } finally {
      setLoadingStocks(false);
    }
  };

  // Function to load market prices asynchronously
  const loadMarketPricesAsync = async (codes: string[]) => {
    try {
      const response = await api.post("/api/short-term-tracked-stocks/market-prices", codes);
      if (response.ok) {
        const priceMap: Record<string, number> = await response.json();
        
        // Update stocks with market prices
        setTrackedStocks((prev) =>
          prev.map((stock) => {
            const price = priceMap[stock.code];
            if (price !== undefined && price !== null) {
              // Calculate priceChangePercent
              const priceChangePercent = stock.costBasis 
                ? ((price - stock.costBasis) / stock.costBasis) * 100 
                : undefined;
              
              return {
                ...stock,
                marketPrice: price,
                priceChangePercent: priceChangePercent
              };
            }
            return stock;
          })
        );
      }
    } catch (error) {
      console.error("Failed to load market prices:", error);
      // Don't show error toast, just log it (non-critical)
    }
  };

  // Function to save volume to backend
  const saveVolume = async (stockId: number, code: string, volume: string) => {
    const volumeNum = volume.trim() === "" ? null : parseInt(volume, 10);
    
    // Validate volume
    if (volumeNum !== null && (isNaN(volumeNum) || volumeNum < 0)) {
      toast.error(`Invalid volume for ${code}`);
      return;
    }

    // Find the stock to preserve costBasis
    const stock = trackedStocks.find(s => s.id === stockId);
    if (!stock) {
      toast.error(`Stock not found for ${code}`);
      return;
    }

    setSavingVolume(prev => ({ ...prev, [code]: true }));
    
    try {
      // Always send both volume and costBasis to prevent backend from clearing the other field
      const response = await api.put(`/api/short-term-tracked-stocks/${stockId}`, {
        volume: volumeNum,
        costBasis: stock.costBasis || null, // Preserve existing costBasis
      });
      
      if (!response.ok) {
        throw new Error("Failed to save volume");
      }
      
      // Update Short-Term Portfolio with new volume
      setTrackedStocks(prev => 
        prev.map(stock => 
          stock.id === stockId 
            ? { ...stock, volume: volumeNum || undefined }
            : stock
        )
      );
    } catch (error) {
      console.error("Error saving volume:", error);
      toast.error(`Failed to save volume for ${code}`);
      // Revert volume value on error
      if (stock && stock.volume !== undefined) {
        setVolumeValues(prev => ({
          ...prev,
          [code]: stock.volume!.toString()
        }));
      } else {
        setVolumeValues(prev => {
          const newValues = { ...prev };
          delete newValues[code];
          return newValues;
        });
      }
    } finally {
      setSavingVolume(prev => ({ ...prev, [code]: false }));
    }
  };

  // Handle refresh market price
  const handleRefreshMarketPrice = async () => {
    try {
      setRefreshingMarketPrice(true);
      
      const response = await api.post('/api/short-term-tracked-stocks/refresh-market-price');
      
      if (!response.ok) {
        throw new Error('Failed to refresh market prices');
      }
      
      const data = await response.json();
      
      // Update Short-Term Portfolio with new market prices
      if (data.stocks && Array.isArray(data.stocks)) {
        setTrackedStocks((prev) => 
          prev.map((stock) => {
            const updated = data.stocks.find((s: TrackedStock) => s.id === stock.id);
            return updated ? {
              ...stock,
              marketPrice: updated.marketPrice,
              priceChangePercent: updated.priceChangePercent
            } : stock;
          })
        );
      }
      
      toast.success(
        `Market prices refreshed: ${data.successCount} successful, ${data.failedCount} failed`
      );
    } catch (error: any) {
      console.error('Error refreshing market prices:', error);
      toast.error(error?.message || 'Failed to refresh market prices');
    } finally {
      setRefreshingMarketPrice(false);
    }
  };

  // Handle refresh signals
  const handleRefreshSignals = async () => {
    try {
      setRefreshingSignals(true);
      
      // Clear old signals first
      clearSignals();
      
      // Use api.post to automatically include JWT token
      const response = await api.post('/api/signals/refresh');
      
      if (!response.ok) {
        // Handle different error status codes
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. VIP or ADMIN role required.');
        }
        
        // Try to get error message from response
        const errorData = await response.json().catch(() => ({ message: 'Failed to refresh signals' }));
        throw new Error(errorData.message || `Failed to refresh signals (${response.status})`);
      }
      
      const data = await response.json();
      toast.success(data.message || 'Signals refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing signals:', error);
      const errorMessage = error?.message || 'Failed to refresh signals';
      toast.error(errorMessage);
    } finally {
      setRefreshingSignals(false);
    }
  };

  useEffect(() => {
    loadTrackedStocks();
    
    // Load VN30 codes - using hardcoded list
    setLoadingVn30(true);
    const vn30List = [
        "ACB", "BCM", "BID", "CTG", "DGC", "FPT", "GAS", "GVR", "HDB", "HPG", "LPB", "MBB",
        "MSN", "MWG", "PLX", "SAB", "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM",
        "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"
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

  const handleSaveSelectedCodes = () => {
    if (selectedCodes.size === 0) {
      toast.error("Please select at least one stock code");
      return;
    }

    // Initialize cost basis, volume, and target price values for selected codes
    const codes = Array.from(selectedCodes);
    const initialCostBasis: Record<string, string> = {};
    const initialVolume: Record<string, string> = {};
    const initialTargetPrice: Record<string, string> = {};
    const initialTargetPriceMode: Record<string, "value" | "percent"> = {};
    codes.forEach(code => {
      initialCostBasis[code] = "";
      initialVolume[code] = "";
      initialTargetPrice[code] = "";
      initialTargetPriceMode[code] = "percent";
    });
    setCostBasisValues(initialCostBasis);
    setVolumeValuesModal(initialVolume);
    setTargetPriceValuesModal(initialTargetPrice);
    setTargetPriceModeModal(initialTargetPriceMode);
    setCostBasisDialogOpen(true);
  };

  const handleSaveWithCostBasis = async () => {
    const codes = Array.from(selectedCodes);
    let successCount = 0;
    
    try {
      // Add stocks one by one with cost basis, volume, and target price
      for (const code of codes) {
        const costBasisValue = costBasisValues[code]?.trim();
        // Parse formatted number to handle any edge cases
        const costBasisRaw = costBasisValue ? parseFormattedNumber(costBasisValue) : "";
        const costBasis = costBasisRaw ? parseFloat(costBasisRaw) : undefined;
        
        if (costBasis !== undefined && (isNaN(costBasis) || costBasis < 0)) {
          toast.error(`Invalid cost basis for ${code}. Please enter a valid positive number.`);
          continue;
        }

        const volumeValue = volumeValuesModal[code]?.trim();
        // Parse formatted number to handle any edge cases
        const volumeRaw = volumeValue ? parseFormattedNumber(volumeValue) : "";
        const volume = volumeRaw ? parseInt(volumeRaw, 10) : undefined;
        
        if (volume !== undefined && (isNaN(volume) || volume < 0)) {
          toast.error(`Invalid volume for ${code}. Please enter a valid positive number.`);
          continue;
        }

        let targetPrice: number | undefined = undefined;
        const targetPriceValue = targetPriceValuesModal[code]?.trim();
        if (targetPriceValue) {
          // Parse formatted number to handle any edge cases
          const targetPriceRaw = parseFormattedNumber(targetPriceValue);
          const inputValue = parseFloat(targetPriceRaw);
          if (!isNaN(inputValue) && inputValue >= 0) {
            const mode = targetPriceModeModal[code] || "percent";
            if (mode === "percent") {
              if (costBasis && costBasis > 0) {
                targetPrice = costBasis * (1 + inputValue / 100);
              } else {
                toast.error(`Cannot calculate target price from percentage for ${code}: cost basis is required.`);
                continue;
              }
            } else {
              targetPrice = inputValue;
            }
          } else {
            toast.error(`Invalid target price for ${code}. Please enter a valid positive number.`);
            continue;
          }
        }

        const requestBody: { code: string; costBasis?: number; volume?: number; targetPrice?: number } = { code };
        if (costBasis !== undefined && !isNaN(costBasis)) {
          requestBody.costBasis = costBasis;
        }
        if (volume !== undefined && !isNaN(volume)) {
          requestBody.volume = volume;
        }
        if (targetPrice !== undefined && !isNaN(targetPrice)) {
          requestBody.targetPrice = targetPrice;
        }

        const response = await api.post("/api/short-term-tracked-stocks", requestBody);
        if (response.ok) {
          successCount++;
        }
      }
      
      setSelectedCodes(new Set());
      setCostBasisValues({});
      setVolumeValuesModal({});
      setTargetPriceValuesModal({});
      setTargetPriceModeModal({});
      setCostBasisDialogOpen(false);
      toast.success(`Added ${successCount} stock code(s)`);
      
      // Refresh the list
      await loadTrackedStocks();
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
        const response = await api.post("/api/short-term-tracked-stocks", { code });
        if (response.ok) {
          successCount++;
        }
      }
      
      setStockInput("");
      toast.success(`Added ${successCount} stock code(s)`);
      setCustomCodesModalOpen(false);
      
      // Refresh the list
      await loadTrackedStocks();
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
      const response = await api.put(`/api/short-term-tracked-stocks/${id}/toggle`);
      if (!response.ok) throw new Error("Failed");
    } catch (error) {
      // Revert on failure
      setTrackedStocks(prev => prev.map(s => s.id === id ? { ...s, active: !nextActive } : s));
      toast.error(`Failed to update ${current.code}`);
    }
  };

  const handleEdit = (stock: TrackedStock) => {
    setEditingStock(stock);
    setEditCode(stock.code);
    setEditActive(stock.active);
    setEditCostBasis(stock.costBasis?.toString() || "");
    setEditDialogOpen(true);
  };

  const handleUpdateStock = async () => {
    if (!editingStock) return;

    const costBasisValue = editCostBasis.trim();
    let costBasis: number | undefined = undefined;
    if (costBasisValue) {
      const parsed = parseFloat(costBasisValue);
      if (isNaN(parsed) || parsed < 0) {
        toast.error("Invalid cost basis. Please enter a valid positive number.");
        return;
      }
      costBasis = parsed;
    }

    try {
      const requestBody: { code?: string; active?: boolean; costBasis?: number | null; volume?: number | null; targetPrice?: number | null } = {};
      if (editCode !== editingStock.code) {
        requestBody.code = editCode.toUpperCase();
      }
      requestBody.active = editActive;
      // Always send costBasis - null to clear, number to set value
      requestBody.costBasis = costBasisValue.trim() !== "" && costBasis !== undefined ? costBasis : null;
      // Always send volume to preserve it when updating costBasis
      requestBody.volume = editingStock.volume || null;
      // Always send targetPrice to preserve it when updating other fields
      requestBody.targetPrice = editingStock.targetPrice || null;

      const response = await api.put(`/api/short-term-tracked-stocks/${editingStock.id}`, requestBody);
      if (!response.ok) throw new Error("Failed");

      toast.success(`Updated ${editCode}`);
      setEditDialogOpen(false);
      setEditingStock(null);
      
      // Refresh the list
      await loadTrackedStocks();
    } catch (error: any) {
      const errorMessage = error?.response?.data || error?.message || "Failed to update stock";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: number, code: string) => {
    try {
      const response = await api.delete(`/api/short-term-tracked-stocks/${id}`);
      if (!response.ok) throw new Error("Failed");
      
      toast.success(`Deleted ${code} from Short-Term Portfolio`);
      // Remove from local state
      setTrackedStocks(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      toast.error(`Failed to delete ${code}`);
    }
  };

  // Handle stock click to show roombar statistics
  const handleStockClick = async (code: string) => {
    setSelectedStockCode(code);
    setRoombarDialogOpen(true);
    setLoadingRoombars(true);
    setRoombarData(null);
    
    try {
      const data = await getStockRoombars(code);
      setRoombarData(data);
    } catch (error) {
      console.error("Error loading roombar data:", error);
      toast.error(`Failed to load statistics for ${code}`);
      setRoombarData(null);
    } finally {
      setLoadingRoombars(false);
    }
  };

  // Calculate percentage difference helper
  const calculatePercentageDiff = (costBasis: number | undefined, currentPrice: number | undefined): number | null => {
    if (!costBasis || costBasis <= 0 || !currentPrice) return null;
    return ((currentPrice - costBasis) / costBasis) * 100;
  };

  const formatPercentage = (percentage: number | null): string => {
    if (percentage === null) return "";
    const sign = percentage >= 0 ? "+" : "";
    return `(${sign}${percentage.toFixed(2)}%)`;
  };

  // Sorting and pagination logic
  const handleSort = (field: SortField) => {
    let newDirection: "asc" | "desc" = "asc";
    
    if (sortField === field) {
      // Toggle direction if same field
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      // New field, default to ascending
      newDirection = "asc";
    }
    
    setSortField(field);
    setSortDirection(newDirection);
    setPage(0); // Reset to first page when sorting changes
  };

  const formatNumber = (value?: number) => {
    if (value === null || value === undefined) return null;
    return Math.round(value);
  };

  const formatPrice = (value?: number) => {
    if (value === null || value === undefined) return null;
    // Format with period as thousands separator (e.g., -827731 -> -827.731)
    return Math.round(value).toLocaleString('de-DE');
  };

  // Sort and paginate data
  const sortedAndPaginatedStocks = useMemo(() => {
    let sorted = [...trackedStocks];

    if (sortField) {
      sorted.sort((a, b) => {
        // Handle code sorting (string comparison)
        if (sortField === "code") {
          const comparison = a.code.localeCompare(b.code);
          return sortDirection === "asc" ? comparison : -comparison;
        }

        // Handle numeric sorting for other fields
        let aValue: number | null = null;
        let bValue: number | null = null;

        switch (sortField) {
          case "buyLowPrice":
            aValue = formatPrice(a.stats?.lowestPriceBuy);
            bValue = formatPrice(b.stats?.lowestPriceBuy);
            break;
          case "buyHighPrice":
            aValue = formatPrice(a.stats?.highestPriceBuy);
            bValue = formatPrice(b.stats?.highestPriceBuy);
            break;
          case "buyMaxVolume":
            aValue = formatNumber(a.stats?.largestVolumeBuy);
            bValue = formatNumber(b.stats?.largestVolumeBuy);
            break;
          case "sellLowPrice":
            aValue = formatPrice(a.stats?.lowestPriceSell);
            bValue = formatPrice(b.stats?.lowestPriceSell);
            break;
          case "sellHighPrice":
            aValue = formatPrice(a.stats?.highestPriceSell);
            bValue = formatPrice(b.stats?.highestPriceSell);
            break;
          case "sellMaxVolume":
            aValue = formatNumber(a.stats?.largestVolumeSell);
            bValue = formatNumber(b.stats?.largestVolumeSell);
            break;
        }

        // Handle null values (put them at the end)
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        const comparison = aValue - bValue;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    // Apply pagination
    const startIndex = page * size;
    const endIndex = startIndex + size;
    return {
      data: sorted.slice(startIndex, endIndex),
      total: sorted.length,
      totalPages: Math.ceil(sorted.length / size),
    };
  }, [trackedStocks, sortField, sortDirection, page, size]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Short-Term Portfolio</h2>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setPortfolioSimulationOpen(true)}
                variant="outline"
              >
                Portfolio Simulation
              </Button>
              <Button
                onClick={() => setRealtimePriceTrackingOpen(true)}
                variant="default"
                className="relative overflow-hidden animate-border-shine"
              >
                <span className="relative z-10">Price Tracking Realtime</span>
              </Button>
            </div>
          </div>
        
        {/* VN30 Stock Selector */}
        <div className="mb-8 space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">
              Select Stocks For Tracking {selectedCodes.size > 0 && (
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
            <div className="flex gap-2 justify-between items-center">
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

        {/* Cost Basis Input Dialog */}
        <Dialog open={costBasisDialogOpen} onOpenChange={setCostBasisDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Enter Details for Selected Stocks</DialogTitle>
              <DialogDescription>
                Enter the cost basis (purchase price), volume, and target price for each stock. Leave empty if not applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 max-h-[500px] overflow-y-auto">
              {Array.from(selectedCodes).map((code) => (
                <div key={code} className="space-y-3 border-b pb-4 last:border-0">
                  <label className="text-sm font-semibold">{code}</label>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Cost Basis (VND)</label>
                      <Input
                        type="text"
                        placeholder="Cost basis (optional)"
                        value={formatNumberWithDots(costBasisValues[code])}
                        onChange={(e) => {
                          const rawValue = parseFormattedNumber(e.target.value);
                          // Only allow numbers and decimal point
                          if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
                            setCostBasisValues(prev => ({
                              ...prev,
                              [code]: rawValue
                            }));
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Volume</label>
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Volume (optional)"
                          value={formatNumberWithDots(volumeValuesModal[code])}
                          onChange={(e) => {
                            const rawValue = parseFormattedNumber(e.target.value);
                            // Only allow numbers
                            if (rawValue === "" || /^\d+$/.test(rawValue)) {
                              setVolumeValuesModal(prev => ({
                                ...prev,
                                [code]: rawValue
                              }));
                            }
                          }}
                        />
                        <div className="flex gap-2 flex-wrap">
                          {[100, 200, 300, 500, 1000, 5000].map((vol) => (
                            <Button
                              key={vol}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                setVolumeValuesModal(prev => ({
                                  ...prev,
                                  [code]: String(vol)
                                }));
                              }}
                            >
                              {vol.toLocaleString('vi-VN')}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Target Price</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Select
                            value={targetPriceModeModal[code] || "percent"}
                            onValueChange={(value: "value" | "percent") => {
                              setTargetPriceModeModal(prev => ({
                                ...prev,
                                [code]: value
                              }));
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="value">Value</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="text"
                            placeholder={(targetPriceModeModal[code] || "percent") === "percent" ? "Profit %" : "Target price (optional)"}
                            value={formatNumberWithDots(targetPriceValuesModal[code])}
                            onChange={(e) => {
                              const rawValue = parseFormattedNumber(e.target.value);
                              // Only allow numbers and decimal point
                              if (rawValue === "" || /^\d*\.?\d*$/.test(rawValue)) {
                                setTargetPriceValuesModal(prev => ({
                                  ...prev,
                                  [code]: rawValue
                                }));
                              }
                            }}
                            className="flex-1"
                          />
                        </div>
                        {(targetPriceModeModal[code] || "percent") === "percent" && (
                          <div className="flex gap-2 flex-wrap">
                            {[10, 20, 30, 50, 100, 200].map((percent) => (
                              <Button
                                key={percent}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => {
                                  setTargetPriceValuesModal(prev => ({
                                    ...prev,
                                    [code]: String(percent)
                                  }));
                                }}
                              >
                                {percent}%
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setCostBasisDialogOpen(false);
                setCostBasisValues({});
                setVolumeValuesModal({});
                setTargetPriceValuesModal({});
                setTargetPriceModeModal({});
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveWithCostBasis}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Tracked Stock Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Tracked Stock</DialogTitle>
              <DialogDescription>
                Update the stock code, active status, and cost basis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Stock Code</label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="Stock code"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cost Basis</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCostBasis}
                  onChange={(e) => setEditCostBasis(e.target.value)}
                  placeholder="Cost basis (optional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editActive}
                  onCheckedChange={(checked) => setEditActive(checked === true)}
                  id="edit-active"
                />
                <label htmlFor="edit-active" className="text-sm font-medium cursor-pointer">
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setEditDialogOpen(false);
                setEditingStock(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStock}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Refresh Market Price Button */}
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            onClick={handleRefreshMarketPrice}
            disabled={refreshingMarketPrice || loadingStocks}
            className="border-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingMarketPrice ? 'animate-spin' : ''}`} />
            Refresh Market Price
          </Button>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("code")}
                  >
                    Stock
                    {sortField === "code" ? (
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
                <TableHead>Cost Basis</TableHead>
                <TableHead className="text-center">Market Price</TableHead>
                <TableHead className="text-center w-32">Volume / Profit</TableHead>
                <TableHead className="text-center bg-green-50 w-28">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("buyLowPrice")}
                  >
                    Low Price
                    {sortField === "buyLowPrice" ? (
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
                <TableHead className="text-center bg-green-50 w-28">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("buyHighPrice")}
                  >
                    High Price
                    {sortField === "buyHighPrice" ? (
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
                <TableHead className="text-center bg-green-50 border-r-2 border-gray-300 w-28">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("buyMaxVolume")}
                  >
                    Max Volume
                    {sortField === "buyMaxVolume" ? (
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
                <TableHead className="text-center bg-red-50 w-28">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("sellLowPrice")}
                  >
                    Low Price
                    {sortField === "sellLowPrice" ? (
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
                <TableHead className="text-center bg-red-50 w-28">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("sellHighPrice")}
                  >
                    High Price
                    {sortField === "sellHighPrice" ? (
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
                <TableHead className="text-center bg-red-50 w-28">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSort("sellMaxVolume")}
                  >
                    Max Volume
                    {sortField === "sellMaxVolume" ? (
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStocks ? (
                // Loading skeleton rows
                Array.from({ length: size }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30 border-r-2 border-gray-300 w-28">
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-14" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30 w-28">
                      <Skeleton className="h-4 w-16 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end">
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                sortedAndPaginatedStocks.data.map((stock) => {
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

                const buyLowPriceDiff = calculatePercentageDiff(stock.costBasis, stats?.lowestPriceBuy);
                const buyHighPriceDiff = calculatePercentageDiff(stock.costBasis, stats?.highestPriceBuy);
                const sellLowPriceDiff = calculatePercentageDiff(stock.costBasis, stats?.lowestPriceSell);
                const sellHighPriceDiff = calculatePercentageDiff(stock.costBasis, stats?.highestPriceSell);

                return (
                  <TableRow key={stock.code}>
                    <TableCell className="font-semibold text-lg">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleStockClick(stock.code)}
                            className="hover:underline cursor-pointer text-primary font-semibold"
                          >
                            {stock.code}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to view {stock.code} 10 days stats</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {stock.costBasis ? (
                        <span className="text-sm font-medium">{formatPrice(stock.costBasis)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {stock.marketPrice ? (
                          <>
                            <span className="text-sm font-semibold">{formatPrice(stock.marketPrice)}</span>
                            {stock.priceChangePercent !== undefined && stock.priceChangePercent !== null && (
                              <span className={`text-xs font-medium ${
                                stock.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {stock.priceChangePercent >= 0 ? '+' : ''}{stock.priceChangePercent.toFixed(2)}%
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center w-32">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const currentValue = volumeValues[stock.code] || "0";
                              const numValue = parseInt(currentValue) || 0;
                              const newValue = Math.max(0, numValue + 100);
                              setVolumeValues(prev => ({
                                ...prev,
                                [stock.code]: newValue.toString()
                              }));
                              // Auto-save on button click
                              setTimeout(() => {
                                saveVolume(stock.id, stock.code, newValue.toString());
                              }, 0);
                            }}
                            disabled={savingVolume[stock.code] || !stock.active}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="Volume"
                              value={volumeValues[stock.code] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setVolumeValues(prev => ({
                                  ...prev,
                                  [stock.code]: value
                                }));
                              }}
                              onBlur={() => {
                                const currentValue = volumeValues[stock.code] || "";
                                const savedValue = stock.volume?.toString() || "";
                                if (currentValue !== savedValue) {
                                  saveVolume(stock.id, stock.code, currentValue);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  const currentValue = volumeValues[stock.code] || "0";
                                  const numValue = parseInt(currentValue) || 0;
                                  const newValue = Math.max(0, numValue + 100);
                                  setVolumeValues(prev => ({
                                    ...prev,
                                    [stock.code]: newValue.toString()
                                  }));
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const currentValue = volumeValues[stock.code] || "0";
                                  const numValue = parseInt(currentValue) || 0;
                                  const newValue = Math.max(0, numValue - 100);
                                  setVolumeValues(prev => ({
                                    ...prev,
                                    [stock.code]: newValue.toString()
                                  }));
                                }
                              }}
                              onWheel={(e) => {
                                e.preventDefault();
                                const currentValue = volumeValues[stock.code] || "0";
                                const numValue = parseInt(currentValue) || 0;
                                const newValue = e.deltaY < 0 
                                  ? Math.max(0, numValue + 100)
                                  : Math.max(0, numValue - 100);
                                setVolumeValues(prev => ({
                                  ...prev,
                                  [stock.code]: newValue.toString()
                                }));
                              }}
                              className="w-24 h-8 text-sm text-center"
                              min="0"
                              step="100"
                              disabled={savingVolume[stock.code] || !stock.active}
                            />
                            {savingVolume[stock.code] && (
                              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              const currentValue = volumeValues[stock.code] || "0";
                              const numValue = parseInt(currentValue) || 0;
                              const newValue = Math.max(0, numValue - 100);
                              setVolumeValues(prev => ({
                                ...prev,
                                [stock.code]: newValue.toString()
                              }));
                              // Auto-save on button click
                              setTimeout(() => {
                                saveVolume(stock.id, stock.code, newValue.toString());
                              }, 0);
                            }}
                            disabled={savingVolume[stock.code] || !stock.active}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        {volumeValues[stock.code] && stock.marketPrice && stock.costBasis && !isNaN(parseFloat(volumeValues[stock.code])) && parseFloat(volumeValues[stock.code]) > 0 && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Profit: </span>
                            <span className={`font-semibold ${
                              (stock.marketPrice - stock.costBasis) * parseFloat(volumeValues[stock.code]) >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {formatPrice((stock.marketPrice - stock.costBasis) * parseFloat(volumeValues[stock.code]))}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-muted-foreground">{formatPrice(stats?.lowestPriceBuy)}</span>
                        {buyLowPriceDiff !== null && (
                          <span className={`text-xs ${buyLowPriceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(buyLowPriceDiff)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-muted-foreground">{formatPrice(stats?.highestPriceBuy)}</span>
                        {buyHighPriceDiff !== null && (
                          <span className={`text-xs ${buyHighPriceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(buyHighPriceDiff)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-green-50/30 border-r-2 border-gray-300 w-28">
                      <span className="text-sm font-medium text-green-600">{formatNumber(stats?.largestVolumeBuy)}</span>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-muted-foreground">{formatPrice(stats?.lowestPriceSell)}</span>
                        {sellLowPriceDiff !== null && (
                          <span className={`text-xs ${sellLowPriceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(sellLowPriceDiff)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30 w-28">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-muted-foreground">{formatPrice(stats?.highestPriceSell)}</span>
                        {sellHighPriceDiff !== null && (
                          <span className={`text-xs ${sellHighPriceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(sellHighPriceDiff)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center bg-red-50/30 w-28">
                      <span className="text-sm font-medium text-red-600">{formatNumber(stats?.largestVolumeSell)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleActive(stock.id)}>
                            <Check className={`mr-2 h-4 w-4 ${stock.active ? 'opacity-100' : 'opacity-0'}`} />
                            {stock.active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(stock)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Short-Term Stock</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove <strong>{stock.code}</strong> from Short-Term Portfolio?
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
              )}
              {!loadingStocks && sortedAndPaginatedStocks.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    {trackedStocks.length === 0 
                      ? "No Short-Term Portfolio yet. Add some codes above to get started."
                      : "No results on this page."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {/* Total Profit Row */}
            {!loadingStocks && trackedStocks.length > 0 && (() => {
              const totalProfit = trackedStocks.reduce((sum, stock) => {
                const volume = volumeValues[stock.code];
                if (volume && stock.marketPrice && stock.costBasis && !isNaN(parseFloat(volume)) && parseFloat(volume) > 0) {
                  return sum + (stock.marketPrice - stock.costBasis) * parseFloat(volume);
                }
                return sum;
              }, 0);
              
              return (
                <tfoot>
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={4} className="text-left">
                      Total Profit:
                    </TableCell>
                    <TableCell className="text-left">
                      <span className={`text-lg font-bold ${
                        totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPrice(totalProfit)}
                      </span>
                    </TableCell>
                    <TableCell colSpan={5}></TableCell>
                  </TableRow>
                </tfoot>
              );
            })()}
          </Table>
        </div>

        {/* Pagination */}
        {sortedAndPaginatedStocks.total > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Page size: <span className="font-semibold">{size}</span></span>
                <span>•</span>
                <span>Current page: <span className="font-semibold">{page + 1}</span></span>
                <span>•</span>
                <span>Total pages: <span className="font-semibold">{sortedAndPaginatedStocks.totalPages}</span></span>
                <span>•</span>
                <span>Total records: <span className="font-semibold">{sortedAndPaginatedStocks.total.toLocaleString()}</span></span>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={String(size)} onValueChange={(v) => { 
                const n = Number(v); 
                setSize(n); 
                setPage(0); 
              }}>
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
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 0} 
                onClick={() => setPage(page - 1)}
              >
                Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page + 1 >= sortedAndPaginatedStocks.totalPages} 
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Real-time Signals Section */}
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
              
              <div className="flex items-center gap-3">
                {/* Refresh Button */}
                <Button
                  variant="outline"
                  onClick={handleRefreshSignals}
                  disabled={refreshingSignals || !signalsConnected}
                  className="border-2"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshingSignals ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                {/* Connection Status */}
                <Card className={`${signalsConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} transition-colors`}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${signalsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-sm font-semibold ${signalsConnected ? 'text-green-700' : 'text-red-700'}`}>
                      {signalsConnected ? 'Active' : 'Disconnected'}
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
                  {signalsConnected ? 'Listening for signals...' : 'Connecting...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Signals appear when strong buy/sell pressure is detected
                </p>
                {signalsConnected && (
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

        {/* Room Bar Statistics Dialog */}
        <Dialog open={roombarDialogOpen} onOpenChange={setRoombarDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedStockCode} - 10-Day Room Bar Statistics
              </DialogTitle>
              <DialogDescription>
                Buy/Sell room statistics from the last 10 trading days
              </DialogDescription>
            </DialogHeader>
            {loadingRoombars ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : roombarData?.data?.bars ? (
              <StockRoombarStats 
                bars={roombarData.data.bars} 
                code={selectedStockCode || ""} 
              />
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No statistics available
              </div>
            )}
          </DialogContent>
        </Dialog>

          {/* Portfolio Simulation Modal */}
          <PortfolioSimulationModal
            open={portfolioSimulationOpen}
            onOpenChange={setPortfolioSimulationOpen}
            vn30Codes={vn30Codes}
            apiEndpoint="/api/short-term-tracked-stocks/simulate-portfolio"
            fetchStocksEndpoint="/api/short-term-tracked-stocks"
          />

          {/* Realtime Price Tracking Dialog */}
          <RealtimePriceTracking
            open={realtimePriceTrackingOpen}
            onOpenChange={setRealtimePriceTrackingOpen}
            vn30Codes={vn30Codes}
          />
        </main>
      </div>
    </TooltipProvider>
  );
};

export default ShortTermPortfolio;
