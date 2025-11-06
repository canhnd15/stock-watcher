package com.data.trade.dto;

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
public class TrackedStockStatsDTO {
    private String code;
    private BigDecimal lowestPriceBuy;
    private BigDecimal highestPriceBuy;
    private BigDecimal lowestPriceSell;
    private BigDecimal highestPriceSell;
    private Long largestVolumeBuy;
    private Long largestVolumeSell;
    private OffsetDateTime lastUpdated;
}

