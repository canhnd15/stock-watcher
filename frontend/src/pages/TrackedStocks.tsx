import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import { Loader2, Check, Trash2 } from "lucide-react";

interface TrackedStock {
  code: string;
  active: boolean;
}

const TrackedStocks = () => {
  const [stockInput, setStockInput] = useState("");
  const [trackedStocks, setTrackedStocks] = useState<TrackedStock[]>([]);
  const [ingestingMap, setIngestingMap] = useState<Record<string, boolean>>({});
  const [vn30Codes, setVn30Codes] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [loadingVn30, setLoadingVn30] = useState(true);
  const [customCodesModalOpen, setCustomCodesModalOpen] = useState(false);

  useEffect(() => {
    // Load tracked stocks from backend
    fetch("/api/stocks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stocks");
        return r.json();
      })
      .then((data: TrackedStock[]) => setTrackedStocks(data))
      .catch(() => toast.error("Failed to load tracked stocks"));
    
    // Load VN30 codes from backend
    setLoadingVn30(true);
    fetch("/api/stocks/vn30")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load VN30 codes");
        return r.json();
      })
      .then((data: string[]) => {
        console.log("VN30 codes loaded:", data);
        setVn30Codes(data);
      })
      .catch((err) => {
        console.error("Failed to load VN30 codes:", err);
        toast.error("Failed to load VN30 codes");
      })
      .finally(() => setLoadingVn30(false));
  }, []);

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

    const codes = Array.from(selectedCodes);
    
    fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes })
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to save");
        return r.json().catch(() => ({}));
      })
      .then(() => {
        setSelectedCodes(new Set());
        toast.success(`Saved ${codes.length} stock code(s)`);
        return fetch("/api/stocks");
      })
      .then((r) => r.ok ? r.json() : [])
      .then((data: TrackedStock[]) => setTrackedStocks(data))
      .catch(() => toast.error("Failed to save codes"));
  };

  const handleSaveCodes = () => {
    const codes = stockInput
      .split(/[\s\n,]+/)
      .map(code => code.trim().toUpperCase())
      .filter(code => code.length > 0);
    if (codes.length === 0) return;

    fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes })
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to save");
        return r.json().catch(() => ({}));
      })
      .then(() => {
        setStockInput("");
        toast.success(`Saved ${codes.length} stock code(s)`);
        setCustomCodesModalOpen(false);
        return fetch("/api/stocks");
      })
      .then((r) => r.ok ? r.json() : [])
      .then((data: TrackedStock[]) => setTrackedStocks(data))
      .catch(() => toast.error("Failed to save codes"));
  };

  const toggleActive = (code: string) => {
    const current = trackedStocks.find(s => s.code === code);
    if (!current) return;
    const nextActive = !current.active;
    // Optimistic update
    setTrackedStocks(prev => prev.map(s => s.code === code ? { ...s, active: nextActive } : s));
    fetch(`/api/stocks/${encodeURIComponent(code)}/active/${nextActive}`, { method: "PUT" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
      })
      .catch(() => {
        // Revert on failure
        setTrackedStocks(prev => prev.map(s => s.code === code ? { ...s, active: !nextActive } : s));
        toast.error(`Failed to update ${code}`);
      });
  };

  const handleIngestNow = (code: string) => {
    setIngestingMap(prev => ({ ...prev, [code]: true }));
    fetch(`/api/trades/reingest/${encodeURIComponent(code)}`, { method: "POST" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        toast.success(`Re-ingested ${code}`);
      })
      .catch(() => toast.error(`Failed to ingest ${code}`))
      .finally(() => setIngestingMap(prev => ({ ...prev, [code]: false })));
  };

  const handleDelete = (code: string) => {
    fetch(`/api/stocks/${encodeURIComponent(code)}`, { method: "DELETE" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        toast.success(`Deleted ${code} from tracked stocks`);
        // Remove from local state
        setTrackedStocks(prev => prev.filter(s => s.code !== code));
      })
      .catch(() => toast.error(`Failed to delete ${code}`));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Tracked Stocks</h2>
        
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

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackedStocks.map((stock) => (
                <TableRow key={stock.code}>
                  <TableCell className="font-semibold text-lg">{stock.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={stock.active}
                        onCheckedChange={() => toggleActive(stock.code)}
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIngestNow(stock.code)}
                        disabled={ingestingMap[stock.code]}
                      >
                        {ingestingMap[stock.code] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Ingesting...
                          </>
                        ) : (
                          "Ingest Now"
                        )}
                      </Button>
                      
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
                            <AlertDialogAction onClick={() => handleDelete(stock.code)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {trackedStocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
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
