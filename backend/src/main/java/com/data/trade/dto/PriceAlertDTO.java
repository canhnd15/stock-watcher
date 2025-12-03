package com.data.trade.dto;

import com.data.trade.model.PriceAlert;
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
public class PriceAlertDTO {
    private Long id;
    private String code;
    private BigDecimal reachPrice;
    private BigDecimal dropPrice;
    private Boolean active;
    private OffsetDateTime createdAt;
    
    // Market price data (optional, populated when fetching alerts)
    private BigDecimal marketPrice;
    
    public static PriceAlertDTO fromPriceAlert(PriceAlert alert) {
        return PriceAlertDTO.builder()
                .id(alert.getId())
                .code(alert.getCode())
                .reachPrice(alert.getReachPrice())
                .dropPrice(alert.getDropPrice())
                .active(alert.getActive())
                .createdAt(alert.getCreatedAt())
                .build();
    }
    
    public static PriceAlertDTO fromPriceAlertWithMarketPrice(PriceAlert alert, BigDecimal marketPrice) {
        PriceAlertDTO dto = fromPriceAlert(alert);
        dto.setMarketPrice(marketPrice);
        return dto;
    }
}

