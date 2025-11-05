package com.data.trade.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class RoombarResponse {
    @JsonProperty("data")
    private RoombarData data;

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RoombarData {
        @JsonProperty("bars")
        private List<Roombar> bars;
    }

    @lombok.Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Roombar {
        private String code;
        @JsonProperty("buyVal")
        private Long buyVal;
        @JsonProperty("sellVal")
        private Long sellVal;
        @JsonProperty("netVal")
        private Long netVal;
        @JsonProperty("buyVol")
        private Long buyVol;
        @JsonProperty("sellVol")
        private Long sellVol;
        @JsonProperty("netVol")
        private Long netVol;
        private String timeframe;
        private String time;
    }
}

