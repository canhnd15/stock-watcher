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
public class DailyOHLCDTO {
    private String code; // Stock code
    private String date; // "DD/MM/YYYY" format
    private BigDecimal openPrice; // First trade price of the day
    private BigDecimal highPrice; // Highest price of the day
    private BigDecimal lowPrice; // Lowest price of the day
    private BigDecimal closePrice; // Last trade price of the day
}

