package com.data.trade.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntradayPriceBatchRequest {
    @NotEmpty(message = "Codes list cannot be empty")
    private List<String> codes;
    
    private LocalDate date; // Optional: if null, use current date
}

