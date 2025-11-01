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
public class SignalNotification {
    private String code;
    private String signalType; // "BUY" or "SELL"
    private String reason;
    private Long buyVolume;
    private Long sellVolume;
    private BigDecimal lastPrice;
    private OffsetDateTime timestamp;
    private int score; // Signal strength score
    private double priceChange; // Price change percentage
}

