import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
} from "@/components/ui/dialog.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
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
import { Loader2, Plus, Trash2, RefreshCw, Pencil, MoreVertical, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/lib/utils";

interface SimulatedStock {
  code: string;
  costBasis?: number;
  volume?: number;
  targetPrice?: number;
}

interface SimulatedStockResult {
  code: string;
  costBasis?: number;
  volume?: number;
  targetPrice?: number;
  marketPrice?: number;
  profit?: number;
  profitPercent?: number;
  currentValue?: number;
  targetProfit?: number;
  error?: string;
}

interface PortfolioSimulationResponse {
  stocks: SimulatedStockResult[];
  totalProfit: number;
  totalCostBasis: number;
  totalCurrentValue: number;
}

interface PortfolioSimulationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vn30Codes: string[];
  apiEndpoint: string; // "/api/tracked-stocks/simulate-portfolio" or "/api/short-term-tracked-stocks/simulate-portfolio"
  fetchStocksEndpoint: string; // "/api/tracked-stocks" or "/api/short-term-tracked-stocks" to load existing stocks
}

interface ExistingStock {
  id: number;
  code: string;
  costBasis?: number;
  volume?: number;
  targetPrice?: number;
}

export function PortfolioSimulationModal({
  open,
  onOpenChange,
  vn30Codes,
  apiEndpoint,
  fetchStocksEndpoint,
}: PortfolioSimulationModalProps) {
  const [simulatedStocks, setSimulatedStocks] = useState<SimulatedStock[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [costBasis, setCostBasis] = useState("");
  const [volume, setVolume] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [targetPriceMode, setTargetPriceMode] = useState<"value" | "percent">("value");
  const [results, setResults] = useState<PortfolioSimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editCostBasis, setEditCostBasis] = useState("");
  const [editVolume, setEditVolume] = useState("");
  const [editTargetPrice, setEditTargetPrice] = useState("");
  const [editTargetPriceMode, setEditTargetPriceMode] = useState<"value" | "percent">("value");
  const [loadingMarketPrice, setLoadingMarketPrice] = useState(false);
  const [stockCodeOpen, setStockCodeOpen] = useState(false);
  const [stockCodeInput, setStockCodeInput] = useState("");
  const [validatingStock, setValidatingStock] = useState(false);
  const [stockValidationError, setStockValidationError] = useState<string | null>(null);

  const loadExistingStocks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(fetchStocksEndpoint);
      if (!response.ok) {
        throw new Error("Failed to load existing stocks");
      }
      const existingStocks: ExistingStock[] = await response.json();
      
      // Convert existing stocks to simulated stocks format
      const simulated = existingStocks.map((stock) => ({
        code: stock.code,
        costBasis: stock.costBasis,
        volume: stock.volume,
        targetPrice: stock.targetPrice,
      }));
      
      setSimulatedStocks(simulated);
    } catch (error: any) {
      console.error("Error loading existing stocks:", error);
      toast.error(error?.message || "Failed to load existing stocks");
    } finally {
      setLoading(false);
    }
  }, [fetchStocksEndpoint]);

  // Load existing stocks when modal opens
  useEffect(() => {
    if (open) {
      loadExistingStocks();
    } else {
      // Reset form when modal closes
      setSimulatedStocks([]);
      setResults(null);
      setSelectedCode("");
      setStockCodeInput("");
      setCostBasis("");
      setVolume("");
      setTargetPrice("");
      setTargetPriceMode("value");
      setEditingStock(null);
      setEditTargetPrice("");
      setEditTargetPriceMode("value");
      setStockCodeOpen(false);
      setStockValidationError(null);
    }
  }, [open, loadExistingStocks]);

  // Validate stock code by checking if market price exists
  const validateStockCode = async (code: string): Promise<boolean> => {
    if (!code || code.trim() === "") {
      return false;
    }

    const normalizedCode = code.trim().toUpperCase();
    
    // If it's in VN30 list, it's valid
    if (vn30Codes.includes(normalizedCode)) {
      return true;
    }

    // Otherwise, validate by checking market price
    setValidatingStock(true);
    setStockValidationError(null);
    try {
      const response = await api.get(`/api/stocks/market-price/${encodeURIComponent(normalizedCode)}`);
      if (response.ok) {
        const data: { code: string; marketPrice: number | null } = await response.json();
        if (data.marketPrice !== null && data.marketPrice !== undefined) {
          setStockValidationError(null);
          return true;
        } else {
          setStockValidationError("Stock code not found or market price unavailable");
          return false;
        }
      } else {
        setStockValidationError("Failed to validate stock code");
        return false;
      }
    } catch (error) {
      console.error("Error validating stock code:", error);
      setStockValidationError("Failed to validate stock code");
      return false;
    } finally {
      setValidatingStock(false);
    }
  };

  // Fetch market price when stock code is selected
  const handleStockCodeChange = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    setSelectedCode(normalizedCode);
    setStockCodeInput(normalizedCode);
    setStockValidationError(null);
    
    if (!normalizedCode) {
      setCostBasis("");
      return;
    }

    // Validate stock code first
    const isValid = await validateStockCode(normalizedCode);
    if (!isValid && !vn30Codes.includes(normalizedCode)) {
      // Don't fetch market price if validation failed for non-VN30 stocks
      setCostBasis("");
      return;
    }

    // Fetch market price and fill cost basis
    setLoadingMarketPrice(true);
    try {
      const response = await api.get(`/api/stocks/market-price/${encodeURIComponent(normalizedCode)}`);
      if (response.ok) {
        const data: { code: string; marketPrice: number | null } = await response.json();
        if (data.marketPrice !== null && data.marketPrice !== undefined) {
          setCostBasis(data.marketPrice.toString());
        } else {
          setCostBasis("");
        }
      }
    } catch (error) {
      console.error("Error fetching market price:", error);
      // Don't show error toast, just leave cost basis empty
      setCostBasis("");
    } finally {
      setLoadingMarketPrice(false);
    }
  };

  // Handle stock code input change (for custom codes)
  const handleStockCodeInputChange = async (value: string) => {
    setStockCodeInput(value);
    setStockValidationError(null);
    
    const normalizedValue = value.trim().toUpperCase();
    
    // If empty, clear selection
    if (!normalizedValue) {
      setSelectedCode("");
      setCostBasis("");
      return;
    }

    // If it's a VN30 code, select it immediately
    if (vn30Codes.includes(normalizedValue)) {
      handleStockCodeChange(normalizedValue);
      return;
    }

    // For custom codes, validate when user stops typing (debounce)
    // We'll validate on blur or when they try to add the stock
    setSelectedCode(normalizedValue);
  };

  const handleAddStock = async () => {
    const codeToAdd = stockCodeInput.trim().toUpperCase();
    
    if (!codeToAdd) {
      toast.error("Please enter a stock code");
      return;
    }

    // Validate stock code if it's not in VN30 list
    if (!vn30Codes.includes(codeToAdd)) {
      const isValid = await validateStockCode(codeToAdd);
      if (!isValid) {
        toast.error(stockValidationError || "Invalid stock code. Please enter a valid stock code.");
        return;
      }
    }

    if (simulatedStocks.some((s) => s.code === codeToAdd)) {
      toast.error("Stock already added");
      return;
    }

    let targetPriceValue: number | undefined = undefined;
    if (targetPrice.trim()) {
      const inputValue = parseFloat(targetPrice);
      if (!isNaN(inputValue) && inputValue >= 0) {
        if (targetPriceMode === "percent") {
          // Calculate from percentage if cost basis is provided
          const costBasisValue = costBasis ? parseFloat(costBasis) : undefined;
          if (costBasisValue && costBasisValue > 0) {
            targetPriceValue = costBasisValue * (1 + inputValue / 100);
          } else {
            toast.error("Cost basis is required to calculate target price from percentage");
            return;
          }
        } else {
          targetPriceValue = inputValue;
        }
      }
    }

    const newStock: SimulatedStock = {
      code: codeToAdd,
      costBasis: costBasis ? parseFloat(costBasis) : undefined,
      volume: volume ? parseInt(volume, 10) : undefined,
      targetPrice: targetPriceValue,
    };

    setSimulatedStocks([...simulatedStocks, newStock]);
    setSelectedCode("");
    setStockCodeInput("");
    setCostBasis("");
    setVolume("");
    setTargetPrice("");
    setTargetPriceMode("value");
    setStockValidationError(null);
    setStockCodeOpen(false);
  };

  const handleRemoveStock = (code: string) => {
    setSimulatedStocks(simulatedStocks.filter((s) => s.code !== code));
    // Clear results when stocks change
    setResults(null);
    setEditingStock(null);
  };

  const handleEditStock = (code: string) => {
    const stock = simulatedStocks.find((s) => s.code === code);
    if (stock) {
      setEditingStock(code);
      setEditCostBasis(stock.costBasis?.toString() || "");
      setEditVolume(stock.volume?.toString() || "");
      setEditTargetPrice(stock.targetPrice?.toString() || "");
      setEditTargetPriceMode("value");
    }
  };

  const handleSaveEdit = () => {
    if (!editingStock) return;

    const costBasisValue = editCostBasis.trim() ? parseFloat(editCostBasis) : undefined;
    const volumeValue = editVolume.trim() ? parseInt(editVolume, 10) : undefined;
    
    let targetPriceValue: number | undefined = undefined;
    if (editTargetPrice.trim()) {
      const inputValue = parseFloat(editTargetPrice);
      if (!isNaN(inputValue) && inputValue >= 0) {
        if (editTargetPriceMode === "percent") {
          if (costBasisValue && costBasisValue > 0) {
            targetPriceValue = costBasisValue * (1 + inputValue / 100);
          } else {
            toast.error("Cost basis is required to calculate target price from percentage");
            return;
          }
        } else {
          targetPriceValue = inputValue;
        }
      }
    }

    if (costBasisValue !== undefined && (isNaN(costBasisValue) || costBasisValue < 0)) {
      toast.error("Invalid cost basis");
      return;
    }

    if (volumeValue !== undefined && (isNaN(volumeValue) || volumeValue < 0)) {
      toast.error("Invalid volume");
      return;
    }

    setSimulatedStocks(
      simulatedStocks.map((stock) =>
        stock.code === editingStock
          ? {
              ...stock,
              costBasis: costBasisValue,
              volume: volumeValue,
              targetPrice: targetPriceValue,
            }
          : stock
      )
    );
    setEditingStock(null);
    setEditCostBasis("");
    setEditVolume("");
    setEditTargetPrice("");
    setEditTargetPriceMode("value");
    setResults(null); // Clear results when stocks change
  };

  const handleCancelEdit = () => {
    setEditingStock(null);
    setEditCostBasis("");
    setEditVolume("");
    setEditTargetPrice("");
    setEditTargetPriceMode("value");
  };

  const handleCalculate = async () => {
    if (simulatedStocks.length === 0) {
      toast.error("Please add at least one stock");
      return;
    }

    setCalculating(true);
    try {
      const requestBody = {
        stocks: simulatedStocks.map((stock) => ({
          code: stock.code,
          costBasis: stock.costBasis || null,
          volume: stock.volume || null,
          targetPrice: stock.targetPrice || null,
        })),
      };

      const response = await api.post(apiEndpoint, requestBody);
      if (!response.ok) {
        throw new Error("Failed to calculate portfolio");
      }

      const data: PortfolioSimulationResponse = await response.json();
      setResults(data);
      toast.success("Portfolio calculated successfully");
    } catch (error: any) {
      console.error("Error calculating portfolio:", error);
      toast.error(error?.message || "Failed to calculate portfolio");
    } finally {
      setCalculating(false);
    }
  };

  const formatPrice = (value?: number | null): string => {
    if (value === null || value === undefined) return "N/A";
    return Math.round(value).toLocaleString("de-DE");
  };

  const formatPercent = (value?: number | null): string => {
    if (value === null || value === undefined) return "N/A";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Portfolio Simulation</DialogTitle>
          <DialogDescription>
            Add stocks from VN30 list or enter custom stock codes to simulate portfolio profit. Changes are temporary and not saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Stock Section */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-lg font-semibold mb-4">Add Stock</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Stock Code</label>
                <div className="relative">
                  <Popover open={stockCodeOpen} onOpenChange={setStockCodeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={stockCodeOpen}
                        className="w-full justify-between h-10"
                        disabled={loadingMarketPrice || validatingStock}
                      >
                        {selectedCode || stockCodeInput || "Select or enter a stock code..."}
                        <div className="flex items-center gap-2">
                          {validatingStock && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {loadingMarketPrice && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {stockValidationError && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search or type stock code..."
                          value={stockCodeInput}
                          onValueChange={handleStockCodeInputChange}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {stockCodeInput && !vn30Codes.includes(stockCodeInput.trim().toUpperCase()) 
                              ? "Type to enter custom stock code (will be validated)"
                              : "No stock found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {vn30Codes
                              .filter((code) => 
                                !simulatedStocks.some((s) => s.code === code) &&
                                (!stockCodeInput || code.toLowerCase().includes(stockCodeInput.toLowerCase()))
                              )
                              .map((code) => (
                                <CommandItem
                                  key={code}
                                  value={code}
                                  onSelect={() => {
                                    handleStockCodeChange(code);
                                    setStockCodeOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCode === code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {code}
                                </CommandItem>
                              ))}
                            {stockCodeInput && 
                             !vn30Codes.includes(stockCodeInput.trim().toUpperCase()) &&
                             !simulatedStocks.some((s) => s.code === stockCodeInput.trim().toUpperCase()) && (
                              <CommandItem
                                value={stockCodeInput.trim().toUpperCase()}
                                onSelect={() => {
                                  handleStockCodeChange(stockCodeInput.trim().toUpperCase());
                                  setStockCodeOpen(false);
                                }}
                                className="text-muted-foreground"
                              >
                                <AlertCircle className="mr-2 h-4 w-4" />
                                {stockCodeInput.trim().toUpperCase()} (Custom - will validate)
                              </CommandItem>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {stockValidationError && (
                    <p className="text-xs text-destructive mt-1">{stockValidationError}</p>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Cost Basis (VND)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Purchase price"
                  value={costBasis}
                  onChange={(e) => setCostBasis(e.target.value)}
                  disabled={loadingMarketPrice}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Volume (shares)</label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Number of shares"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const currentValue = volume || "0";
                      const numValue = parseInt(currentValue) || 0;
                      const newValue = Math.max(0, numValue + 100);
                      setVolume(newValue.toString());
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const currentValue = volume || "0";
                      const numValue = parseInt(currentValue) || 0;
                      const newValue = Math.max(0, numValue - 100);
                      setVolume(newValue.toString());
                    }
                  }}
                  onWheel={(e) => {
                    e.preventDefault();
                    const currentValue = volume || "0";
                    const numValue = parseInt(currentValue) || 0;
                    const newValue = e.deltaY < 0 
                      ? Math.max(0, numValue + 100)
                      : Math.max(0, numValue - 100);
                    setVolume(newValue.toString());
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Target Price</label>
                <div className="flex gap-2">
                  <Select value={targetPriceMode} onValueChange={(value: "value" | "percent") => setTargetPriceMode(value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">VND</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={targetPriceMode === "percent" ? "%" : "Target price"}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <Button onClick={handleAddStock} disabled={!selectedCode && !stockCodeInput || validatingStock || !!stockValidationError}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Simulated Stocks List */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Simulated Stocks ({simulatedStocks.length})</h3>
              <Button onClick={handleCalculate} disabled={calculating || simulatedStocks.length === 0}>
                {calculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Calculate Profit
                  </>
                )}
              </Button>
            </div>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Cost Basis</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Target Price</TableHead>
                    <TableHead>Target Profit</TableHead>
                    <TableHead>Market Price</TableHead>
                    <TableHead>Total Net Value</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead className="w-20">Profit %</TableHead>
                    <TableHead className="text-right w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground mt-2">Loading existing stocks...</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    simulatedStocks.map((stock) => {
                      const result = results?.stocks.find((r) => r.code === stock.code);
                      const isEditing = editingStock === stock.code;
                      
                      return (
                        <TableRow key={stock.code}>
                          <TableCell className="font-semibold">{stock.code}</TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editCostBasis}
                                onChange={(e) => setEditCostBasis(e.target.value)}
                                className="w-24"
                                placeholder="Cost basis"
                              />
                            ) : (
                              formatPrice(stock.costBasis)
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="100"
                                value={editVolume}
                                onChange={(e) => setEditVolume(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    const currentValue = editVolume || "0";
                                    const numValue = parseInt(currentValue) || 0;
                                    const newValue = Math.max(0, numValue + 100);
                                    setEditVolume(newValue.toString());
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    const currentValue = editVolume || "0";
                                    const numValue = parseInt(currentValue) || 0;
                                    const newValue = Math.max(0, numValue - 100);
                                    setEditVolume(newValue.toString());
                                  }
                                }}
                                onWheel={(e) => {
                                  e.preventDefault();
                                  const currentValue = editVolume || "0";
                                  const numValue = parseInt(currentValue) || 0;
                                  const newValue = e.deltaY < 0 
                                    ? Math.max(0, numValue + 100)
                                    : Math.max(0, numValue - 100);
                                  setEditVolume(newValue.toString());
                                }}
                                className="w-24"
                                placeholder="Volume"
                              />
                            ) : (
                              stock.volume?.toLocaleString() || "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex gap-1">
                                <Select value={editTargetPriceMode} onValueChange={(value: "value" | "percent") => setEditTargetPriceMode(value)}>
                                  <SelectTrigger className="w-16 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="value">VND</SelectItem>
                                    <SelectItem value="percent">%</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editTargetPrice}
                                  onChange={(e) => setEditTargetPrice(e.target.value)}
                                  className="w-20"
                                  placeholder={editTargetPriceMode === "percent" ? "%" : "Price"}
                                />
                              </div>
                            ) : (
                              formatPrice(stock.targetPrice)
                            )}
                          </TableCell>
                          <TableCell>
                            {result?.targetProfit !== undefined && result.targetProfit !== null ? (
                              <span className={`font-semibold ${
                                result.targetProfit >= 0 ? "text-green-600" : "text-red-600"
                              }`}>
                                {formatPrice(result.targetProfit)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        <TableCell>
                          {result?.error ? (
                            <span className="text-red-600 text-sm">{result.error}</span>
                          ) : result?.marketPrice ? (
                            formatPrice(result.marketPrice)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result?.costBasis && result?.volume && result.volume > 0
                            ? formatPrice(result.costBasis * result.volume)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {result?.currentValue !== undefined && result.currentValue !== null
                            ? formatPrice(result.currentValue)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {result?.profit !== undefined && result.profit !== null ? (
                            <span
                              className={`font-semibold ${
                                result.profit >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {formatPrice(result.profit)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {result?.profitPercent !== undefined && result.profitPercent !== null ? (
                            <span
                              className={`font-semibold ${
                                result.profitPercent >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {formatPercent(result.profitPercent)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right w-12">
                          {isEditing ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveEdit}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditStock(stock.code)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRemoveStock(stock.code)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
                {results && (() => {
                  // Calculate totals from results
                  const totalTargetValue = results.stocks.reduce((sum, stock) => {
                    if (stock.targetPrice && stock.volume && stock.volume > 0) {
                      return sum + stock.targetPrice * stock.volume;
                    }
                    return sum;
                  }, 0);
                  
                  const totalTargetProfit = results.stocks.reduce((sum, stock) => {
                    if (stock.targetProfit !== undefined && stock.targetProfit !== null) {
                      return sum + stock.targetProfit;
                    }
                    return sum;
                  }, 0);
                  
                  const totalNetValue = results.stocks.reduce((sum, stock) => {
                    if (stock.costBasis && stock.volume && stock.volume > 0) {
                      return sum + stock.costBasis * stock.volume;
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
                          <span className={`text-sm font-semibold ${
                            totalTargetProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {totalTargetProfit !== 0 ? formatPrice(totalTargetProfit) : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">{formatPrice(totalNetValue)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {formatPrice(results.totalCurrentValue)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-lg font-bold ${
                            results.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPrice(results.totalProfit)}
                            {totalNetValue > 0 && (
                              <span className={`ml-2 text-xs font-medium ${
                                results.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({results.totalProfit >= 0 ? '+' : ''}
                                {((results.totalProfit / totalNetValue) * 100).toFixed(2)}%)
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="w-20"></TableCell>
                        <TableCell className="w-12"></TableCell>
                      </TableRow>
                    </tfoot>
                  );
                })()}
              </Table>
            </div>

          {!loading && simulatedStocks.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p>No stocks in portfolio. Add stocks from VN30 list or enter custom stock codes above to start simulation.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

