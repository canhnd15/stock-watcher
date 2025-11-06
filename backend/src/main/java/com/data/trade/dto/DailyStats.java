package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Daily aggregated statistics for a stock
 * Used for 10-day analysis
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyStats {
    private String tradeDate; // Format: "DD/MM/YYYY"
    private BigDecimal closePrice; // Latest price of the day
    private BigDecimal openPrice; // First price of the day
    private BigDecimal highPrice; // Highest price of the day
    private BigDecimal lowPrice; // Lowest price of the day
    private Long buyVolume; // Total buy volume
    private Long sellVolume; // Total sell volume
    private Long totalVolume; // Total volume
    private Long largeBuyBlocks; // Count of buy blocks >= 400k
    private Long largeSellBlocks; // Count of sell blocks >= 400k
    private Long mediumBuyBlocks; // Count of buy blocks >= 100k
    private Long mediumSellBlocks; // Count of sell blocks >= 100k
}



