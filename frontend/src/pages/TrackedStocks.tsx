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
import { Loader2, Check, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Pencil, X, Activity, RefreshCw, TrendingUp, TrendingDown, MoreVertical, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { useTrackedStockStats } from "@/hooks/useTrackedStockStats";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api, getStockRoombars, RoombarResponse } from "@/lib/api";
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
  targetPrice?: number;
  marketPrice?: number;
  priceChangePercent?: number;
  targetProfit?: number;
  stats?: TrackedStockStats;
}

type SortField = "code";

const TrackedStocks = () => {
  const [stockInput, setStockInput] = useState("");
  const [trackedStocks, setTrackedStocks] = useState<TrackedStock[]>([]);
  const [shortTermStocks, setShortTermStocks] = useState<TrackedStock[]>([]);
  const [vn30Codes, setVn30Codes] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loadingVn30, setLoadingVn30] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingShortTermStocks, setLoadingShortTermStocks] = useState(true);
  const [customCodesModalOpen, setCustomCodesModalOpen] = useState(false);
  const [costBasisDialogOpen, setCostBasisDialogOpen] = useState(false);
  const [costBasisValues, setCostBasisValues] = useState<Record<string, string>>({});
  const [shortTermCostBasisDialogOpen, setShortTermCostBasisDialogOpen] = useState(false);
  const [shortTermCostBasisValues, setShortTermCostBasisValues] = useState<Record<string, string>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<TrackedStock | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editCostBasis, setEditCostBasis] = useState("");
  
  // Volume state for profit calculation - will be synced with backend
  const [volumeValues, setVolumeValues] = useState<Record<string, string>>({});
  const [savingVolume, setSavingVolume] = useState<Record<string, boolean>>({});
  
  // Target price state - supports both direct value and percentage
  const [targetPriceValues, setTargetPriceValues] = useState<Record<string, string>>({});
  const [targetPriceMode, setTargetPriceMode] = useState<Record<string, "value" | "percent">>({});
  const [savingTargetPrice, setSavingTargetPrice] = useState<Record<string, boolean>>({});
  
  // Track unsaved changes
  const [unsavedChanges, setUnsavedChanges] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  
  // Short-term portfolio state
  const [shortTermVolumeValues, setShortTermVolumeValues] = useState<Record<string, string>>({});
  const [savingShortTermVolume, setSavingShortTermVolume] = useState<Record<string, boolean>>({});
  const [shortTermTargetPriceValues, setShortTermTargetPriceValues] = useState<Record<string, string>>({});
  const [shortTermTargetPriceMode, setShortTermTargetPriceMode] = useState<Record<string, "value" | "percent">>({});
  const [savingShortTermTargetPrice, setSavingShortTermTargetPrice] = useState<Record<string, boolean>>({});
  const [shortTermUnsavedChanges, setShortTermUnsavedChanges] = useState<Set<string>>(new Set());
  const [savingShortTermAll, setSavingShortTermAll] = useState(false);
  const [shortTermEditDialogOpen, setShortTermEditDialogOpen] = useState(false);
  const [editingShortTermStock, setEditingShortTermStock] = useState<TrackedStock | null>(null);
  const [shortTermPage, setShortTermPage] = useState(0);
  const [shortTermSize, setShortTermSize] = useState(10);
  const [shortTermSortField, setShortTermSortField] = useState<SortField>("code");
  const [shortTermSortDirection, setShortTermSortDirection] = useState<"asc" | "desc">("asc");
  const [refreshingShortTermMarketPrice, setRefreshingShortTermMarketPrice] = useState(false);
  
  // Room bar statistics state
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);
  const [roombarData, setRoombarData] = useState<RoombarResponse | null>(null);
  const [loadingRoombars, setLoadingRoombars] = useState(false);
  const [roombarDialogOpen, setRoombarDialogOpen] = useState(false);
  
  // Realtime price tracking state
  const [realtimePriceTrackingOpen, setRealtimePriceTrackingOpen] = useState(false);
  
  // Portfolio simulation state
  const [portfolioSimulationOpen, setPortfolioSimulationOpen] = useState(false);
  const [shortTermPortfolioSimulationOpen, setShortTermPortfolioSimulationOpen] = useState(false);
  
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

  // Function to load tracked stocks and stats
  const loadTrackedStocks = async () => {
    try {
      setLoadingStocks(true);
      const stocksResponse = await api.get("/api/tracked-stocks");
      if (!stocksResponse.ok) throw new Error("Failed to load stocks");
      const stocksData: TrackedStock[] = await stocksResponse.json();
      setTrackedStocks(stocksData);
      
      // Initialize volume values from backend data
      const volumeMap: Record<string, string> = {};
      const targetPriceMap: Record<string, string> = {};
      const targetPriceModeMap: Record<string, "value" | "percent"> = {};
      stocksData.forEach(stock => {
        if (stock.volume !== undefined && stock.volume !== null) {
          volumeMap[stock.code] = stock.volume.toString();
        }
        if (stock.targetPrice !== undefined && stock.targetPrice !== null) {
          targetPriceMap[stock.code] = stock.targetPrice.toString();
          targetPriceModeMap[stock.code] = "value";
        }
      });
      setVolumeValues(volumeMap);
      setTargetPriceValues(targetPriceMap);
      setTargetPriceMode(targetPriceModeMap);
      setUnsavedChanges(new Set()); // Clear unsaved changes after loading
      
      // Load stats for tracked stocks
      const statsResponse = await api.get("/api/tracked-stocks/stats");
      if (statsResponse.ok) {
        const statsData: Record<string, TrackedStockStats> = await statsResponse.json();
        // Merge stats with tracked stocks
        setTrackedStocks((prev) => 
          prev.map((stock) => ({
            ...stock,
            stats: statsData[stock.code],
          }))
        );
      }
    } catch (error) {
      toast.error("Failed to load tracked stocks");
    } finally {
      setLoadingStocks(false);
    }
  };

  // Calculate new cost basis when volume changes
  // Formula: (oldVolume * oldCostBasis + volumeChange * marketPrice) / newVolume
  const calculateNewCostBasis = (
    oldVolume: number,
    oldCostBasis: number,
    newVolume: number,
    marketPrice: number | undefined | null
  ): number | null => {
    if (!oldCostBasis || oldVolume <= 0 || newVolume <= 0) {
      return oldCostBasis || null;
    }
    
    if (!marketPrice || marketPrice <= 0) {
      // If no market price, keep old cost basis
      return oldCostBasis;
    }
    
    const volumeChange = newVolume - oldVolume;
    
    if (volumeChange === 0) {
      return oldCostBasis;
    }
    
    // Calculate new cost basis: (oldVolume * oldCostBasis + volumeChange * marketPrice) / newVolume
    const newCostBasis = (oldVolume * oldCostBasis + volumeChange * marketPrice) / newVolume;
    
    return newCostBasis;
  };

  // Calculate target profit locally: (targetPrice - costBasis) * volume
  const calculateTargetProfit = (stock: TrackedStock): number | null => {
    const volumeStr = volumeValues[stock.code] || stock.volume?.toString() || "0";
    const volume = parseFloat(volumeStr);
    
    // Use recalculated cost basis if volume changed, otherwise use stock.costBasis
    const currentCostBasis = getCurrentCostBasis(stock);
    
    if (!currentCostBasis || volume <= 0) return null;
    
    // Get target price from input or saved value
    let targetPrice: number | null = null;
    const targetPriceInput = targetPriceValues[stock.code];
    const mode = targetPriceMode[stock.code] || "value";
    
    if (targetPriceInput && targetPriceInput.trim() !== "") {
      const inputValue = parseFloat(targetPriceInput);
      if (!isNaN(inputValue) && inputValue >= 0) {
        if (mode === "percent") {
          if (currentCostBasis && currentCostBasis > 0) {
            targetPrice = currentCostBasis * (1 + inputValue / 100);
          }
        } else {
          targetPrice = inputValue;
        }
      }
    } else if (stock.targetPrice) {
      targetPrice = stock.targetPrice;
    }
    
    if (!targetPrice) return null;
    
    return (targetPrice - currentCostBasis) * volume;
  };

  // Get current cost basis (recalculated if volume changed)
  const getCurrentCostBasis = (stock: TrackedStock): number | null => {
    const volumeStr = volumeValues[stock.code];
    const oldVolume = stock.volume || 0;
    const newVolume = volumeStr ? parseInt(volumeStr, 10) : oldVolume;
    
    if (!stock.costBasis || oldVolume === 0) {
      return stock.costBasis || null;
    }
    
    // If volume hasn't changed, return original cost basis
    if (newVolume === oldVolume || !volumeStr) {
      return stock.costBasis;
    }
    
    // Calculate new cost basis
    const newCostBasis = calculateNewCostBasis(
      oldVolume,
      stock.costBasis,
      newVolume,
      stock.marketPrice
    );
    
    return newCostBasis;
  };

  // Calculate current profit (recalculated if volume or cost basis changed)
  const calculateCurrentProfit = (stock: TrackedStock): number | null => {
    const volumeStr = volumeValues[stock.code];
    const volume = volumeStr ? parseFloat(volumeStr) : (stock.volume || 0);
    
    if (volume <= 0 || !stock.marketPrice) {
      return null;
    }
    
    const currentCostBasis = getCurrentCostBasis(stock);
    if (!currentCostBasis) {
      return null;
    }
    
    // Profit = (marketPrice - costBasis) * volume
    const profit = (stock.marketPrice - currentCostBasis) * volume;
    
    return profit;
  };

  // Save all pending changes
  const saveAllChanges = async () => {
    if (unsavedChanges.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setSavingAll(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const code of Array.from(unsavedChanges)) {
        const stock = trackedStocks.find(s => s.code === code);
        if (!stock) continue;

        try {
          // Get current values from state
          const volumeStr = volumeValues[code] || "";
          const volumeNum = volumeStr.trim() === "" ? null : parseInt(volumeStr, 10);
          
          let targetPrice: number | null = null;
          const targetPriceInput = targetPriceValues[code];
          const mode = targetPriceMode[code] || "value";
          
          if (targetPriceInput && targetPriceInput.trim() !== "") {
            const inputValue = parseFloat(targetPriceInput);
            if (!isNaN(inputValue) && inputValue >= 0) {
              if (mode === "percent") {
                if (stock.costBasis && stock.costBasis > 0) {
                  targetPrice = stock.costBasis * (1 + inputValue / 100);
                }
              } else {
                targetPrice = inputValue;
              }
            }
          }

          // Calculate new cost basis if volume changed
          let newCostBasis = stock.costBasis || null;
          const oldVolume = stock.volume || 0;
          if (volumeNum !== null && oldVolume > 0 && volumeNum !== oldVolume && stock.marketPrice) {
            const calculatedCostBasis = calculateNewCostBasis(
              oldVolume,
              stock.costBasis!,
              volumeNum,
              stock.marketPrice
            );
            if (calculatedCostBasis !== null) {
              newCostBasis = calculatedCostBasis;
            }
          }

          const response = await api.put(`/api/tracked-stocks/${stock.id}`, {
            volume: volumeNum,
            costBasis: newCostBasis,
            targetPrice: targetPrice,
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error saving ${code}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        await loadTrackedStocks();
        setUnsavedChanges(new Set());
        toast.success(`Saved ${successCount} stock(s)${failCount > 0 ? `, ${failCount} failed` : ""}`);
      } else {
        toast.error("Failed to save changes");
      }
    } catch (error) {
      console.error("Error saving all changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setSavingAll(false);
    }
  };

  // Function to save target price to backend (kept for backward compatibility, but not used in new flow)
  const saveTargetPrice = async (stockId: number, code: string, targetPriceInput: string, mode: "value" | "percent") => {
    const stock = trackedStocks.find(s => s.id === stockId);
    if (!stock) {
      toast.error(`Stock not found for ${code}`);
      return;
    }

    let targetPrice: number | null = null;
    
    if (targetPriceInput.trim() !== "") {
      const inputValue = parseFloat(targetPriceInput);
      if (isNaN(inputValue) || inputValue < 0) {
        toast.error(`Invalid target price for ${code}`);
        return;
      }
      
      if (mode === "percent") {
        // Calculate target price from percentage: costBasis * (1 + percent/100)
        if (stock.costBasis && stock.costBasis > 0) {
          targetPrice = stock.costBasis * (1 + inputValue / 100);
        } else {
          toast.error(`Cannot calculate target price from percentage: cost basis is required for ${code}`);
          return;
        }
      } else {
        targetPrice = inputValue;
      }
    }

    setSavingTargetPrice(prev => ({ ...prev, [code]: true }));
    
    try {
      // Use volume from state if available, otherwise from stock object
      const currentVolume = volumeValues[code] ? parseInt(volumeValues[code], 10) : (stock.volume || null);
      
      const response = await api.put(`/api/tracked-stocks/${stockId}`, {
        targetPrice: targetPrice,
        costBasis: stock.costBasis || null,
        volume: currentVolume,
      });
      
      if (!response.ok) {
        throw new Error("Failed to save target price");
      }
      
      // Reload stocks to get updated target profit calculation from backend
      await loadTrackedStocks();
      
      // Update the input value to show the calculated price if percentage mode
      if (mode === "percent" && targetPrice !== null) {
        setTargetPriceValues(prev => ({
          ...prev,
          [code]: targetPrice!.toString()
        }));
        setTargetPriceMode(prev => ({
          ...prev,
          [code]: "value"
        }));
      }
    } catch (error) {
      console.error("Error saving target price:", error);
      toast.error(`Failed to save target price for ${code}`);
      // Revert target price value on error
      if (stock && stock.targetPrice !== undefined) {
        setTargetPriceValues(prev => ({
          ...prev,
          [code]: stock.targetPrice!.toString()
        }));
      } else {
        setTargetPriceValues(prev => {
          const newValues = { ...prev };
          delete newValues[code];
          return newValues;
        });
      }
    } finally {
      setSavingTargetPrice(prev => ({ ...prev, [code]: false }));
    }
  };

  // Function to mark changes as unsaved (no longer auto-saves)
  const markAsUnsaved = (code: string) => {
    setUnsavedChanges(prev => new Set(prev).add(code));
  };

  // Discard all pending changes for tracked stocks
  const discardAllChanges = () => {
    if (unsavedChanges.size === 0) {
      toast.info("No changes to discard");
      return;
    }

    const changeCount = unsavedChanges.size;

    // Revert volume values back to original values from trackedStocks
    const volumeMap: Record<string, string> = {};
    const targetPriceMap: Record<string, string> = {};
    const targetPriceModeMap: Record<string, "value" | "percent"> = {};
    
    trackedStocks.forEach(stock => {
      if (stock.volume !== undefined && stock.volume !== null) {
        volumeMap[stock.code] = stock.volume.toString();
      }
      if (stock.targetPrice !== undefined && stock.targetPrice !== null) {
        targetPriceMap[stock.code] = stock.targetPrice.toString();
        targetPriceModeMap[stock.code] = "value";
      }
    });

    // Only revert values for stocks with unsaved changes
    const revertedVolumeMap: Record<string, string> = { ...volumeValues };
    const revertedTargetPriceMap: Record<string, string> = { ...targetPriceValues };
    const revertedTargetPriceModeMap: Record<string, "value" | "percent"> = { ...targetPriceMode };

    unsavedChanges.forEach(code => {
      if (volumeMap[code] !== undefined) {
        revertedVolumeMap[code] = volumeMap[code];
      } else {
        delete revertedVolumeMap[code];
      }
      
      if (targetPriceMap[code] !== undefined) {
        revertedTargetPriceMap[code] = targetPriceMap[code];
        revertedTargetPriceModeMap[code] = "value";
      } else {
        delete revertedTargetPriceMap[code];
        delete revertedTargetPriceModeMap[code];
      }
    });

    setVolumeValues(revertedVolumeMap);
    setTargetPriceValues(revertedTargetPriceMap);
    setTargetPriceMode(revertedTargetPriceModeMap);
    setUnsavedChanges(new Set());
    
    toast.success(`Discarded changes for ${changeCount} stock(s)`);
  };

  // Handle refresh market price
  const handleRefreshMarketPrice = async () => {
    try {
      setRefreshingMarketPrice(true);
      
      const response = await api.post('/api/tracked-stocks/refresh-market-price');
      
      if (!response.ok) {
        throw new Error('Failed to refresh market prices');
      }
      
      const data = await response.json();
      
      // Update tracked stocks with new market prices
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

  // Function to load short-term tracked stocks and stats
  const loadShortTermTrackedStocks = async () => {
    try {
      setLoadingShortTermStocks(true);
      const stocksResponse = await api.get("/api/short-term-tracked-stocks");
      if (!stocksResponse.ok) throw new Error("Failed to load short-term stocks");
      const stocksData: TrackedStock[] = await stocksResponse.json();
      setShortTermStocks(stocksData);
      
      // Initialize volume values from backend data
      const volumeMap: Record<string, string> = {};
      const targetPriceMap: Record<string, string> = {};
      const targetPriceModeMap: Record<string, "value" | "percent"> = {};
      stocksData.forEach(stock => {
        if (stock.volume !== undefined && stock.volume !== null) {
          volumeMap[stock.code] = stock.volume.toString();
        }
        if (stock.targetPrice !== undefined && stock.targetPrice !== null) {
          targetPriceMap[stock.code] = stock.targetPrice.toString();
          targetPriceModeMap[stock.code] = "value";
        }
      });
      setShortTermVolumeValues(volumeMap);
      setShortTermTargetPriceValues(targetPriceMap);
      setShortTermTargetPriceMode(targetPriceModeMap);
      setShortTermUnsavedChanges(new Set()); // Clear unsaved changes after loading
      
      // Load stats for short-term tracked stocks
      const statsResponse = await api.get("/api/short-term-tracked-stocks/stats");
      if (statsResponse.ok) {
        const statsData: Record<string, TrackedStockStats> = await statsResponse.json();
        // Merge stats with tracked stocks
        setShortTermStocks((prev) => 
          prev.map((stock) => ({
            ...stock,
            stats: statsData[stock.code],
          }))
        );
      }
    } catch (error) {
      toast.error("Failed to load short-term tracked stocks");
    } finally {
      setLoadingShortTermStocks(false);
    }
  };

  useEffect(() => {
    loadTrackedStocks();
    loadShortTermTrackedStocks();
    
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
      setShortTermStocks((prev) =>
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

    // Initialize cost basis values for selected codes
    const codes = Array.from(selectedCodes);
    const initialValues: Record<string, string> = {};
    codes.forEach(code => {
      initialValues[code] = "";
    });
    setCostBasisValues(initialValues);
    setCostBasisDialogOpen(true);
  };

  const handleSaveSelectedCodesToShortTerm = () => {
    if (selectedCodes.size === 0) {
      toast.error("Please select at least one stock code");
      return;
    }

    // Initialize cost basis values for selected codes
    const codes = Array.from(selectedCodes);
    const initialValues: Record<string, string> = {};
    codes.forEach(code => {
      initialValues[code] = "";
    });
    setShortTermCostBasisValues(initialValues);
    setShortTermCostBasisDialogOpen(true);
  };

  const handleSaveWithCostBasis = async () => {
    const codes = Array.from(selectedCodes);
    let successCount = 0;
    
    try {
      // Add stocks one by one with cost basis
      for (const code of codes) {
        const costBasisValue = costBasisValues[code]?.trim();
        const costBasis = costBasisValue ? parseFloat(costBasisValue) : undefined;
        
        if (costBasis !== undefined && (isNaN(costBasis) || costBasis < 0)) {
          toast.error(`Invalid cost basis for ${code}. Please enter a valid positive number.`);
          continue;
        }

        const requestBody: { code: string; costBasis?: number } = { code };
        if (costBasis !== undefined && !isNaN(costBasis)) {
          requestBody.costBasis = costBasis;
        }

        const response = await api.post("/api/tracked-stocks", requestBody);
        if (response.ok) {
          successCount++;
        }
      }
      
      setSelectedCodes(new Set());
      setCostBasisValues({});
      setCostBasisDialogOpen(false);
      toast.success(`Added ${successCount} stock code(s)`);
      
      // Refresh the list
      await loadTrackedStocks();
    } catch (error) {
      toast.error("Failed to add some codes");
    }
  };

  const handleSaveShortTermWithCostBasis = async () => {
    const codes = Array.from(selectedCodes);
    let successCount = 0;
    
    try {
      // Add stocks one by one with cost basis to short-term portfolio
      for (const code of codes) {
        const costBasisValue = shortTermCostBasisValues[code]?.trim();
        const costBasis = costBasisValue ? parseFloat(costBasisValue) : undefined;
        
        if (costBasis !== undefined && (isNaN(costBasis) || costBasis < 0)) {
          toast.error(`Invalid cost basis for ${code}. Please enter a valid positive number.`);
          continue;
        }

        const requestBody: { code: string; costBasis?: number } = { code };
        if (costBasis !== undefined && !isNaN(costBasis)) {
          requestBody.costBasis = costBasis;
        }

        const response = await api.post("/api/short-term-tracked-stocks", requestBody);
        if (response.ok) {
          successCount++;
        }
      }
      
      setSelectedCodes(new Set());
      setShortTermCostBasisValues({});
      setShortTermCostBasisDialogOpen(false);
      toast.success(`Added ${successCount} stock code(s) to short-term portfolio`);
      
      // Refresh the list
      await loadShortTermTrackedStocks();
    } catch (error) {
      toast.error("Failed to add some codes");
    }
  };

  // State for custom stock validation and input
  const [validatedStocks, setValidatedStocks] = useState<Array<{
    code: string;
    marketPrice: number | null;
    costBasis: string;
    volume: string;
    targetPrice: string;
    targetPriceMode: "value" | "percent";
    isValid: boolean;
    error?: string;
  }>>([]);
  const [validatingStocks, setValidatingStocks] = useState(false);
  const [showStockInputs, setShowStockInputs] = useState(false);
  const [portfolioType, setPortfolioType] = useState<"tracked-stocks" | "short-term-tracked-stocks">("tracked-stocks");

  const handleValidateAndPrepareStocks = async () => {
    // Parse codes: split by comma, space, or newline, but preserve dots within codes
    const codes = stockInput
      .split(/[\s\n,]+/)
      .map(code => code.trim().toUpperCase())
      .filter(code => code.length > 0);
    
    if (codes.length === 0) {
      toast.error("Please enter at least one stock code");
      return;
    }

    setValidatingStocks(true);
    const validated: typeof validatedStocks = [];

    try {
      // Validate each stock by checking market price
      for (const code of codes) {
        try {
          // URL encode the code to handle special characters like dots
          const encodedCode = encodeURIComponent(code);
          const response = await api.get(`/api/stocks/market-price/${encodedCode}`);
          if (response.ok) {
            const data: { code: string; marketPrice: number | null } = await response.json();
            if (data.marketPrice !== null && data.marketPrice !== undefined) {
              validated.push({
                code,
                marketPrice: data.marketPrice,
                costBasis: data.marketPrice.toString(), // Pre-fill with market price
                volume: "",
                targetPrice: "",
                targetPriceMode: "value",
                isValid: true,
              });
            } else {
              validated.push({
                code,
                marketPrice: null,
                costBasis: "",
                volume: "",
                targetPrice: "",
                targetPriceMode: "value",
                isValid: false,
                error: "Failed to fetch market price",
              });
            }
          } else {
            validated.push({
              code,
              marketPrice: null,
              costBasis: "",
              volume: "",
              targetPrice: "",
              targetPriceMode: "value",
              isValid: false,
              error: "Stock not found or invalid",
            });
          }
        } catch (error) {
          validated.push({
            code,
            marketPrice: null,
            costBasis: "",
            volume: "",
            targetPrice: "",
            targetPriceMode: "value",
            isValid: false,
            error: "Failed to validate stock",
          });
        }
      }

      const validStocks = validated.filter(s => s.isValid);
      if (validStocks.length === 0) {
        toast.error("No valid stocks found. Please check the stock codes.");
        setValidatingStocks(false);
        return;
      }

      setValidatedStocks(validated);
      setShowStockInputs(true);
      toast.success(`Validated ${validStocks.length} stock(s). Please enter details.`);
    } catch (error) {
      toast.error("Failed to validate stocks");
    } finally {
      setValidatingStocks(false);
    }
  };

  const handleSaveCodes = async () => {
    const validStocks = validatedStocks.filter(s => s.isValid);
    if (validStocks.length === 0) {
      toast.error("No valid stocks to save");
      return;
    }

    const endpoint = portfolioType === "tracked-stocks" 
      ? "/api/tracked-stocks" 
      : "/api/short-term-tracked-stocks";

    let successCount = 0;
    
    try {
      // Add stocks one by one with their details
      for (const stock of validStocks) {
        const costBasis = stock.costBasis ? parseFloat(stock.costBasis) : null;
        const volume = stock.volume ? parseInt(stock.volume, 10) : null;
        
        let targetPrice: number | null = null;
        if (stock.targetPrice.trim() !== "") {
          const inputValue = parseFloat(stock.targetPrice);
          if (!isNaN(inputValue) && inputValue >= 0) {
            if (stock.targetPriceMode === "percent") {
              if (costBasis && costBasis > 0) {
                targetPrice = costBasis * (1 + inputValue / 100);
              }
            } else {
              targetPrice = inputValue;
            }
          }
        }

        const response = await api.post(endpoint, {
          code: stock.code,
          costBasis: costBasis,
          volume: volume,
          targetPrice: targetPrice,
        });
        
        if (response.ok) {
          successCount++;
        }
      }
      
      // Reset state
      setStockInput("");
      setValidatedStocks([]);
      setShowStockInputs(false);
      setPortfolioType("tracked-stocks");
      toast.success(`Added ${successCount} stock code(s) to ${portfolioType === "tracked-stocks" ? "Tracked Stocks" : "Short-Term Portfolio"}`);
      setCustomCodesModalOpen(false);
      
      // Refresh the appropriate list
      if (portfolioType === "tracked-stocks") {
        await loadTrackedStocks();
      } else {
        await loadShortTermTrackedStocks();
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
      const requestBody: { code?: string; active?: boolean; costBasis?: number | null; volume?: number | null } = {};
      if (editCode !== editingStock.code) {
        requestBody.code = editCode.toUpperCase();
      }
      requestBody.active = editActive;
      // Always send costBasis - null to clear, number to set value
      requestBody.costBasis = costBasisValue.trim() !== "" && costBasis !== undefined ? costBasis : null;
      // Always send volume to preserve it when updating costBasis
      requestBody.volume = editingStock.volume || null;

      const response = await api.put(`/api/tracked-stocks/${editingStock.id}`, requestBody);
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
      const response = await api.delete(`/api/tracked-stocks/${id}`);
      if (!response.ok) throw new Error("Failed");
      
      toast.success(`Deleted ${code} from tracked stocks`);
      // Remove from local state
      setTrackedStocks(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      toast.error(`Failed to delete ${code}`);
    }
  };

  // Short-term portfolio functions
  const saveShortTermTargetPrice = async (stockId: number, code: string, targetPriceInput: string, mode: "value" | "percent") => {
    const stock = shortTermStocks.find(s => s.id === stockId);
    if (!stock) {
      toast.error(`Stock not found for ${code}`);
      return;
    }

    let targetPrice: number | null = null;
    
    if (targetPriceInput.trim() !== "") {
      const inputValue = parseFloat(targetPriceInput);
      if (isNaN(inputValue) || inputValue < 0) {
        toast.error(`Invalid target price for ${code}`);
        return;
      }
      
      if (mode === "percent") {
        // Calculate target price from percentage: costBasis * (1 + percent/100)
        if (stock.costBasis && stock.costBasis > 0) {
          targetPrice = stock.costBasis * (1 + inputValue / 100);
        } else {
          toast.error(`Cannot calculate target price from percentage: cost basis is required for ${code}`);
          return;
        }
      } else {
        targetPrice = inputValue;
      }
    }

    setSavingShortTermTargetPrice(prev => ({ ...prev, [code]: true }));
    
    try {
      // Use volume from state if available, otherwise from stock object
      const currentVolume = shortTermVolumeValues[code] ? parseInt(shortTermVolumeValues[code], 10) : (stock.volume || null);
      
      const response = await api.put(`/api/short-term-tracked-stocks/${stockId}`, {
        targetPrice: targetPrice,
        costBasis: stock.costBasis || null,
        volume: currentVolume,
      });
      
      if (!response.ok) {
        throw new Error("Failed to save target price");
      }
      
      // Reload short-term stocks to get updated target profit calculation from backend
      await loadShortTermTrackedStocks();
      
      // Update the input value to show the calculated price if percentage mode
      if (mode === "percent" && targetPrice !== null) {
        setShortTermTargetPriceValues(prev => ({
          ...prev,
          [code]: targetPrice!.toString()
        }));
        setShortTermTargetPriceMode(prev => ({
          ...prev,
          [code]: "value"
        }));
      }
    } catch (error) {
      console.error("Error saving target price:", error);
      toast.error(`Failed to save target price for ${code}`);
      // Revert target price value on error
      if (stock && stock.targetPrice !== undefined) {
        setShortTermTargetPriceValues(prev => ({
          ...prev,
          [code]: stock.targetPrice!.toString()
        }));
      } else {
        setShortTermTargetPriceValues(prev => {
          const newValues = { ...prev };
          delete newValues[code];
          return newValues;
        });
      }
    } finally {
      setSavingShortTermTargetPrice(prev => ({ ...prev, [code]: false }));
    }
  };

  // Get current cost basis for short-term (recalculated if volume changed)
  const getShortTermCurrentCostBasis = (stock: TrackedStock): number | null => {
    const volumeStr = shortTermVolumeValues[stock.code];
    const oldVolume = stock.volume || 0;
    const newVolume = volumeStr ? parseInt(volumeStr, 10) : oldVolume;
    
    if (!stock.costBasis || oldVolume === 0) {
      return stock.costBasis || null;
    }
    
    // If volume hasn't changed, return original cost basis
    if (newVolume === oldVolume || !volumeStr) {
      return stock.costBasis;
    }
    
    // Calculate new cost basis
    const newCostBasis = calculateNewCostBasis(
      oldVolume,
      stock.costBasis,
      newVolume,
      stock.marketPrice
    );
    
    return newCostBasis;
  };

  // Calculate current profit for short-term (recalculated if volume or cost basis changed)
  const calculateShortTermCurrentProfit = (stock: TrackedStock): number | null => {
    const volumeStr = shortTermVolumeValues[stock.code];
    const volume = volumeStr ? parseFloat(volumeStr) : (stock.volume || 0);
    
    if (volume <= 0 || !stock.marketPrice) {
      return null;
    }
    
    const currentCostBasis = getShortTermCurrentCostBasis(stock);
    if (!currentCostBasis) {
      return null;
    }
    
    // Profit = (marketPrice - costBasis) * volume
    const profit = (stock.marketPrice - currentCostBasis) * volume;
    
    return profit;
  };

  // Calculate target profit locally for short-term: (targetPrice - costBasis) * volume
  const calculateShortTermTargetProfit = (stock: TrackedStock): number | null => {
    const volumeStr = shortTermVolumeValues[stock.code] || stock.volume?.toString() || "0";
    const volume = parseFloat(volumeStr);
    
    // Use recalculated cost basis if volume changed, otherwise use stock.costBasis
    const currentCostBasis = getShortTermCurrentCostBasis(stock);
    
    if (!currentCostBasis || volume <= 0) return null;
    
    // Get target price from input or saved value
    let targetPrice: number | null = null;
    const targetPriceInput = shortTermTargetPriceValues[stock.code];
    const mode = shortTermTargetPriceMode[stock.code] || "value";
    
    if (targetPriceInput && targetPriceInput.trim() !== "") {
      const inputValue = parseFloat(targetPriceInput);
      if (!isNaN(inputValue) && inputValue >= 0) {
        if (mode === "percent") {
          if (currentCostBasis && currentCostBasis > 0) {
            targetPrice = currentCostBasis * (1 + inputValue / 100);
          }
        } else {
          targetPrice = inputValue;
        }
      }
    } else if (stock.targetPrice) {
      targetPrice = stock.targetPrice;
    }
    
    if (!targetPrice) return null;
    
    return (targetPrice - currentCostBasis) * volume;
  };

  // Save all pending changes for short-term portfolio
  const saveShortTermAllChanges = async () => {
    if (shortTermUnsavedChanges.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setSavingShortTermAll(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const code of Array.from(shortTermUnsavedChanges)) {
        const stock = shortTermStocks.find(s => s.code === code);
        if (!stock) continue;

        try {
          // Get current values from state
          const volumeStr = shortTermVolumeValues[code] || "";
          const volumeNum = volumeStr.trim() === "" ? null : parseInt(volumeStr, 10);
          
          let targetPrice: number | null = null;
          const targetPriceInput = shortTermTargetPriceValues[code];
          const mode = shortTermTargetPriceMode[code] || "value";
          
          if (targetPriceInput && targetPriceInput.trim() !== "") {
            const inputValue = parseFloat(targetPriceInput);
            if (!isNaN(inputValue) && inputValue >= 0) {
              if (mode === "percent") {
                const currentCostBasis = getShortTermCurrentCostBasis(stock);
                if (currentCostBasis && currentCostBasis > 0) {
                  targetPrice = currentCostBasis * (1 + inputValue / 100);
                }
              } else {
                targetPrice = inputValue;
              }
            }
          }

          // Calculate new cost basis if volume changed
          let newCostBasis = stock.costBasis || null;
          const oldVolume = stock.volume || 0;
          if (volumeNum !== null && oldVolume > 0 && volumeNum !== oldVolume && stock.marketPrice) {
            const calculatedCostBasis = calculateNewCostBasis(
              oldVolume,
              stock.costBasis!,
              volumeNum,
              stock.marketPrice
            );
            if (calculatedCostBasis !== null) {
              newCostBasis = calculatedCostBasis;
            }
          }

          const response = await api.put(`/api/short-term-tracked-stocks/${stock.id}`, {
            volume: volumeNum,
            costBasis: newCostBasis,
            targetPrice: targetPrice,
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error saving ${code}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        await loadShortTermTrackedStocks();
        setShortTermUnsavedChanges(new Set());
        toast.success(`Saved ${successCount} stock(s)${failCount > 0 ? `, ${failCount} failed` : ""}`);
      } else {
        toast.error("Failed to save changes");
      }
    } catch (error) {
      console.error("Error saving all changes:", error);
      toast.error("Failed to save changes");
    } finally {
      setSavingShortTermAll(false);
    }
  };

  // Function to mark short-term changes as unsaved
  const markShortTermAsUnsaved = (code: string) => {
    setShortTermUnsavedChanges(prev => new Set(prev).add(code));
  };

  // Discard all pending changes for short-term tracked stocks
  const discardShortTermAllChanges = () => {
    if (shortTermUnsavedChanges.size === 0) {
      toast.info("No changes to discard");
      return;
    }

    const changeCount = shortTermUnsavedChanges.size;

    // Revert volume values back to original values from shortTermStocks
    const volumeMap: Record<string, string> = {};
    const targetPriceMap: Record<string, string> = {};
    const targetPriceModeMap: Record<string, "value" | "percent"> = {};
    
    shortTermStocks.forEach(stock => {
      if (stock.volume !== undefined && stock.volume !== null) {
        volumeMap[stock.code] = stock.volume.toString();
      }
      if (stock.targetPrice !== undefined && stock.targetPrice !== null) {
        targetPriceMap[stock.code] = stock.targetPrice.toString();
        targetPriceModeMap[stock.code] = "value";
      }
    });

    // Only revert values for stocks with unsaved changes
    const revertedVolumeMap: Record<string, string> = { ...shortTermVolumeValues };
    const revertedTargetPriceMap: Record<string, string> = { ...shortTermTargetPriceValues };
    const revertedTargetPriceModeMap: Record<string, "value" | "percent"> = { ...shortTermTargetPriceMode };

    shortTermUnsavedChanges.forEach(code => {
      if (volumeMap[code] !== undefined) {
        revertedVolumeMap[code] = volumeMap[code];
      } else {
        delete revertedVolumeMap[code];
      }
      
      if (targetPriceMap[code] !== undefined) {
        revertedTargetPriceMap[code] = targetPriceMap[code];
        revertedTargetPriceModeMap[code] = "value";
      } else {
        delete revertedTargetPriceMap[code];
        delete revertedTargetPriceModeMap[code];
      }
    });

    setShortTermVolumeValues(revertedVolumeMap);
    setShortTermTargetPriceValues(revertedTargetPriceMap);
    setShortTermTargetPriceMode(revertedTargetPriceModeMap);
    setShortTermUnsavedChanges(new Set());
    
    toast.success(`Discarded changes for ${changeCount} stock(s)`);
  };

  const handleShortTermRefreshMarketPrice = async () => {
    try {
      setRefreshingShortTermMarketPrice(true);
      
      const response = await api.post('/api/short-term-tracked-stocks/refresh-market-price');
      
      if (!response.ok) {
        throw new Error('Failed to refresh market prices');
      }
      
      const data = await response.json();
      
      // Update short-term stocks with new market prices
      if (data.stocks && Array.isArray(data.stocks)) {
        setShortTermStocks((prev) => 
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
      setRefreshingShortTermMarketPrice(false);
    }
  };

  const toggleShortTermActive = async (id: number) => {
    const current = shortTermStocks.find(s => s.id === id);
    if (!current) return;
    const nextActive = !current.active;
    
    // Optimistic update
    setShortTermStocks(prev => prev.map(s => s.id === id ? { ...s, active: nextActive } : s));
    
    try {
      const response = await api.put(`/api/short-term-tracked-stocks/${id}/toggle`);
      if (!response.ok) throw new Error("Failed");
    } catch (error) {
      // Revert on failure
      setShortTermStocks(prev => prev.map(s => s.id === id ? { ...s, active: !nextActive } : s));
      toast.error(`Failed to update ${current.code}`);
    }
  };

  const handleShortTermEdit = (stock: TrackedStock) => {
    setEditingShortTermStock(stock);
    setEditCode(stock.code);
    setEditActive(stock.active);
    setEditCostBasis(stock.costBasis?.toString() || "");
    setShortTermEditDialogOpen(true);
  };

  const handleShortTermUpdateStock = async () => {
    if (!editingShortTermStock) return;

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
      const requestBody: { code?: string; active?: boolean; costBasis?: number | null; volume?: number | null } = {};
      if (editCode !== editingShortTermStock.code) {
        requestBody.code = editCode.toUpperCase();
      }
      requestBody.active = editActive;
      // Always send costBasis - null to clear, number to set value
      requestBody.costBasis = costBasisValue.trim() !== "" && costBasis !== undefined ? costBasis : null;
      // Always send volume to preserve it when updating costBasis
      requestBody.volume = editingShortTermStock.volume || null;

      const response = await api.put(`/api/short-term-tracked-stocks/${editingShortTermStock.id}`, requestBody);
      if (!response.ok) throw new Error("Failed");

      toast.success(`Updated ${editCode}`);
      setShortTermEditDialogOpen(false);
      setEditingShortTermStock(null);
      
      // Refresh the list
      await loadShortTermTrackedStocks();
    } catch (error: any) {
      const errorMessage = error?.response?.data || error?.message || "Failed to update stock";
      toast.error(errorMessage);
    }
  };

  const handleShortTermDelete = async (id: number, code: string) => {
    try {
      const response = await api.delete(`/api/short-term-tracked-stocks/${id}`);
      if (!response.ok) throw new Error("Failed");
      
      toast.success(`Deleted ${code} from short-term portfolio`);
      // Remove from local state
      setShortTermStocks(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      toast.error(`Failed to delete ${code}`);
    }
  };

  const handleShortTermSort = (field: SortField) => {
    let newDirection: "asc" | "desc" = "asc";
    
    if (shortTermSortField === field) {
      // Toggle direction if same field
      newDirection = shortTermSortDirection === "asc" ? "desc" : "asc";
    } else {
      // New field, default to ascending
      newDirection = "asc";
    }
    
    setShortTermSortField(field);
    setShortTermSortDirection(newDirection);
    setShortTermPage(0); // Reset to first page when sorting changes
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
            aValue = a.stats?.lowestPriceBuy ?? null;
            bValue = b.stats?.lowestPriceBuy ?? null;
            break;
          case "buyHighPrice":
            aValue = a.stats?.highestPriceBuy ?? null;
            bValue = b.stats?.highestPriceBuy ?? null;
            break;
          case "buyMaxVolume":
            aValue = a.stats?.largestVolumeBuy ?? null;
            bValue = b.stats?.largestVolumeBuy ?? null;
            break;
          case "sellLowPrice":
            aValue = a.stats?.lowestPriceSell ?? null;
            bValue = b.stats?.lowestPriceSell ?? null;
            break;
          case "sellHighPrice":
            aValue = a.stats?.highestPriceSell ?? null;
            bValue = b.stats?.highestPriceSell ?? null;
            break;
          case "sellMaxVolume":
            aValue = a.stats?.largestVolumeSell ?? null;
            bValue = b.stats?.largestVolumeSell ?? null;
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

  // Sort and paginate short-term data
  const sortedAndPaginatedShortTermStocks = useMemo(() => {
    let sorted = [...shortTermStocks];

    if (shortTermSortField) {
      sorted.sort((a, b) => {
        // Handle code sorting (string comparison)
        if (shortTermSortField === "code") {
          const comparison = a.code.localeCompare(b.code);
          return shortTermSortDirection === "asc" ? comparison : -comparison;
        }

        // Handle numeric sorting for other fields
        let aValue: number | null = null;
        let bValue: number | null = null;

        switch (shortTermSortField) {
          case "buyLowPrice":
            aValue = a.stats?.lowestPriceBuy ?? null;
            bValue = b.stats?.lowestPriceBuy ?? null;
            break;
          case "buyHighPrice":
            aValue = a.stats?.highestPriceBuy ?? null;
            bValue = b.stats?.highestPriceBuy ?? null;
            break;
          case "buyMaxVolume":
            aValue = a.stats?.largestVolumeBuy ?? null;
            bValue = b.stats?.largestVolumeBuy ?? null;
            break;
          case "sellLowPrice":
            aValue = a.stats?.lowestPriceSell ?? null;
            bValue = b.stats?.lowestPriceSell ?? null;
            break;
          case "sellHighPrice":
            aValue = a.stats?.highestPriceSell ?? null;
            bValue = b.stats?.highestPriceSell ?? null;
            break;
          case "sellMaxVolume":
            aValue = a.stats?.largestVolumeSell ?? null;
            bValue = b.stats?.largestVolumeSell ?? null;
            break;
        }

        // Handle null values (put them at the end)
        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        const comparison = aValue - bValue;
        return shortTermSortDirection === "asc" ? comparison : -comparison;
      });
    }

    // Apply pagination
    const startIndex = shortTermPage * shortTermSize;
    const endIndex = startIndex + shortTermSize;
    return {
      data: sorted.slice(startIndex, endIndex),
      total: sorted.length,
      totalPages: Math.ceil(sorted.length / shortTermSize),
    };
  }, [shortTermStocks, shortTermSortField, shortTermSortDirection, shortTermPage, shortTermSize]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Tracked Stocks</h2>
            
            <div className="flex items-center gap-3">
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
              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveSelectedCodes}
                  disabled={selectedCodes.size === 0}
                >
                  Save to Tracked Stocks
                </Button>
                <Button 
                  onClick={handleSaveSelectedCodesToShortTerm}
                  disabled={selectedCodes.size === 0}
                  variant="outline"
                >
                  Save to Short-Term Portfolio
                </Button>
              </div>
              
              <Dialog open={customCodesModalOpen} onOpenChange={(open) => {
                setCustomCodesModalOpen(open);
                if (!open) {
                  // Reset state when modal closes
                  setStockInput("");
                  setValidatedStocks([]);
                  setShowStockInputs(false);
                  setPortfolioType("tracked-stocks");
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    Custom Codes
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Enter Custom Stock Codes</DialogTitle>
                    <DialogDescription>
                      {showStockInputs 
                        ? "Enter cost basis, volume, and target price for each validated stock."
                        : "Add stock codes that are not in the VN30 list. Enter codes separated by comma, space, or newline."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {!showStockInputs ? (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Save to Portfolio</label>
                          <Select
                            value={portfolioType}
                            onValueChange={(value: "tracked-stocks" | "short-term-tracked-stocks") => {
                              setPortfolioType(value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tracked-stocks">Tracked Stocks</SelectItem>
                              <SelectItem value="short-term-tracked-stocks">Short-Term Tracked Stocks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Textarea
                          placeholder="Example: FPT, VCB, HPG"
                          value={stockInput}
                          onChange={(e) => setStockInput(e.target.value)}
                          className="min-h-32"
                          disabled={validatingStocks}
                        />
                        <Button 
                          onClick={handleValidateAndPrepareStocks} 
                          className="w-full"
                          disabled={validatingStocks}
                        >
                          {validatingStocks ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            "Validate & Continue"
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                          {validatedStocks.map((stock, index) => (
                            <div key={stock.code} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{stock.code}</span>
                                  {stock.isValid ? (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      Valid
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-red-600 border-red-600">
                                      Invalid
                                    </Badge>
                                  )}
                                </div>
                                {stock.marketPrice && (
                                  <span className="text-sm text-muted-foreground">
                                    Market: {stock.marketPrice.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              
                              {stock.error && (
                                <p className="text-sm text-red-600">{stock.error}</p>
                              )}

                              {stock.isValid && (
                                <>
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Cost Basis (VND)</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="Purchase price"
                                      value={stock.costBasis}
                                      onChange={(e) => {
                                        const updated = [...validatedStocks];
                                        updated[index].costBasis = e.target.value;
                                        setValidatedStocks(updated);
                                      }}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Volume (shares)</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="100"
                                      placeholder="Number of shares"
                                      value={stock.volume}
                                      onChange={(e) => {
                                        const updated = [...validatedStocks];
                                        updated[index].volume = e.target.value;
                                        setValidatedStocks(updated);
                                      }}
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">Target Price</label>
                                    <div className="flex gap-2">
                                      <Select
                                        value={stock.targetPriceMode}
                                        onValueChange={(value: "value" | "percent") => {
                                          const updated = [...validatedStocks];
                                          updated[index].targetPriceMode = value;
                                          setValidatedStocks(updated);
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
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder={stock.targetPriceMode === "percent" ? "Profit %" : "Target price"}
                                        value={stock.targetPrice}
                                        onChange={(e) => {
                                          const updated = [...validatedStocks];
                                          updated[index].targetPrice = e.target.value;
                                          setValidatedStocks(updated);
                                        }}
                                        className="flex-1"
                                      />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Save to Portfolio</label>
                            <Select
                              value={portfolioType}
                              onValueChange={(value: "tracked-stocks" | "short-term-tracked-stocks") => {
                                setPortfolioType(value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tracked-stocks">Tracked Stocks</SelectItem>
                                <SelectItem value="short-term-tracked-stocks">Short-Term Tracked Stocks</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowStockInputs(false);
                                setValidatedStocks([]);
                              }}
                              className="flex-1"
                            >
                              Back
                            </Button>
                            <Button 
                              onClick={handleSaveCodes} 
                              className="flex-1"
                              disabled={validatedStocks.filter(s => s.isValid).length === 0}
                            >
                              Save Custom Codes
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Cost Basis Input Dialog */}
        <Dialog open={costBasisDialogOpen} onOpenChange={setCostBasisDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Enter Cost Basis for Selected Stocks</DialogTitle>
              <DialogDescription>
                Enter the cost basis (purchase price) for each stock. Leave empty if not applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {Array.from(selectedCodes).map((code) => (
                <div key={code} className="flex items-center gap-4">
                  <label className="text-sm font-medium w-20">{code}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Cost basis (optional)"
                    value={costBasisValues[code] || ""}
                    onChange={(e) => {
                      setCostBasisValues(prev => ({
                        ...prev,
                        [code]: e.target.value
                      }));
                    }}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setCostBasisDialogOpen(false);
                setCostBasisValues({});
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveWithCostBasis}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Short-Term Cost Basis Input Dialog */}
        <Dialog open={shortTermCostBasisDialogOpen} onOpenChange={setShortTermCostBasisDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Enter Cost Basis for Short-Term Portfolio</DialogTitle>
              <DialogDescription>
                Enter the cost basis (purchase price) for each stock. Leave empty if not applicable.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {Array.from(selectedCodes).map((code) => (
                <div key={code} className="flex items-center gap-4">
                  <label className="text-sm font-medium w-20">{code}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Cost basis (optional)"
                    value={shortTermCostBasisValues[code] || ""}
                    onChange={(e) => {
                      setShortTermCostBasisValues(prev => ({
                        ...prev,
                        [code]: e.target.value
                      }));
                    }}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShortTermCostBasisDialogOpen(false);
                setShortTermCostBasisValues({});
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveShortTermWithCostBasis}>
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

        {/* Edit Short-Term Stock Dialog */}
        <Dialog open={shortTermEditDialogOpen} onOpenChange={setShortTermEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Short-Term Stock</DialogTitle>
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
                  id="edit-short-term-active"
                />
                <label htmlFor="edit-short-term-active" className="text-sm font-medium cursor-pointer">
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShortTermEditDialogOpen(false);
                setEditingShortTermStock(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleShortTermUpdateStock}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Refresh Market Price Button */}
        <div className="mb-4 flex justify-end gap-3">
          {unsavedChanges.size > 0 && (
            <>
              <Button
                onClick={discardAllChanges}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard Changes
              </Button>
              <Button
                onClick={saveAllChanges}
                disabled={savingAll}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {savingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes ({unsavedChanges.size})
                  </>
                )}
              </Button>
            </>
          )}
          <Button
            onClick={() => setPortfolioSimulationOpen(true)}
            variant="outline"
          >
            Portfolio Simulation
          </Button>
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
                <TableHead className="text-center w-32">Volume</TableHead>
                <TableHead className="text-center">Target Price</TableHead>
                <TableHead className="text-center">Target Profit</TableHead>
                <TableHead className="text-center">Total Net Value</TableHead>
                <TableHead className="text-center">Total Market Value</TableHead>
                <TableHead className="text-center">Profit</TableHead>
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
                      <Skeleton className="h-8 w-24 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-8 w-24 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="h-4 w-20 mx-auto" />
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
                  <TableRow key={stock.code} className={!stock.active ? "opacity-50" : ""}>
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
                      {(() => {
                        const currentCostBasis = getCurrentCostBasis(stock);
                        if (currentCostBasis) {
                          const isRecalculated = volumeValues[stock.code] && 
                            stock.volume && 
                            parseInt(volumeValues[stock.code] || "0", 10) !== stock.volume;
                          return (
                            <span className={`text-sm font-medium ${isRecalculated ? 'text-orange-600' : ''}`}>
                              {formatPrice(currentCostBasis)}
                              {isRecalculated && (
                                <span className="ml-1 text-xs text-muted-foreground" title="Recalculated based on volume change">
                                  *
                                </span>
                              )}
                            </span>
                          );
                        }
                        return <span className="text-sm text-muted-foreground">N/A</span>;
                      })()}
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
                    <TableCell className="text-center">
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
                            markAsUnsaved(stock.code);
                          }}
                          disabled={!stock.active}
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
                              markAsUnsaved(stock.code);
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
                                markAsUnsaved(stock.code);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                const currentValue = volumeValues[stock.code] || "0";
                                const numValue = parseInt(currentValue) || 0;
                                const newValue = Math.max(0, numValue - 100);
                                setVolumeValues(prev => ({
                                  ...prev,
                                  [stock.code]: newValue.toString()
                                }));
                                markAsUnsaved(stock.code);
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
                              markAsUnsaved(stock.code);
                            }}
                            className="w-24 h-8 text-sm text-center"
                            min="0"
                            step="100"
                            disabled={!stock.active}
                          />
                          {unsavedChanges.has(stock.code) && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" title="Unsaved changes" />
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
                            markAsUnsaved(stock.code);
                          }}
                          disabled={!stock.active}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <Select
                            value={targetPriceMode[stock.code] || "value"}
                            onValueChange={(value: "value" | "percent") => {
                              setTargetPriceMode(prev => ({
                                ...prev,
                                [stock.code]: value
                              }));
                              markAsUnsaved(stock.code);
                            }}
                          >
                            <SelectTrigger className="h-6 w-12 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="value">VND</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={targetPriceMode[stock.code] === "percent" ? "%" : "Price"}
                              value={targetPriceValues[stock.code] || ""}
                              onChange={(e) => {
                                setTargetPriceValues(prev => ({
                                  ...prev,
                                  [stock.code]: e.target.value
                                }));
                                markAsUnsaved(stock.code);
                              }}
                              className="w-20 h-8 text-sm text-center"
                              disabled={!stock.active}
                            />
                          </div>
                        </div>
                        {(() => {
                          // Show calculated target price if in percentage mode, otherwise show saved or input value
                          const targetPriceInput = targetPriceValues[stock.code];
                          const mode = targetPriceMode[stock.code] || "value";
                          let displayPrice: number | null = null;
                          
                          if (targetPriceInput && targetPriceInput.trim() !== "") {
                            const inputValue = parseFloat(targetPriceInput);
                            if (!isNaN(inputValue) && inputValue >= 0) {
                              if (mode === "percent" && stock.costBasis && stock.costBasis > 0) {
                                displayPrice = stock.costBasis * (1 + inputValue / 100);
                              } else if (mode === "value") {
                                displayPrice = inputValue;
                              }
                            }
                          } else if (stock.targetPrice) {
                            displayPrice = stock.targetPrice;
                          }
                          
                          return displayPrice ? (
                            <span className="text-xs text-muted-foreground">
                              {formatPrice(displayPrice)}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const calculatedProfit = calculateTargetProfit(stock);
                        if (calculatedProfit !== null) {
                          return (
                            <span className={`text-sm font-semibold ${
                              calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPrice(calculatedProfit)}
                            </span>
                          );
                        }
                        return <span className="text-sm text-muted-foreground">N/A</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const currentCostBasis = getCurrentCostBasis(stock);
                        const volume = volumeValues[stock.code] ? parseFloat(volumeValues[stock.code]) : (stock.volume || 0);
                        if (currentCostBasis && volume > 0) {
                          return <span className="text-sm font-medium">{formatPrice(currentCostBasis * volume)}</span>;
                        }
                        return <span className="text-sm text-muted-foreground">N/A</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const volume = volumeValues[stock.code] ? parseFloat(volumeValues[stock.code]) : (stock.volume || 0);
                        if (stock.marketPrice && volume > 0) {
                          return <span className="text-sm font-medium">{formatPrice(stock.marketPrice * volume)}</span>;
                        }
                        return <span className="text-sm text-muted-foreground">N/A</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const profit = calculateCurrentProfit(stock);
                        if (profit !== null) {
                          return (
                            <span className={`text-sm font-semibold ${
                              profit >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPrice(profit)}
                            </span>
                          );
                        }
                        return <span className="text-sm text-muted-foreground">N/A</span>;
                      })()}
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
              )}
              {!loadingStocks && sortedAndPaginatedStocks.data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    {trackedStocks.length === 0 
                      ? "No tracked stocks yet. Add some codes above to get started."
                      : "No results on this page."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {/* Total Profit Row */}
            {!loadingStocks && trackedStocks.length > 0 && (() => {
              const totalProfit = trackedStocks.reduce((sum, stock) => {
                // Only count active stocks
                if (!stock.active) return sum;
                const profit = calculateCurrentProfit(stock);
                if (profit !== null) {
                  return sum + profit;
                }
                return sum;
              }, 0);
              
              const totalNetValue = trackedStocks.reduce((sum, stock) => {
                // Only count active stocks
                if (!stock.active) return sum;
                const volume = volumeValues[stock.code];
                const volumeNum = volume ? parseFloat(volume) : (stock.volume || 0);
                if (volumeNum > 0) {
                  const currentCostBasis = getCurrentCostBasis(stock);
                  if (currentCostBasis) {
                    return sum + currentCostBasis * volumeNum;
                  }
                }
                return sum;
              }, 0);
              
              const totalMarketValue = trackedStocks.reduce((sum, stock) => {
                // Only count active stocks
                if (!stock.active) return sum;
                const volume = volumeValues[stock.code];
                if (volume && stock.marketPrice && !isNaN(parseFloat(volume)) && parseFloat(volume) > 0) {
                  return sum + stock.marketPrice * parseFloat(volume);
                }
                return sum;
              }, 0);
              
              // Calculate total target value: sum of (targetPrice * volume) for stocks with target price
              const totalTargetValue = trackedStocks.reduce((sum, stock) => {
                // Only count active stocks
                if (!stock.active) return sum;
                const volumeStr = volumeValues[stock.code] || stock.volume?.toString() || "0";
                const volume = parseFloat(volumeStr);
                
                // Get target price from input or saved value
                let targetPrice: number | null = null;
                const targetPriceInput = targetPriceValues[stock.code];
                const mode = targetPriceMode[stock.code] || "value";
                
                if (targetPriceInput && targetPriceInput.trim() !== "") {
                  const inputValue = parseFloat(targetPriceInput);
                  if (!isNaN(inputValue) && inputValue >= 0) {
                    if (mode === "percent") {
                      if (stock.costBasis && stock.costBasis > 0) {
                        targetPrice = stock.costBasis * (1 + inputValue / 100);
                      }
                    } else {
                      targetPrice = inputValue;
                    }
                  }
                } else if (stock.targetPrice) {
                  targetPrice = stock.targetPrice;
                }
                
                if (targetPrice && volume > 0) {
                  return sum + targetPrice * volume;
                }
                return sum;
              }, 0);
              
              // Calculate total target profit: sum of locally calculated target profits
              const totalTargetProfit = trackedStocks.reduce((sum, stock) => {
                // Only count active stocks
                if (!stock.active) return sum;
                const calculatedProfit = calculateTargetProfit(stock);
                if (calculatedProfit !== null) {
                  return sum + calculatedProfit;
                }
                return sum;
              }, 0);
              
              return (
                <tfoot>
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell colSpan={4} className="text-left">
                      Total:
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">
                        {totalTargetValue > 0 ? formatPrice(totalTargetValue) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-semibold ${
                        totalTargetProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {totalTargetProfit !== 0 ? formatPrice(totalTargetProfit) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">{formatPrice(totalNetValue)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-medium">
                        {formatPrice(totalMarketValue)}
                        {totalNetValue > 0 && (
                          <span className={`ml-2 text-xs font-medium ${
                            totalMarketValue >= totalNetValue ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ({totalMarketValue >= totalNetValue ? '+' : ''}
                            {((totalMarketValue - totalNetValue) / totalNetValue * 100).toFixed(2)}%)
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-lg font-bold ${
                        totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPrice(totalProfit)}
                      </span>
                    </TableCell>
                    <TableCell></TableCell>
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

        {/* Short-Term Portfolio Section */}
        <div className="mt-12 pt-8 border-t">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Short-Term Portfolio</h2>
            
            <div className="flex items-center gap-3">
              {shortTermUnsavedChanges.size > 0 && (
                <>
                  <Button
                    onClick={discardShortTermAllChanges}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Discard Changes
                  </Button>
                  <Button
                    onClick={saveShortTermAllChanges}
                    disabled={savingShortTermAll}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {savingShortTermAll ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Save Changes ({shortTermUnsavedChanges.size})
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button
                onClick={() => setShortTermPortfolioSimulationOpen(true)}
                variant="outline"
              >
                Portfolio Simulation
              </Button>
              <Button
                variant="outline"
                onClick={handleShortTermRefreshMarketPrice}
                disabled={refreshingShortTermMarketPrice || loadingShortTermStocks}
                className="border-2"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshingShortTermMarketPrice ? 'animate-spin' : ''}`} />
                Refresh Market Price
              </Button>
            </div>
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
                      onClick={() => handleShortTermSort("code")}
                    >
                      Stock
                      {shortTermSortField === "code" ? (
                        shortTermSortDirection === "asc" ? (
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
                  <TableHead className="text-center w-32">Volume</TableHead>
                  <TableHead className="text-center">Target Price</TableHead>
                  <TableHead className="text-center">Target Profit</TableHead>
                  <TableHead className="text-center">Total Net Value</TableHead>
                  <TableHead className="text-center">Total Market Value</TableHead>
                  <TableHead className="text-center">Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingShortTermStocks ? (
                  // Loading skeleton rows
                  Array.from({ length: shortTermSize }).map((_, index) => (
                    <TableRow key={`skeleton-short-${index}`}>
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
                        <Skeleton className="h-8 w-24 mx-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-8 w-24 mx-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  sortedAndPaginatedShortTermStocks.data.map((stock) => {
                    return (
                      <TableRow key={stock.code} className={!stock.active ? "opacity-50" : ""}>
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
                          {(() => {
                            const currentCostBasis = getShortTermCurrentCostBasis(stock);
                            if (currentCostBasis) {
                              const isRecalculated = shortTermVolumeValues[stock.code] && 
                                stock.volume && 
                                parseInt(shortTermVolumeValues[stock.code] || "0", 10) !== stock.volume;
                              return (
                                <span className={`text-sm font-medium ${isRecalculated ? 'text-orange-600' : ''}`}>
                                  {formatPrice(currentCostBasis)}
                                  {isRecalculated && (
                                    <span className="ml-1 text-xs text-muted-foreground" title="Recalculated based on volume change">
                                      *
                                    </span>
                                  )}
                                </span>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">N/A</span>;
                          })()}
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
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const currentValue = shortTermVolumeValues[stock.code] || "0";
                                const numValue = parseInt(currentValue) || 0;
                                const newValue = Math.max(0, numValue + 100);
                                setShortTermVolumeValues(prev => ({
                                  ...prev,
                                  [stock.code]: newValue.toString()
                                }));
                                markShortTermAsUnsaved(stock.code);
                              }}
                              disabled={!stock.active}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="Volume"
                                value={shortTermVolumeValues[stock.code] || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setShortTermVolumeValues(prev => ({
                                    ...prev,
                                    [stock.code]: value
                                  }));
                                  markShortTermAsUnsaved(stock.code);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    const currentValue = shortTermVolumeValues[stock.code] || "0";
                                    const numValue = parseInt(currentValue) || 0;
                                    const newValue = Math.max(0, numValue + 100);
                                    setShortTermVolumeValues(prev => ({
                                      ...prev,
                                      [stock.code]: newValue.toString()
                                    }));
                                    markShortTermAsUnsaved(stock.code);
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    const currentValue = shortTermVolumeValues[stock.code] || "0";
                                    const numValue = parseInt(currentValue) || 0;
                                    const newValue = Math.max(0, numValue - 100);
                                    setShortTermVolumeValues(prev => ({
                                      ...prev,
                                      [stock.code]: newValue.toString()
                                    }));
                                    markShortTermAsUnsaved(stock.code);
                                  }
                                }}
                                onWheel={(e) => {
                                  e.preventDefault();
                                  const currentValue = shortTermVolumeValues[stock.code] || "0";
                                  const numValue = parseInt(currentValue) || 0;
                                  const newValue = e.deltaY < 0 
                                    ? Math.max(0, numValue + 100)
                                    : Math.max(0, numValue - 100);
                                  setShortTermVolumeValues(prev => ({
                                    ...prev,
                                    [stock.code]: newValue.toString()
                                  }));
                                  markShortTermAsUnsaved(stock.code);
                                }}
                                className="w-24 h-8 text-sm text-center"
                                min="0"
                                step="100"
                                disabled={!stock.active}
                              />
                              {shortTermUnsavedChanges.has(stock.code) && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" title="Unsaved changes" />
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const currentValue = shortTermVolumeValues[stock.code] || "0";
                                const numValue = parseInt(currentValue) || 0;
                                const newValue = Math.max(0, numValue - 100);
                                setShortTermVolumeValues(prev => ({
                                  ...prev,
                                  [stock.code]: newValue.toString()
                                }));
                                markShortTermAsUnsaved(stock.code);
                              }}
                              disabled={!stock.active}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <Select
                                value={shortTermTargetPriceMode[stock.code] || "value"}
                                onValueChange={(value: "value" | "percent") => {
                                  setShortTermTargetPriceMode(prev => ({
                                    ...prev,
                                    [stock.code]: value
                                  }));
                                  markShortTermAsUnsaved(stock.code);
                                }}
                              >
                                <SelectTrigger className="h-6 w-12 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="value">VND</SelectItem>
                                  <SelectItem value="percent">%</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder={shortTermTargetPriceMode[stock.code] === "percent" ? "%" : "Price"}
                                  value={shortTermTargetPriceValues[stock.code] || ""}
                                  onChange={(e) => {
                                    setShortTermTargetPriceValues(prev => ({
                                      ...prev,
                                      [stock.code]: e.target.value
                                    }));
                                    markShortTermAsUnsaved(stock.code);
                                  }}
                                  className="w-20 h-8 text-sm text-center"
                                  disabled={!stock.active}
                                />
                              </div>
                            </div>
                            {(() => {
                              // Show calculated target price if in percentage mode, otherwise show saved or input value
                              const targetPriceInput = shortTermTargetPriceValues[stock.code];
                              const mode = shortTermTargetPriceMode[stock.code] || "value";
                              let displayPrice: number | null = null;
                              
                              if (targetPriceInput && targetPriceInput.trim() !== "") {
                                const inputValue = parseFloat(targetPriceInput);
                                if (!isNaN(inputValue) && inputValue >= 0) {
                                  if (mode === "percent") {
                                    const currentCostBasis = getShortTermCurrentCostBasis(stock);
                                    if (currentCostBasis && currentCostBasis > 0) {
                                      displayPrice = currentCostBasis * (1 + inputValue / 100);
                                    }
                                  } else if (mode === "value") {
                                    displayPrice = inputValue;
                                  }
                                }
                              } else if (stock.targetPrice) {
                                displayPrice = stock.targetPrice;
                              }
                              
                              return displayPrice ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatPrice(displayPrice)}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const calculatedProfit = calculateShortTermTargetProfit(stock);
                            if (calculatedProfit !== null) {
                              return (
                                <span className={`text-sm font-semibold ${
                                  calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatPrice(calculatedProfit)}
                                </span>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">N/A</span>;
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const currentCostBasis = getShortTermCurrentCostBasis(stock);
                            const volume = shortTermVolumeValues[stock.code] ? parseFloat(shortTermVolumeValues[stock.code]) : (stock.volume || 0);
                            if (currentCostBasis && volume > 0) {
                              return <span className="text-sm font-medium">{formatPrice(currentCostBasis * volume)}</span>;
                            }
                            return <span className="text-sm text-muted-foreground">N/A</span>;
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const volume = shortTermVolumeValues[stock.code] ? parseFloat(shortTermVolumeValues[stock.code]) : (stock.volume || 0);
                            if (stock.marketPrice && volume > 0) {
                              return <span className="text-sm font-medium">{formatPrice(stock.marketPrice * volume)}</span>;
                            }
                            return <span className="text-sm text-muted-foreground">N/A</span>;
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const profit = calculateShortTermCurrentProfit(stock);
                            if (profit !== null) {
                              return (
                                <span className={`text-sm font-semibold ${
                                  profit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatPrice(profit)}
                                </span>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">N/A</span>;
                          })()}
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
                              <DropdownMenuItem onClick={() => toggleShortTermActive(stock.id)}>
                                <Check className={`mr-2 h-4 w-4 ${stock.active ? 'opacity-100' : 'opacity-0'}`} />
                                {stock.active ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleShortTermEdit(stock)}>
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
                                      Are you sure you want to remove <strong>{stock.code}</strong> from short-term portfolio?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleShortTermDelete(stock.id, stock.code)}>
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
                {!loadingShortTermStocks && sortedAndPaginatedShortTermStocks.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {shortTermStocks.length === 0 
                        ? "No Short-Term Portfolio yet. Add some codes above to get started."
                        : "No results on this page."
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {/* Total Profit Row */}
              {!loadingShortTermStocks && shortTermStocks.length > 0 && (() => {
                const totalProfit = shortTermStocks.reduce((sum, stock) => {
                  // Only count active stocks
                  if (!stock.active) return sum;
                  const profit = calculateShortTermCurrentProfit(stock);
                  if (profit !== null) {
                    return sum + profit;
                  }
                  return sum;
                }, 0);
                
                const totalNetValue = shortTermStocks.reduce((sum, stock) => {
                  // Only count active stocks
                  if (!stock.active) return sum;
                  const volume = shortTermVolumeValues[stock.code];
                  const volumeNum = volume ? parseFloat(volume) : (stock.volume || 0);
                  if (volumeNum > 0) {
                    const currentCostBasis = getShortTermCurrentCostBasis(stock);
                    if (currentCostBasis) {
                      return sum + currentCostBasis * volumeNum;
                    }
                  }
                  return sum;
                }, 0);
                
                const totalMarketValue = shortTermStocks.reduce((sum, stock) => {
                  // Only count active stocks
                  if (!stock.active) return sum;
                  const volume = shortTermVolumeValues[stock.code];
                  if (volume && stock.marketPrice && !isNaN(parseFloat(volume)) && parseFloat(volume) > 0) {
                    return sum + stock.marketPrice * parseFloat(volume);
                  }
                  return sum;
                }, 0);
                
                // Calculate total target value: sum of (targetPrice * volume) for stocks with target price
                const totalTargetValue = shortTermStocks.reduce((sum, stock) => {
                  // Only count active stocks
                  if (!stock.active) return sum;
                  const volumeStr = shortTermVolumeValues[stock.code] || stock.volume?.toString() || "0";
                  const volume = parseFloat(volumeStr);
                  
                  // Get target price from input or saved value
                  let targetPrice: number | null = null;
                  const targetPriceInput = shortTermTargetPriceValues[stock.code];
                  const mode = shortTermTargetPriceMode[stock.code] || "value";
                  
                  if (targetPriceInput && targetPriceInput.trim() !== "") {
                    const inputValue = parseFloat(targetPriceInput);
                    if (!isNaN(inputValue) && inputValue >= 0) {
                      if (mode === "percent") {
                        const currentCostBasis = getShortTermCurrentCostBasis(stock);
                        if (currentCostBasis && currentCostBasis > 0) {
                          targetPrice = currentCostBasis * (1 + inputValue / 100);
                        }
                      } else {
                        targetPrice = inputValue;
                      }
                    }
                  } else if (stock.targetPrice) {
                    targetPrice = stock.targetPrice;
                  }
                  
                  if (targetPrice && volume > 0) {
                    return sum + targetPrice * volume;
                  }
                  return sum;
                }, 0);
                
                // Calculate total target profit: sum of locally calculated target profits
                const totalTargetProfit = shortTermStocks.reduce((sum, stock) => {
                  // Only count active stocks
                  if (!stock.active) return sum;
                  const calculatedProfit = calculateShortTermTargetProfit(stock);
                  if (calculatedProfit !== null) {
                    return sum + calculatedProfit;
                  }
                  return sum;
                }, 0);
                
                return (
                  <tfoot>
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell colSpan={4} className="text-left">
                        Total:
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">
                          {totalTargetValue > 0 ? formatPrice(totalTargetValue) : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-semibold ${
                          totalTargetProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {totalTargetProfit !== 0 ? formatPrice(totalTargetProfit) : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">{formatPrice(totalNetValue)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-medium">
                          {formatPrice(totalMarketValue)}
                          {totalNetValue > 0 && (
                            <span className={`ml-2 text-xs font-medium ${
                              totalMarketValue >= totalNetValue ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ({totalMarketValue >= totalNetValue ? '+' : ''}
                              {((totalMarketValue - totalNetValue) / totalNetValue * 100).toFixed(2)}%)
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-lg font-bold ${
                          totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatPrice(totalProfit)}
                        </span>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </tfoot>
                );
              })()}
            </Table>
          </div>

          {/* Pagination */}
          {sortedAndPaginatedShortTermStocks.total > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Page size: <span className="font-semibold">{shortTermSize}</span></span>
                  <span>•</span>
                  <span>Current page: <span className="font-semibold">{shortTermPage + 1}</span></span>
                  <span>•</span>
                  <span>Total pages: <span className="font-semibold">{sortedAndPaginatedShortTermStocks.totalPages}</span></span>
                  <span>•</span>
                  <span>Total records: <span className="font-semibold">{sortedAndPaginatedShortTermStocks.total.toLocaleString()}</span></span>
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={String(shortTermSize)} onValueChange={(v) => { 
                  const n = Number(v); 
                  setShortTermSize(n); 
                  setShortTermPage(0); 
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
                  disabled={shortTermPage <= 0} 
                  onClick={() => setShortTermPage(shortTermPage - 1)}
                >
                  Prev
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={shortTermPage + 1 >= sortedAndPaginatedShortTermStocks.totalPages} 
                  onClick={() => setShortTermPage(shortTermPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

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

          {/* Portfolio Simulation Modal for Tracked Stocks */}
          <PortfolioSimulationModal
            open={portfolioSimulationOpen}
            onOpenChange={setPortfolioSimulationOpen}
            vn30Codes={vn30Codes}
            apiEndpoint="/api/tracked-stocks/simulate-portfolio"
            fetchStocksEndpoint="/api/tracked-stocks"
          />

          {/* Portfolio Simulation Modal for Short-Term Portfolio */}
          <PortfolioSimulationModal
            open={shortTermPortfolioSimulationOpen}
            onOpenChange={setShortTermPortfolioSimulationOpen}
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

export default TrackedStocks;
