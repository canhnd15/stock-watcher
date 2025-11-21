import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
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
  const { t } = useI18n();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/suggestions');
      
      if (!response.ok) {
        throw new Error(t('suggestions.error'));
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
      toast.error(t('suggestions.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchSuggestions();
      toast.success(t('suggestions.refreshed'));
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
      toast.error(t('suggestions.error'));
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
    if (confidence >= 0.7) return t('suggestions.high');
    if (confidence >= 0.5) return t('suggestions.medium');
    return t('suggestions.low');
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

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case "strong":
        return t('suggestions.strong');
      case "moderate":
        return t('suggestions.moderate');
      case "weak":
        return t('suggestions.weak');
      default:
        return t('suggestions.neutral');
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "buy":
        return t('suggestions.buy');
      case "sell":
        return t('suggestions.sell');
      default:
        return t('suggestions.hold');
    }
  };

  const buyCount = suggestions.filter(s => s.action === "buy").length;
  const sellCount = suggestions.filter(s => s.action === "sell").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('suggestions.title')}</h2>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('suggestions.refresh')}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('suggestions.buy')} {t('signals.title')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{buyCount}</div>
              <CardDescription>{t('suggestions.buyPotential')}</CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('suggestions.sell')} {t('signals.title')}</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{sellCount}</div>
              <CardDescription>{t('suggestions.sellSignals')}</CardDescription>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t('suggestions.loading')}</p>
            </CardContent>
          </Card>
        ) : suggestions.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">{t('suggestions.noSuggestions')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('suggestions.requireData')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('suggestions.code')}</TableHead>
                  <TableHead>{t('suggestions.action')}</TableHead>
                  <TableHead>{t('suggestions.priceTarget')}</TableHead>
                  <TableHead>{t('suggestions.confidence')}</TableHead>
                  <TableHead className="text-right">{t('suggestions.volume24h')}</TableHead>
                  <TableHead>{t('suggestions.reason')}</TableHead>
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
                        {getActionLabel(suggestion.action).toUpperCase()} {suggestion.strength !== "neutral" ? `(${getStrengthLabel(suggestion.strength)})` : ""}
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
        )}
        
        <p className="mt-4 text-sm text-muted-foreground text-center">
          {t('suggestions.disclaimer')}
        </p>
      </main>
    </div>
  );
};

export default Suggestions;
