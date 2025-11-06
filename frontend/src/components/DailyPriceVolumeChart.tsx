import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
}

const chartConfig = {
  price: {
    label: "Reference Price (VND)",
    color: "#ef4444", // Red color for price bars
  },
  volume: {
    label: "Volume (Millions)",
    color: "#10b981", // Green color for volume bars
  },
};

export function DailyPriceVolumeChart({ data, code, loading }: DailyPriceVolumeChartProps) {
  // Transform volume to millions and format data
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      totalVolume: item.totalVolume / 1_000_000, // Convert to millions
      latestPrice: Number(item.latestPrice) || 0,
    }));
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {code ? `${code} - ` : ""}Price & Volume Over Time
          </CardTitle>
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
        <CardHeader>
          <CardTitle>
            {code ? `${code} - ` : ""}Price & Volume Over Time
          </CardTitle>
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
      <CardHeader>
        <CardTitle>
          {code ? `${code} - ` : ""}Price & Volume Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ComposedChart
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
                yAxisId="price"
                orientation="left"
                label={{ value: "Price (VND)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                label={{ value: "Volume (M)", angle: 90, position: "insideRight", style: { textAnchor: "middle" } }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(1)}M`}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value: any, name: string, item: any, index: number, payload: any) => {
                      let formattedValue = value;
                      
                      if (name === "totalVolume" || name === "Volume (Millions)") {
                        // Format volume: 52.326 -> 52,326 (Milions) - use comma separator, no decimals
                        const numValue = Number(value);
                        formattedValue = Math.round(numValue).toLocaleString('en-US', { 
                          useGrouping: true,
                          maximumFractionDigits: 0 
                        }) + ' (Milions)';
                      } else if (name === "latestPrice" || name === "Reference Price (VND)") {
                        // Format price with period as thousands separator: 23800 -> 23.800 (VND)
                        const numValue = Number(value);
                        formattedValue = numValue.toLocaleString('en-US', { 
                          useGrouping: true,
                          maximumFractionDigits: 0 
                        }).replace(/,/g, '.') + ' (VND)';
                      }
                      
                      return (
                        <div className="flex w-full flex-wrap items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                            style={{
                              backgroundColor: item?.color || payload?.fill || "#ef4444",
                            }}
                          />
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {formattedValue}
                          </span>
                        </div>
                      );
                    }}
                    hideLabel={true}
                  />
                }
              />
              <Legend />
              <Bar
                yAxisId="price"
                dataKey="latestPrice"
                fill="#ef4444"
                name="Reference Price (VND)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="volume"
                dataKey="totalVolume"
                fill="#10b981"
                name="Volume (Millions)"
                radius={[4, 4, 0, 0]}
              />
            </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

