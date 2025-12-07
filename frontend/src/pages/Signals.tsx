import { useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, X, Activity, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";
import { api } from "@/lib/api";

const Signals = () => {
  const { isConnected, signals, clearSignals } = useWebSocket();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      
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
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Signal Tracker</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Real-time buy/sell signals based on trade analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Refresh Button */}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing || !isConnected}
                className="border-2"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {/* Connection Status */}
              <Card className={`${isConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} transition-colors flex-1 sm:flex-none`}>
                <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className={`text-xs sm:text-sm font-semibold ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                    {isConnected ? 'Active' : 'Disconnected'}
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
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                <TableHead className="min-w-[80px]">Code</TableHead>
                <TableHead className="min-w-[100px]">Signal</TableHead>
                <TableHead className="min-w-[70px]">Score</TableHead>
                <TableHead className="min-w-[120px]">Time</TableHead>
                <TableHead className="text-right min-w-[100px]">Buy Volume</TableHead>
                <TableHead className="text-right min-w-[100px]">Sell Volume</TableHead>
                <TableHead className="text-right min-w-[90px]">Price</TableHead>
                <TableHead className="text-right min-w-[90px]">Change</TableHead>
                <TableHead className="min-w-[200px]">Reason</TableHead>
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
              </div>
            </CardContent>
          </Card>
        ) : (
          /* No Signals Message */
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4 opacity-50">📊</div>
              <h3 className="text-lg font-semibold mb-2">
                {isConnected ? 'Listening for signals...' : 'Connecting...'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Signals appear when strong buy/sell pressure is detected
              </p>
              {isConnected && (
                <div className="mt-6 text-xs text-muted-foreground space-y-1">
                  <p>✓ Multi-factor analysis (volume, blocks, momentum)</p>
                  <p>✓ Analyzing last 30 minutes of trades</p>
                  <p>✓ Minimum score threshold: 4 points</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Signals;

