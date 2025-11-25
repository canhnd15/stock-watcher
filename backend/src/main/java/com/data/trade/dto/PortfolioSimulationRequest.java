package com.data.trade.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for portfolio simulation
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioSimulationRequest {
    
    @NotEmpty(message = "Stocks list cannot be empty")
    @Valid
    private List<SimulatedStock> stocks;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulatedStock {
        @NotEmpty(message = "Stock code is required")
        private String code;
        
        private BigDecimal costBasis; // Purchase price
        
        private Long volume; // Number of shares
        
        private BigDecimal targetPrice; // Target price for profit calculation
    }
}

