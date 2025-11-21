package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefreshMarketPriceResponse {
    private String message;
    private int successCount;
    private int failedCount;
    private List<TrackedStockWithMarketPriceDTO> stocks;
}

