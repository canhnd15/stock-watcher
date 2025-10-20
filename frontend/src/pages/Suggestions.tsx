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
import Header from "@/components/Header.tsx";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface Suggestion {
  code: string;
  action: "buy" | "sell";
  currentPrice: number;
  targetPrice: number;
  confidence: "high" | "medium" | "low";
  reason: string;
  volume24h: number;
}

const mockSuggestions: Suggestion[] = [
  {
    code: "VPB",
    action: "buy",
    currentPrice: 18500,
    targetPrice: 20000,
    confidence: "high",
    reason: "Strong volume increase with positive price momentum",
    volume24h: 2500000,
  },
  {
    code: "FPT",
    action: "buy",
    currentPrice: 112500,
    targetPrice: 118000,
    confidence: "medium",
    reason: "Breaking resistance level with good support",
    volume24h: 450000,
  },
  {
    code: "ACB",
    action: "sell",
    currentPrice: 25750,
    targetPrice: 24000,
    confidence: "medium",
    reason: "High selling pressure detected, consider profit taking",
    volume24h: 1800000,
  },
  {
    code: "HPG",
    action: "buy",
    currentPrice: 27800,
    targetPrice: 29500,
    confidence: "high",
    reason: "Volume surge with institutional buying pattern",
    volume24h: 5200000,
  },
  {
    code: "TCB",
    action: "sell",
    currentPrice: 23400,
    targetPrice: 22000,
    confidence: "low",
    reason: "Weakening momentum, bearish divergence",
    volume24h: 980000,
  },
];

const Suggestions = () => {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-success text-success-foreground";
      case "medium":
        return "bg-primary text-primary-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "";
    }
  };

  const buyCount = mockSuggestions.filter(s => s.action === "buy").length;
  const sellCount = mockSuggestions.filter(s => s.action === "sell").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Trading Suggestions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buy Signals</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{buyCount}</div>
              <CardDescription>Stocks showing buy potential</CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sell Signals</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{sellCount}</div>
              <CardDescription>Stocks showing sell signals</CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Price Target</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="text-right">24h Volume</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSuggestions.map((suggestion) => (
                <TableRow key={suggestion.code}>
                  <TableCell className="font-semibold text-lg">{suggestion.code}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={suggestion.action === "buy" ? "default" : "destructive"}
                      className={suggestion.action === "buy" ? "bg-success hover:bg-success/90" : ""}
                    >
                      {suggestion.action.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono">
                      <span>{suggestion.currentPrice.toLocaleString()}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className={suggestion.action === "buy" ? "text-success" : "text-destructive"}>
                        {suggestion.targetPrice.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getConfidenceColor(suggestion.confidence)}>
                      {suggestion.confidence}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {suggestion.volume24h.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {suggestion.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <p className="mt-4 text-sm text-muted-foreground text-center">
          * Suggestions are based on technical analysis and should not be considered financial advice
        </p>
      </main>
    </div>
  );
};

export default Suggestions;
