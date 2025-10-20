import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import Header from "@/components/Header.tsx";
import { toast } from "sonner";

interface Trade {
  id: string;
  time: string;
  code: string;
  side: "buy" | "sell";
  price: number;
  volume: number;
}

const Trades = () => {
  const [code, setCode] = useState("");
  const [type, setType] = useState("All");
  const [minVolume, setMinVolume] = useState("");
  const [maxVolume, setMaxVolume] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ingestCode, setIngestCode] = useState("");
  
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (code) params.set("code", code.trim());
    if (type && type !== "All") params.set("type", type.toLowerCase());
    if (minVolume) params.set("minVolume", String(parseInt(minVolume)));
    if (maxVolume) params.set("maxVolume", String(parseInt(maxVolume)));
    if (minPrice) params.set("minPrice", String(parseInt(minPrice)));
    if (maxPrice) params.set("maxPrice", String(parseInt(maxPrice)));
    params.set("page", "0");
    params.set("size", "100");

    fetch(`http://localhost:8080/api/trades?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load trades");
        return r.json();
      })
      .then((page) => {
        const items = (page?.content || []).map((t: any) => ({
          id: String(t.id ?? `${t.code}-${t.tradeTime}`),
          time: t.tradeTime ?? t.time ?? "",
          code: t.code ?? "",
          side: (t.side ?? "").toLowerCase() === "buy" ? "buy" : "sell",
          price: Number(t.price ?? 0),
          volume: Number(t.volume ?? 0),
        })) as Trade[];
        setFilteredTrades(items);
      })
      .catch(() => toast.error("Failed to load trades"));
  };

  const setHighVolume = (value: number) => {
    setMinVolume(value.toString());
    handleSearch();
  };

  const handleIngest = () => {
    if (ingestCode) {
      const c = ingestCode.trim().toUpperCase();
      fetch(`http://localhost:8080/api/trades/ingest/${encodeURIComponent(c)}`, { method: "POST" })
        .then((r) => {
          if (!r.ok) throw new Error("Failed");
          toast.success(`Ingestion completed for ${c}`);
          setIngestCode("");
        })
        .catch(() => toast.error(`Failed to ingest ${c}`));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Code</label>
              <Input
                placeholder="FPT"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Min Volume</label>
              <Input
                type="number"
                value={minVolume}
                onChange={(e) => setMinVolume(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Max Volume</label>
              <Input
                type="number"
                value={maxVolume}
                onChange={(e) => setMaxVolume(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Min Price</label>
              <Input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Max Price</label>
              <Input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleSearch}>Search</Button>
            <span className="text-sm text-muted-foreground">High volume:</span>
            <Button variant="outline" size="sm" onClick={() => setHighVolume(10000)}>10k</Button>
            <Button variant="outline" size="sm" onClick={() => setHighVolume(20000)}>20k</Button>
            <Button variant="outline" size="sm" onClick={() => setHighVolume(50000)}>50k</Button>
            <Button variant="outline" size="sm" onClick={() => setHighVolume(100000)}>100k</Button>
            <Button variant="outline" size="sm" onClick={() => setHighVolume(200000)}>200k</Button>
            
            <div className="ml-auto flex gap-2">
              <Input
                placeholder="Ingest code..."
                value={ingestCode}
                onChange={(e) => setIngestCode(e.target.value)}
                className="w-48"
              />
              <Button onClick={handleIngest}>Ingest Now</Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-mono text-sm">{trade.time}</TableCell>
                  <TableCell className="font-semibold">{trade.code}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={trade.side === "buy" ? "default" : "destructive"}
                      className={trade.side === "buy" ? "bg-success hover:bg-success/90" : ""}
                    >
                      {trade.side}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {trade.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {trade.volume.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Trades;
