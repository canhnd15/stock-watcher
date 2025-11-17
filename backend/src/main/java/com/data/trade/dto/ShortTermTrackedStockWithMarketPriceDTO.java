package com.data.trade.dto;

import com.data.trade.model.ShortTermTrackedStock;
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
public class ShortTermTrackedStockWithMarketPriceDTO {
    private Long id;
    private String code;
    private Boolean active;
    private BigDecimal costBasis;
    private Long volume; // Volume for profit calculation
    private BigDecimal targetPrice; // Target price for profit calculation
    private OffsetDateTime createdAt;
    
    // Market price data
    private BigDecimal marketPrice;
    private BigDecimal priceChangePercent; // Percentage change from cost basis
    
    // Target profit calculation
    private BigDecimal targetProfit; // Profit at target price: (targetPrice - costBasis) * volume
    
    public static ShortTermTrackedStockWithMarketPriceDTO fromShortTermTrackedStock(ShortTermTrackedStock stock, BigDecimal marketPrice) {
        ShortTermTrackedStockWithMarketPriceDTO dto = ShortTermTrackedStockWithMarketPriceDTO.builder()
                .id(stock.getId())
                .code(stock.getCode())
                .active(stock.getActive())
                .costBasis(stock.getCostBasis())
                .volume(stock.getVolume())
                .targetPrice(stock.getTargetPrice())
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
        
        // Calculate target profit: (targetPrice - costBasis) * volume
        if (stock.getTargetPrice() != null && stock.getCostBasis() != null && stock.getVolume() != null && stock.getVolume() > 0) {
            BigDecimal profit = stock.getTargetPrice().subtract(stock.getCostBasis())
                    .multiply(BigDecimal.valueOf(stock.getVolume()));
            dto.setTargetProfit(profit);
        }
        
        return dto;
    }
}

