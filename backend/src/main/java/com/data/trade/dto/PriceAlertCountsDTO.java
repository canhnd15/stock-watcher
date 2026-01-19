package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceAlertCountsDTO {
    private Long totalCount;
    private Long activeCount;
    private Long inactiveCount;
}

