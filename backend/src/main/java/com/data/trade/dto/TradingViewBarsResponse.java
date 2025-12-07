package com.data.trade.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TradingViewBarsResponse {
    private DataNode data;

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DataNode {
        private List<List<Number>> bars;
    }

    /**
     * Get market price from bars data
     * bars format: [open, high, low, close, volume, value]
     * Returns close price (index 3) as market price
     */
    public Double getMarketPrice() {
        if (data == null || data.getBars() == null || data.getBars().isEmpty()) {
            return null;
        }
        List<Number> firstBar = data.getBars().get(0);
        if (firstBar == null || firstBar.size() < 4) {
            return null;
        }
        // Return close price (index 3) as market price
        return firstBar.get(3).doubleValue();
    }
    
    /**
     * Get market volume from bars data
     * bars format: [open, high, low, close, volume, value]
     * Returns volume (index 4) as market volume
     */
    public Long getMarketVolume() {
        if (data == null || data.getBars() == null || data.getBars().isEmpty()) {
            return null;
        }
        List<Number> firstBar = data.getBars().get(0);
        if (firstBar == null || firstBar.size() < 5) {
            return null;
        }
        // Return volume (index 4) as market volume
        Number volume = firstBar.get(4);
        return volume != null ? volume.longValue() : null;
    }
}

