package com.data.trade.dto;

import com.data.trade.model.TrackedStock;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackedStockWithMarketPriceDTO {
    private Long id;
    private String code;
    private Boolean active;
    private BigDecimal costBasis;
    private OffsetDateTime createdAt;
    
    // Market price data
    private BigDecimal marketPrice;
    private BigDecimal priceChangePercent; // Percentage change from cost basis
    
    public static TrackedStockWithMarketPriceDTO fromTrackedStock(TrackedStock stock, BigDecimal marketPrice) {
        TrackedStockWithMarketPriceDTO dto = TrackedStockWithMarketPriceDTO.builder()
                .id(stock.getId())
                .code(stock.getCode())
                .active(stock.getActive())
                .costBasis(stock.getCostBasis())
                .createdAt(stock.getCreatedAt())
                .marketPrice(marketPrice)
                .build();
        
        // Calculate price change percentage
        if (stock.getCostBasis() != null && marketPrice != null && stock.getCostBasis().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal change = marketPrice.subtract(stock.getCostBasis());
            BigDecimal percentChange = change.divide(stock.getCostBasis(), 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            dto.setPriceChangePercent(percentChange);
        }
        
        return dto;
    }
}

