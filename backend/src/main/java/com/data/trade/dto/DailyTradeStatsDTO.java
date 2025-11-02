package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyTradeStatsDTO {
    private String date; // "DD/MM/YYYY" format
    private BigDecimal latestPrice; // Latest price of the day (from latest trade_time)
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private Long totalVolume; // Total volume in shares (will be converted to millions in frontend)
}

