package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntradayPriceBatchResponse {
    private Map<String, List<IntradayPriceDTO>> data; // Map<stockCode, List<IntradayPriceDTO>>
}

