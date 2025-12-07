import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface DailyData {
  date: string; // "DD/MM/YYYY"
  latestPrice: number;
  minPrice?: number;
  maxPrice?: number;
  totalVolume: number; // in shares (will be converted to millions)
}

interface DailyPriceVolumeChartProps {
  data: DailyData[];
  code?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

const chartConfig = {
  volume: {
    label: "Volume (Millions)",
    color: "#10b981", // Green color for volume bars
  },
};

export function DailyPriceVolumeChart({ data, code, loading, onRefresh }: DailyPriceVolumeChartProps) {
  // Transform volume to millions and format data
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: item.date,
      totalVolume: item.totalVolume / 1_000_000, // Convert to millions
    }));
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>
            {code ? `${code} - ` : ""}Volume Over Time
          </CardTitle>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>
            {code ? `${code} - ` : ""}Volume Over Time
          </CardTitle>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No data available for the selected filters
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2 gap-2">
        <CardTitle className="text-lg sm:text-xl">
          {code ? `${code} - ` : ""}Volume Over Time
        </CardTitle>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px] w-full">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 10, left: 0, bottom: 60 }}
          >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                label={{ value: "Volume (M)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fontSize: 10 } }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(value) => `${value.toFixed(1)}M`}
                width={50}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value: any, name: string, item: any, index: number, payload: any) => {
                      // Format volume: 52.326 -> 52,326 (Milions) - use comma separator, no decimals
                      const numValue = Number(value);
                      const formattedValue = Math.round(numValue).toLocaleString('en-US', { 
                        useGrouping: true,
                        maximumFractionDigits: 0 
                      }) + ' (Milions)';
                      
                      return (
                        <div className="flex w-full flex-wrap items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                            style={{
                              backgroundColor: item?.color || payload?.fill || "#10b981",
                            }}
                          />
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {formattedValue}
                          </span>
                        </div>
                      );
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                }
              />
              <Legend />
              <Bar
                dataKey="totalVolume"
                fill="#10b981"
                name="Volume (Millions)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

