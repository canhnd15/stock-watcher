package com.data.trade.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePriceAlertRequest {
    @NotBlank(message = "Stock code is required")
    private String code;
    
    private BigDecimal reachPrice; // Alert when price reaches or exceeds this value
    
    private BigDecimal dropPrice; // Alert when price drops to or below this value
}

