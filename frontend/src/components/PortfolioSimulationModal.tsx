import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import { Loader2, Plus, Trash2, RefreshCw, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SimulatedStock {
  code: string;
  costBasis?: number;
  volume?: number;
}

interface SimulatedStockResult {
  code: string;
  costBasis?: number;
  volume?: number;
  marketPrice?: number;
  profit?: number;
  profitPercent?: number;
  currentValue?: number;
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
  const [results, setResults] = useState<PortfolioSimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editCostBasis, setEditCostBasis] = useState("");
  const [editVolume, setEditVolume] = useState("");

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
      setCostBasis("");
      setVolume("");
      setEditingStock(null);
    }
  }, [open, loadExistingStocks]);

  const handleAddStock = () => {
    if (!selectedCode) {
      toast.error("Please select a stock code");
      return;
    }

    if (simulatedStocks.some((s) => s.code === selectedCode)) {
      toast.error("Stock already added");
      return;
    }

    const newStock: SimulatedStock = {
      code: selectedCode,
      costBasis: costBasis ? parseFloat(costBasis) : undefined,
      volume: volume ? parseInt(volume, 10) : undefined,
    };

    setSimulatedStocks([...simulatedStocks, newStock]);
    setSelectedCode("");
    setCostBasis("");
    setVolume("");
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
    }
  };

  const handleSaveEdit = () => {
    if (!editingStock) return;

    const costBasisValue = editCostBasis.trim() ? parseFloat(editCostBasis) : undefined;
    const volumeValue = editVolume.trim() ? parseInt(editVolume, 10) : undefined;

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
            }
          : stock
      )
    );
    setEditingStock(null);
    setEditCostBasis("");
    setEditVolume("");
    setResults(null); // Clear results when stocks change
  };

  const handleCancelEdit = () => {
    setEditingStock(null);
    setEditCostBasis("");
    setEditVolume("");
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
            Add stocks from VN30 list to simulate portfolio profit. Changes are temporary and not saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Stock Section */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-lg font-semibold mb-4">Add Stock</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Stock Code</label>
                <select
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a stock...</option>
                  {vn30Codes
                    .filter((code) => !simulatedStocks.some((s) => s.code === code))
                    .map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                </select>
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
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Volume (shares)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Number of shares"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                />
              </div>
              <Button onClick={handleAddStock} disabled={!selectedCode}>
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
                    <TableHead>Market Price</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Profit %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
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
                                value={editVolume}
                                onChange={(e) => setEditVolume(e.target.value)}
                                className="w-24"
                                placeholder="Volume"
                              />
                            ) : (
                              stock.volume?.toLocaleString() || "N/A"
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
                        <TableCell className="text-right">
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
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditStock(stock.code)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveStock(stock.code)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                  )}
                </TableBody>
                {results && (
                  <tfoot>
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell colSpan={4} className="text-right">
                        Total:
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatPrice(results.totalCurrentValue)}
                      </TableCell>
                      <TableCell className="font-bold">
                        <span
                          className={
                            results.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {formatPrice(results.totalProfit)}
                        </span>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>

          {!loading && simulatedStocks.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p>No stocks in portfolio. Add stocks from VN30 list above to start simulation.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

