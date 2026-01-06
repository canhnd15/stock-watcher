package com.data.trade.dto;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RagIndexingRequest {
    
    @Pattern(regexp = "\\d{2}/\\d{2}/\\d{4}", message = "Trade date must be in DD/MM/YYYY format")
    private String tradeDate;
    
    private String fromDate;
    
    private String toDate;
    
    private Integer maxDays;
    
    private Integer batchSize;
}

