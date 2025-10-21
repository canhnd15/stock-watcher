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
import { Loader2 } from "lucide-react";

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
  const [fromDate, setFromDate] = useState(""); // yyyy-MM-dd
  const [toDate, setToDate] = useState("");     // yyyy-MM-dd
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalVolume, setTotalVolume] = useState(0);

  const fetchTotalVolume = () => {
    const params = new URLSearchParams();
    if (code) params.set("code", code.trim());
    if (type && type !== "All") params.set("type", type.toLowerCase());
    if (minVolume) params.set("minVolume", String(parseInt(minVolume)));
    if (maxVolume) params.set("maxVolume", String(parseInt(maxVolume)));
    if (minPrice) params.set("minPrice", String(parseInt(minPrice)));
    if (maxPrice) params.set("maxPrice", String(parseInt(maxPrice)));
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    fetch(`http://localhost:8080/api/trades/volume-sum?${params.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((sum) => setTotalVolume(Number(sum || 0)))
      .catch(() => setTotalVolume(0));
  };

  const fetchTrades = (nextPage = page, nextSize = size) => {
    const params = new URLSearchParams();
    if (code) params.set("code", code.trim());
    if (type && type !== "All") params.set("type", type.toLowerCase());
    if (minVolume) params.set("minVolume", String(parseInt(minVolume)));
    if (maxVolume) params.set("maxVolume", String(parseInt(maxVolume)));
    if (minPrice) params.set("minPrice", String(parseInt(minPrice)));
    if (maxPrice) params.set("maxPrice", String(parseInt(maxPrice)));
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    params.set("page", String(nextPage));
    params.set("size", String(nextSize));

    setLoading(true);
    fetch(`http://localhost:8080/api/trades?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load trades");
        return r.json();
      })
      .then((respPage) => {
        const items = (respPage?.content || []).map((t: any) => ({
          id: String(t.id ?? `${t.code}-${t.tradeTime}`),
          time: t.tradeTime ?? t.time ?? "",
          code: t.code ?? "",
          side: (t.side ?? "").toLowerCase() === "buy" ? "buy" : "sell",
          price: Number(t.price ?? 0),
          volume: Number(t.volume ?? 0),
        })) as Trade[];
        setFilteredTrades(items);
        setTotalElements(Number(respPage?.totalElements ?? 0));
        setTotalPages(Number(respPage?.totalPages ?? 0));
        setPage(Number(respPage?.number ?? nextPage));
        setSize(Number(respPage?.size ?? nextSize));
      })
      .catch(() => toast.error("Failed to load trades"))
      .finally(() => setLoading(false));
    // fetch total volume separately (not paged)
    fetchTotalVolume();
  };

  const handleSearch = () => {
    setPage(0);
    fetchTrades(0, size);
  };

  const setHighVolume = (value: number) => {
    setMinVolume(value.toString());
    setPage(0);
    fetchTrades(0, size);
  };

  const handleIngest = () => {
    if (ingestCode) {
      const c = ingestCode.trim().toUpperCase();
      setIngesting(true);
      fetch(`http://localhost:8080/api/trades/ingest/${encodeURIComponent(c)}`, { method: "POST" })
        .then((r) => {
          if (!r.ok) throw new Error("Failed");
          toast.success(`Ingestion completed for ${c}`);
          setIngestCode("");
        })
        .catch(() => toast.error(`Failed to ingest ${c}`))
        .finally(() => setIngesting(false));
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
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Volume Range</label>
              <Select
                value={`${minVolume || ''}|${maxVolume || ''}`}
                onValueChange={(v) => {
                  const [minV, maxV] = v.split("|");
                  setMinVolume(minV);
                  setMaxVolume(maxV);
                  setPage(0);
                  fetchTrades(0, size);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="|">All</SelectItem>
                  <SelectItem value="|1000">{"<=1000"}</SelectItem>
                  <SelectItem value="1000|5000">{"1000 - 5000"}</SelectItem>
                  <SelectItem value="5000|10000">{"5000 - 10000"}</SelectItem>
                  <SelectItem value="10000|100000">{"10000 - 100000"}</SelectItem>
                  <SelectItem value="100000|400000">{"100000 - 400000"}</SelectItem>
                  <SelectItem value="400000|1000000">{"400000 - 1000000"}</SelectItem>
                  <SelectItem value="1000000|">{">= 1000000"}</SelectItem>
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleSearch} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>
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
              <Button onClick={handleIngest} disabled={ingesting}>
                {ingesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ingest Now
              </Button>
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

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing page {totalPages === 0 ? 0 : page + 1} of {totalPages} • {totalElements.toLocaleString()} results • Total volume: {totalVolume.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <Select value={String(size)} onValueChange={(v) => { const n = Number(v); setSize(n); setPage(0); fetchTrades(0, n); }}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page <= 0 || loading} onClick={() => { const p = page - 1; setPage(p); fetchTrades(p, size); }}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => { const p = page + 1; setPage(p); fetchTrades(p, size); }}>Next</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Trades;
