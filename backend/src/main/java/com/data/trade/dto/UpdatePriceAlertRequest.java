package com.data.trade.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdatePriceAlertRequest {
    private String code;
    private BigDecimal reachPrice;
    private BigDecimal dropPrice;
    private Long reachVolume;
    private Boolean active;
}

