package com.data.trade.service;

import com.data.trade.dto.SignalNotification;
import com.data.trade.model.ShortTermTrackedStock;
import com.data.trade.model.TrackedStock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataChunkingService {

    private static final DecimalFormat PRICE_FORMAT = new DecimalFormat("#,###");
    private static final DecimalFormat VOLUME_FORMAT = new DecimalFormat("#,###");

    /**
     * Create a text chunk for trade data (daily summary for a stock)
     * 
     * @param code Stock code
     * @param tradeDate Trade date in DD/MM/YYYY format
     * @param buyVolume Total buy volume
     * @param sellVolume Total sell volume
     * @param lowPrice Lowest price
     * @param highPrice Highest price
     * @param openPrice Opening price
     * @param closePrice Closing price
     * @param largeBuyBlocks Count of large buy blocks (>= 400k)
     * @param largeSellBlocks Count of large sell blocks (>= 400k)
     * @param mediumBuyBlocks Count of medium buy blocks (100k-400k)
     * @param mediumSellBlocks Count of medium sell blocks (100k-400k)
     * @return Text chunk describing the trade data
     */
    public String createTradeChunk(
            String code,
            String tradeDate,
            Long buyVolume,
            Long sellVolume,
            BigDecimal lowPrice,
            BigDecimal highPrice,
            BigDecimal openPrice,
            BigDecimal closePrice,
            Long largeBuyBlocks,
            Long largeSellBlocks,
            Long mediumBuyBlocks,
            Long mediumSellBlocks) {
        
        StringBuilder chunk = new StringBuilder();
        chunk.append("Stock ").append(code).append(" on ").append(tradeDate).append(": ");
        chunk.append("Buy volume: ").append(formatVolume(buyVolume));
        chunk.append(", Sell volume: ").append(formatVolume(sellVolume));
        
        if (openPrice != null && closePrice != null) {
            chunk.append(". Price: Open ").append(formatPrice(openPrice));
            chunk.append(", Close ").append(formatPrice(closePrice));
        }
        
        if (lowPrice != null && highPrice != null) {
            chunk.append(", Range ").append(formatPrice(lowPrice));
            chunk.append("-").append(formatPrice(highPrice));
        }
        
        if (largeBuyBlocks != null && largeBuyBlocks > 0) {
            chunk.append(". Large buy blocks (>=400k): ").append(largeBuyBlocks);
        }
        if (largeSellBlocks != null && largeSellBlocks > 0) {
            chunk.append(", Large sell blocks (>=400k): ").append(largeSellBlocks);
        }
        if (mediumBuyBlocks != null && mediumBuyBlocks > 0) {
            chunk.append(". Medium buy blocks (100k-400k): ").append(mediumBuyBlocks);
        }
        if (mediumSellBlocks != null && mediumSellBlocks > 0) {
            chunk.append(", Medium sell blocks (100k-400k): ").append(mediumSellBlocks);
        }
        
        // Calculate price change if we have open and close
        if (openPrice != null && closePrice != null && openPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal change = closePrice.subtract(openPrice)
                .divide(openPrice, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
            chunk.append(". Price change: ").append(change.setScale(2, RoundingMode.HALF_UP)).append("%");
        }
        
        chunk.append(".");
        
        return chunk.toString();
    }

    /**
     * Create a text chunk for tracked stock
     * 
     * @param trackedStock Tracked stock entity
     * @return Text chunk describing the tracked stock
     */
    public String createTrackedStockChunk(TrackedStock trackedStock) {
        StringBuilder chunk = new StringBuilder();
        chunk.append("User tracking stock ").append(trackedStock.getCode());
        
        if (trackedStock.getCostBasis() != null) {
            chunk.append(" with cost basis ").append(formatPrice(trackedStock.getCostBasis()));
        }
        
        if (trackedStock.getVolume() != null) {
            chunk.append(", volume ").append(formatVolume(trackedStock.getVolume()));
        }
        
        if (trackedStock.getTargetPrice() != null) {
            chunk.append(", target price ").append(formatPrice(trackedStock.getTargetPrice()));
        }
        
        chunk.append(".");
        
        return chunk.toString();
    }

    /**
     * Create a text chunk for signal notification
     * 
     * @param signal Signal notification DTO
     * @return Text chunk describing the signal
     */
    public String createSignalChunk(SignalNotification signal) {
        StringBuilder chunk = new StringBuilder();
        chunk.append(signal.getSignalType()).append(" signal for ").append(signal.getCode());
        
        if (signal.getTimestamp() != null) {
            chunk.append(" on ").append(signal.getTimestamp().toString());
        }
        
        chunk.append(" with score ").append(signal.getScore());
        
        if (signal.getReason() != null && !signal.getReason().isEmpty()) {
            chunk.append(". Reason: ").append(signal.getReason());
        }
        
        if (signal.getLastPrice() != null) {
            chunk.append(". Price: ").append(formatPrice(signal.getLastPrice()));
        }
        
        if (signal.getPriceChange() != 0) {
            chunk.append(", change: ").append(String.format("%.2f", signal.getPriceChange())).append("%");
        }
        
        if (signal.getBuyVolume() != null) {
            chunk.append(". Buy volume: ").append(formatVolume(signal.getBuyVolume()));
        }
        
        if (signal.getSellVolume() != null) {
            chunk.append(", Sell volume: ").append(formatVolume(signal.getSellVolume()));
        }
        
        chunk.append(".");
        
        return chunk.toString();
    }

    /**
     * Create a text chunk for OHLC statistics (last 10 days summary)
     * 
     * @param code Stock code
     * @param stats List of daily stats: [trade_date, close_price, open_price, high_price, low_price,
     *              buy_volume, sell_volume, total_volume, large_buy_blocks, large_sell_blocks,
     *              medium_buy_blocks, medium_sell_blocks]
     * @return Text chunk describing the OHLC statistics
     */
    public String createOHLCChunk(String code, List<Object[]> stats) {
        if (stats == null || stats.isEmpty()) {
            return "Stock " + code + " last 10 days: No data available.";
        }
        
        StringBuilder chunk = new StringBuilder();
        chunk.append("Stock ").append(code).append(" last 10 days summary: ");
        
        // Calculate averages
        BigDecimal totalOpen = BigDecimal.ZERO;
        BigDecimal totalHigh = BigDecimal.ZERO;
        BigDecimal totalLow = BigDecimal.ZERO;
        BigDecimal totalClose = BigDecimal.ZERO;
        long totalBuyVolume = 0;
        long totalSellVolume = 0;
        int count = 0;
        
        for (Object[] stat : stats) {
            if (stat.length >= 9) {
                BigDecimal openPrice = getBigDecimal(stat, 2);
                BigDecimal highPrice = getBigDecimal(stat, 3);
                BigDecimal lowPrice = getBigDecimal(stat, 4);
                BigDecimal closePrice = getBigDecimal(stat, 1);
                Long buyVolume = getLong(stat, 5);
                Long sellVolume = getLong(stat, 6);
                
                if (openPrice != null) totalOpen = totalOpen.add(openPrice);
                if (highPrice != null) totalHigh = totalHigh.add(highPrice);
                if (lowPrice != null) totalLow = totalLow.add(lowPrice);
                if (closePrice != null) totalClose = totalClose.add(closePrice);
                if (buyVolume != null) totalBuyVolume += buyVolume;
                if (sellVolume != null) totalSellVolume += sellVolume;
                count++;
            }
        }
        
        if (count > 0) {
            BigDecimal avgOpen = totalOpen.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            BigDecimal avgHigh = totalHigh.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            BigDecimal avgLow = totalLow.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            BigDecimal avgClose = totalClose.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            long avgBuyVolume = totalBuyVolume / count;
            long avgSellVolume = totalSellVolume / count;
            
            chunk.append("Average Open: ").append(formatPrice(avgOpen));
            chunk.append(", High: ").append(formatPrice(avgHigh));
            chunk.append(", Low: ").append(formatPrice(avgLow));
            chunk.append(", Close: ").append(formatPrice(avgClose));
            chunk.append(". Average buy volume: ").append(formatVolume(avgBuyVolume));
            chunk.append(", average sell volume: ").append(formatVolume(avgSellVolume));
            chunk.append(".");
        }
        
        return chunk.toString();
    }

    /**
     * Create metadata map for trade chunk
     */
    public Map<String, Object> createTradeMetadata(String code, String tradeDate) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("source", "trades");
        metadata.put("code", code);
        metadata.put("trade_date", tradeDate);
        metadata.put("type", "daily_summary");
        return metadata;
    }

    /**
     * Create a text chunk for short-term tracked stock
     * 
     * @param shortTermTrackedStock Short-term tracked stock entity
     * @return Text chunk describing the short-term tracked stock
     */
    public String createShortTermTrackedStockChunk(ShortTermTrackedStock shortTermTrackedStock) {
        StringBuilder chunk = new StringBuilder();
        chunk.append("User tracking stock ").append(shortTermTrackedStock.getCode()).append(" (short-term)");
        
        if (shortTermTrackedStock.getCostBasis() != null) {
            chunk.append(" with cost basis ").append(formatPrice(shortTermTrackedStock.getCostBasis()));
        }
        
        if (shortTermTrackedStock.getVolume() != null) {
            chunk.append(", volume ").append(formatVolume(shortTermTrackedStock.getVolume()));
        }
        
        if (shortTermTrackedStock.getTargetPrice() != null) {
            chunk.append(", target price ").append(formatPrice(shortTermTrackedStock.getTargetPrice()));
        }
        
        chunk.append(".");
        
        return chunk.toString();
    }

    /**
     * Create metadata map for tracked stock chunk
     */
    public Map<String, Object> createTrackedStockMetadata(TrackedStock trackedStock) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("source", "tracked_stocks");
        metadata.put("code", trackedStock.getCode());
        metadata.put("user_id", trackedStock.getUser().getId());
        return metadata;
    }

    /**
     * Create metadata map for short-term tracked stock chunk
     */
    public Map<String, Object> createShortTermTrackedStockMetadata(ShortTermTrackedStock shortTermTrackedStock) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("source", "short_term_tracked_stocks");
        metadata.put("code", shortTermTrackedStock.getCode());
        metadata.put("user_id", shortTermTrackedStock.getUser().getId());
        return metadata;
    }

    /**
     * Create metadata map for signal chunk
     */
    public Map<String, Object> createSignalMetadata(SignalNotification signal) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("source", "signals");
        metadata.put("code", signal.getCode());
        if (signal.getTimestamp() != null) {
            metadata.put("timestamp", signal.getTimestamp().toString());
        }
        return metadata;
    }

    /**
     * Create metadata map for OHLC chunk
     */
    public Map<String, Object> createOHLCMetadata(String code) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("source", "ohlc");
        metadata.put("code", code);
        metadata.put("date_range", "last_10_days");
        return metadata;
    }

    private String formatPrice(BigDecimal price) {
        if (price == null) return "N/A";
        return PRICE_FORMAT.format(price);
    }

    private String formatVolume(Long volume) {
        if (volume == null) return "0";
        return VOLUME_FORMAT.format(volume);
    }

    private BigDecimal getBigDecimal(Object[] array, int index) {
        if (array == null || index >= array.length || array[index] == null) {
            return null;
        }
        Object value = array[index];
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        return null;
    }

    private Long getLong(Object[] array, int index) {
        if (array == null || index >= array.length || array[index] == null) {
            return null;
        }
        Object value = array[index];
        if (value instanceof Long) {
            return (Long) value;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return null;
    }
}

