package com.data.trade.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HighVolumeNotification {
    private String code;
    private String tradeDate;
    private long todayVolume;
    private long averageVolume;
    private double volumeRatio;       // todayVolume / averageVolume
    private int lookbackDays;         // how many days used for average
    private OffsetDateTime timestamp;
}
