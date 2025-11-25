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
public class IntradayPriceDTO {
    private String time; // Format: "HH:mm" (e.g., "09:30", "09:40", "09:50")
    private BigDecimal averagePrice; // Average price for the 10-minute interval
    private BigDecimal highestPrice; // Highest price in the interval
    private BigDecimal lowestPrice; // Lowest price in the interval
    private Long totalVolume; // Total volume in the interval
}

