import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
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
import { Loader2 } from "lucide-react";

interface TrackedStock {
  code: string;
  active: boolean;
}

const TrackedStocks = () => {
  const [stockInput, setStockInput] = useState("");
  const [trackedStocks, setTrackedStocks] = useState<TrackedStock[]>([]);
  const [ingestingMap, setIngestingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load tracked stocks from backend
    fetch("/api/stocks")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stocks");
        return r.json();
      })
      .then((data: TrackedStock[]) => setTrackedStocks(data))
      .catch(() => toast.error("Failed to load tracked stocks"));
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Tracked Stocks</h2>
        
        <div className="mb-8 space-y-4">
          <Textarea
            placeholder="Enter stock codes separated by comma, space, or newline. Example: FPT, VCB, HPG"
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            className="min-h-32"
          />
          <Button onClick={handleSaveCodes}>Save Codes</Button>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIngestNow(stock.code)}
                    >
                      Ingest Now
                    </Button>
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
