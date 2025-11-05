package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Final recommendation result for a stock
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResult {
    private String code;
    private String action; // "buy", "sell", "hold"
    private String strength; // "strong", "moderate", "weak", "neutral"
    private double confidence; // 0.0 to 1.0
    private BigDecimal currentPrice;
    private BigDecimal targetPrice;
    private double score; // Combined score (-100 to +100)
    private double consensus; // Formula agreement level
    private int buyVotes;
    private int sellVotes;
    private String reason; // Detailed explanation
    private Long volume24h; // 24-hour volume
}



