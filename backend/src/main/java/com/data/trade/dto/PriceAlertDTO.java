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
    private Long reachVolume;
    private Boolean active;
    private OffsetDateTime createdAt;
    
    // Market price data (optional, populated when fetching alerts)
    private BigDecimal marketPrice;
    
    // Market volume data (optional, populated when fetching alerts)
    private Long marketVolume;
    
    public static PriceAlertDTO fromPriceAlert(PriceAlert alert) {
        return PriceAlertDTO.builder()
                .id(alert.getId())
                .code(alert.getCode())
                .reachPrice(alert.getReachPrice())
                .dropPrice(alert.getDropPrice())
                .reachVolume(alert.getReachVolume())
                .active(alert.getActive())
                .createdAt(alert.getCreatedAt())
                .build();
    }
    
    public static PriceAlertDTO fromPriceAlertWithMarketPrice(PriceAlert alert, BigDecimal marketPrice) {
        PriceAlertDTO dto = fromPriceAlert(alert);
        dto.setMarketPrice(marketPrice);
        return dto;
    }
    
    public static PriceAlertDTO fromPriceAlertWithMarketData(PriceAlert alert, BigDecimal marketPrice, Long marketVolume) {
        PriceAlertDTO dto = fromPriceAlert(alert);
        dto.setMarketPrice(marketPrice);
        dto.setMarketVolume(marketVolume);
        return dto;
    }
}

