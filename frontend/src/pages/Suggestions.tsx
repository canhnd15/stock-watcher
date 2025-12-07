import { useState, useEffect } from "react";
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
import { TrendingUp, TrendingDown, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Suggestion {
  code: string;
  action: "buy" | "sell" | "hold";
  strength: "strong" | "moderate" | "weak" | "neutral";
  currentPrice: number;
  targetPrice: number;
  confidence: number; // 0.0 to 1.0
  reason: string;
  volume24h: number;
  score: number;
  consensus: number;
  buyVotes: number;
  sellVotes: number;
}

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/suggestions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data: Suggestion[] = await response.json();
      // Sort by score (absolute value) and confidence
      const sorted = data.sort((a, b) => {
        const scoreA = Math.abs(a.score) * a.confidence;
        const scoreB = Math.abs(b.score) * b.confidence;
        return scoreB - scoreA;
      });
      setSuggestions(sorted);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchSuggestions();
      toast.success('Suggestions refreshed');
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
      toast.error('Failed to refresh suggestions');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) {
      return "bg-success text-success-foreground";
    } else if (confidence >= 0.5) {
      return "bg-primary text-primary-foreground";
    } else {
      return "bg-muted text-muted-foreground";
    }
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return "high";
    if (confidence >= 0.5) return "medium";
    return "low";
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "bg-green-600 hover:bg-green-700 text-white";
      case "moderate":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "weak":
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      default:
        return "";
    }
  };

  const buyCount = suggestions.filter(s => s.action === "buy").length;
  const sellCount = suggestions.filter(s => s.action === "sell").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">Trading Suggestions</h2>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
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

        {loading ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading suggestions...</p>
            </CardContent>
          </Card>
        ) : suggestions.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No suggestions available at this time.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Suggestions require at least 5 days of trading data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Code</TableHead>
                    <TableHead className="min-w-[120px]">Action</TableHead>
                    <TableHead className="min-w-[180px]">Price Target</TableHead>
                    <TableHead className="min-w-[120px]">Confidence</TableHead>
                    <TableHead className="text-right min-w-[120px]">24h Volume</TableHead>
                    <TableHead className="min-w-[250px]">Reason</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {suggestions.map((suggestion) => (
                  <TableRow key={suggestion.code}>
                    <TableCell className="font-semibold text-lg">{suggestion.code}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={suggestion.action === "buy" ? "default" : suggestion.action === "sell" ? "destructive" : "secondary"}
                        className={suggestion.action === "buy" ? getStrengthColor(suggestion.strength) : 
                                   suggestion.action === "sell" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                      >
                        {suggestion.action.toUpperCase()} {suggestion.strength !== "neutral" ? `(${suggestion.strength})` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-mono">
                        <span>{suggestion.currentPrice.toLocaleString()}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className={suggestion.action === "buy" ? "text-success" : suggestion.action === "sell" ? "text-destructive" : "text-muted-foreground"}>
                          {suggestion.targetPrice.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getConfidenceColor(suggestion.confidence)}>
                        {getConfidenceLabel(suggestion.confidence)} ({(suggestion.confidence * 100).toFixed(0)}%)
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
          </div>
        )}
        
        <p className="mt-4 text-sm text-muted-foreground text-center">
          * Suggestions are based on 10-day multi-formula analysis (Volume-Price Momentum, MA Crossover, RSI, Trend Strength) and should not be considered financial advice
        </p>
      </main>
    </div>
  );
};

export default Suggestions;
