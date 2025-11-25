package com.data.trade.dto;

import com.data.trade.model.Trade;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradePageResponse {
    private Page<Trade> trades;
    private Long totalVolume;
    private Long buyVolume;
    private Long sellVolume;
    private Long unknownVolume;
    private int totalRecords;
    private Long buyCount;
    private Long sellCount;
    private Long unknownCount;
}

