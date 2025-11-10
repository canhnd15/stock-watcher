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
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface OHLCData {
  date: string; // "DD/MM/YYYY"
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
}

interface DailyOHLCChartProps {
  data: OHLCData[];
  code?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

const chartConfig = {
  openPrice: {
    label: "Open Price (VND)",
    color: "#3b82f6", // Blue
  },
  highPrice: {
    label: "High Price (VND)",
    color: "#10b981", // Green
  },
  lowPrice: {
    label: "Low Price (VND)",
    color: "#ef4444", // Red
  },
  closePrice: {
    label: "Close Price (VND)",
    color: "#f59e0b", // Orange
  },
};

export function DailyOHLCChart({ data, code, loading, onRefresh }: DailyOHLCChartProps) {
  // Format data for chart
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      openPrice: Number(item.openPrice) || 0,
      highPrice: Number(item.highPrice) || 0,
      lowPrice: Number(item.lowPrice) || 0,
      closePrice: Number(item.closePrice) || 0,
    }));
  }, [data]);

  // Display all dates on X-axis (interval = 0 means show all labels)
  const xAxisInterval = 0;

  // Calculate Y-axis domain based on data min/max to make price lines more spread out
  // This will zoom in on the actual price range instead of starting from 0
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 'auto'];
    
    // Find min and max prices across all OHLC values
    const allPrices: number[] = [];
    chartData.forEach(item => {
      if (item.openPrice > 0) allPrices.push(item.openPrice);
      if (item.highPrice > 0) allPrices.push(item.highPrice);
      if (item.lowPrice > 0) allPrices.push(item.lowPrice);
      if (item.closePrice > 0) allPrices.push(item.closePrice);
    });
    
    if (allPrices.length === 0) return [0, 'auto'];
    
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    
    // Add 10% padding on top and bottom to make lines more visible
    const padding = priceRange * 0.1;
    const domainMin = Math.max(0, minPrice - padding);
    const domainMax = maxPrice + padding;
    
    // Round to nice numbers for better readability
    const roundToNearest = (value: number, roundTo: number) => {
      return Math.floor(value / roundTo) * roundTo;
    };
    
    // Round based on price range
    let roundValue = 1000; // Default rounding
    if (priceRange < 5000) roundValue = 100;
    else if (priceRange < 50000) roundValue = 1000;
    else if (priceRange < 500000) roundValue = 10000;
    else roundValue = 100000;
    
    return [
      roundToNearest(domainMin, roundValue),
      Math.ceil(domainMax / roundValue) * roundValue
    ];
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>
            {code ? `${code} - ` : ""}Price Over Time (OHLC)
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
          <div className="flex items-center justify-center h-[500px]">
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
            {code ? `${code} - ` : ""}Price Over Time (OHLC)
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
          <div className="flex items-center justify-center h-[500px] text-muted-foreground">
            No data available for the selected filters
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>
          {code ? `${code} - ` : ""}Price Over Time (OHLC)
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
        <ChartContainer config={chartConfig} className="h-[500px] w-full">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 40, left: 30, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={100}
              interval={xAxisInterval}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              domain={yAxisDomain}
              label={{ value: "Price (VND)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value: any, name: string, item: any) => {
                    const numValue = Number(value);
                    const formattedValue = numValue.toLocaleString('en-US', { 
                      useGrouping: true,
                      maximumFractionDigits: 0 
                    }).replace(/,/g, '.');
                    
                    // Map data key names and line names to display labels
                    const priceTypeLabels: Record<string, string> = {
                      'openPrice': 'Open Price',
                      'highPrice': 'High Price',
                      'lowPrice': 'Low Price',
                      'closePrice': 'Close Price',
                      'Open Price (VND)': 'Open Price',
                      'High Price (VND)': 'High Price',
                      'Low Price (VND)': 'Low Price',
                      'Close Price (VND)': 'Close Price',
                    };
                    
                    // Get the dataKey from item to determine price type
                    // item.dataKey contains the dataKey (e.g., "openPrice")
                    // name contains the line name (e.g., "Open Price (VND)")
                    const dataKey = item?.dataKey || name;
                    const priceType = priceTypeLabels[dataKey] || priceTypeLabels[name] || name;
                    
                    // Get color from the line for consistency
                    const color = item?.color || item?.stroke || '#000';
                    
                    return (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-foreground">
                          {priceType}:
                        </span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {formattedValue} (VND)
                        </span>
                      </div>
                    );
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="openPrice"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 7, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
              name="Open Price (VND)"
            />
            <Line
              type="monotone"
              dataKey="highPrice"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 7, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              name="High Price (VND)"
            />
            <Line
              type="monotone"
              dataKey="lowPrice"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 5, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 7, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
              name="Low Price (VND)"
            />
            <Line
              type="monotone"
              dataKey="closePrice"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 7, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
              name="Close Price (VND)"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

