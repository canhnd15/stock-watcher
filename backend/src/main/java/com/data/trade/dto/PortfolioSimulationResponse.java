package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response DTO for portfolio simulation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioSimulationResponse {
    
    private List<SimulatedStockResult> stocks;
    
    private BigDecimal totalProfit;
    
    private BigDecimal totalCostBasis;
    
    private BigDecimal totalCurrentValue;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulatedStockResult {
        private String code;
        private BigDecimal costBasis;
        private Long volume;
        private BigDecimal targetPrice;
        private BigDecimal marketPrice;
        private BigDecimal profit;
        private BigDecimal profitPercent;
        private BigDecimal currentValue;
        private BigDecimal targetProfit; // Profit at target price: (targetPrice - costBasis) * volume
        private String error; // Error message if market price fetch failed
    }
}

