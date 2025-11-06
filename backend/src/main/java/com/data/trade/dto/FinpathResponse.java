package com.data.trade.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinpathResponse {
    private DataNode data;

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DataNode {
        private List<TradeItem> trades;
        private Paging paging;
    }

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TradeItem {
        @JsonProperty("c")
        private String code;
        @JsonProperty("p")
        private BigDecimal price;
        @JsonProperty("v")
        private Long volume;
        @JsonProperty("s")
        private String side;
        @JsonProperty("t")
        private String time; // HH:mm:ss
        @JsonProperty("td")
        private String date; // dd/MM/yyyy
    }

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Paging {
        private int page;
        private int pageSize;
        private int total;
    }
}
