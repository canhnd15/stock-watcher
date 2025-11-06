import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Roombar } from "@/lib/api";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";

interface StockRoombarStatsProps {
  bars: Roombar[];
  code: string;
}

export function StockRoombarStats({ bars, code }: StockRoombarStatsProps) {
  if (!bars || bars.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals and averages
  const totalBuyVal = bars.reduce((sum, bar) => sum + bar.buyVal, 0);
  const totalSellVal = bars.reduce((sum, bar) => sum + bar.sellVal, 0);
  const totalNetVal = bars.reduce((sum, bar) => sum + bar.netVal, 0);
  const totalBuyVol = bars.reduce((sum, bar) => sum + bar.buyVol, 0);
  const totalSellVol = bars.reduce((sum, bar) => sum + bar.sellVol, 0);
  const totalNetVol = bars.reduce((sum, bar) => sum + bar.netVol, 0);

  const avgBuyVal = totalBuyVal / bars.length;
  const avgSellVal = totalSellVal / bars.length;
  const avgNetVal = totalNetVal / bars.length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const formatVolume = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  // Prepare chart data - sort by date ascending and format for chart
  const chartData = useMemo(() => {
    return [...bars]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map((bar) => ({
        date: new Date(bar.time).toLocaleDateString('vi-VN', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        buyVol: bar.buyVol,
        sellVol: bar.sellVol,
      }));
  }, [bars]);

  const chartConfig = {
    buyVol: {
      label: "Buy Volume",
      color: "#10b981", // Green
    },
    sellVol: {
      label: "Sell Volume",
      color: "#ef4444", // Red
    },
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Buy Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalBuyVal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(avgBuyVal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Sell Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalSellVal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(avgSellVal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Net Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNetVal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalNetVal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(avgNetVal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Volume Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Buy Volume</p>
              <p className="text-xl font-bold text-green-600">{formatVolume(totalBuyVol)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sell Volume</p>
              <p className="text-xl font-bold text-red-600">{formatVolume(totalSellVol)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Volume</p>
              <p className={`text-xl font-bold ${totalNetVol >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatVolume(totalNetVol)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Breakdown ({bars.length} days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Buy Value</th>
                  <th className="text-right p-2">Sell Value</th>
                  <th className="text-right p-2">Net Value</th>
                  <th className="text-right p-2">Buy Vol</th>
                  <th className="text-right p-2">Sell Vol</th>
                  <th className="text-right p-2">Net Vol</th>
                </tr>
              </thead>
              <tbody>
                {bars.map((bar, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {new Date(bar.time).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="text-right p-2 text-green-600">
                      {formatCurrency(bar.buyVal)}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      {formatCurrency(bar.sellVal)}
                    </td>
                    <td className="text-right p-2">
                      <Badge variant={bar.netVal >= 0 ? "default" : "destructive"}>
                        {formatCurrency(bar.netVal)}
                      </Badge>
                    </td>
                    <td className="text-right p-2 text-green-600">
                      {formatVolume(bar.buyVol)}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      {formatVolume(bar.sellVol)}
                    </td>
                    <td className="text-right p-2">
                      <Badge variant={bar.netVol >= 0 ? "default" : "destructive"}>
                        {formatVolume(bar.netVol)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Volume Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buy & Sell Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                label={{ value: "Volume", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => {
                  // Format volume in millions if >= 1M, otherwise show as-is
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(1)}K`;
                  }
                  return value.toLocaleString();
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value: any, name: string) => {
                      const numValue = Number(value);
                      const formatted = formatVolume(numValue);
                      return `${formatted} shares`;
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="buyVol"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
                name="Buy Volume"
              />
              <Line
                type="monotone"
                dataKey="sellVol"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 4 }}
                name="Sell Volume"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

