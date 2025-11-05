package com.data.trade.service;

import com.data.trade.dto.FinpathResponse;
import com.data.trade.dto.RoombarResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class FinpathClient {

    private final WebClient webClient;
    private final int defaultPageSize;

    public FinpathClient(WebClient webClient, @Value("${app.finpath.page-size:10000}") int defaultPageSize) {
        this.webClient = webClient;
        this.defaultPageSize = defaultPageSize;
    }

    public FinpathResponse fetchTrades(String code, int page, Integer pageSizeOverride) {
        int pageSize = pageSizeOverride != null ? pageSizeOverride : defaultPageSize;
        String path = "/api/stocks/v2/trades/" + code;
        return webClient.get()
                .uri(uriBuilder -> uriBuilder.path(path)
                        .queryParam("page", page)
                        .queryParam("pageSize", pageSize)
                        .build())
                .retrieve()
                .bodyToMono(FinpathResponse.class)
                .block();
    }

    public RoombarResponse fetchRoombars(String code, String type) {
        String path = "/api/stocks/roombars/" + code;
        return webClient.get()
                .uri(uriBuilder -> uriBuilder.path(path)
                        .queryParam("type", type != null ? type : "10day")
                        .build())
                .retrieve()
                .bodyToMono(RoombarResponse.class)
                .block();
    }
}
