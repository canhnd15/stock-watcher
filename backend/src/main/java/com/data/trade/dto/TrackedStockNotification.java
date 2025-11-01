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
public class TrackedStockNotification {
    private String code;
    private String signalType; // BUY or SELL
    private int score;
    private String reason;
    private long buyVolume;
    private long sellVolume;
    private BigDecimal lastPrice;
    private double priceChange;
    private OffsetDateTime timestamp;
    private boolean isBigSignal; // score >= 6
}

