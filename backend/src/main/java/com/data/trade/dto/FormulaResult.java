package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result from a single formula calculation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormulaResult {
    private String formulaName; // "VolumePriceMomentum", "MACrossover", "RSI", "TrendStrength"
    private double score; // -100 to +100
    private String vote; // "BUY", "SELL", "NEUTRAL"
    private double confidence; // 0.0 to 1.0
    private String reason; // Explanation of the result
}



