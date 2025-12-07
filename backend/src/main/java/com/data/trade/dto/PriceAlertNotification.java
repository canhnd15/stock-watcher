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
public class PriceAlertNotification {
    private Long alertId;
    private String code;
    private BigDecimal currentPrice;
    private BigDecimal reachPrice;
    private BigDecimal dropPrice;
    private Long currentVolume;
    private Long reachVolume;
    private String alertType; // "REACH", "DROP", or "VOLUME_REACH"
    private OffsetDateTime timestamp;
    private String message;
}

