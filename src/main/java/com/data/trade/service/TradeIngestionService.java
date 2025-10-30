package com.data.trade.service;

import com.data.trade.dto.FinpathResponse;
import com.data.trade.model.Trade;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeIngestionService {

    private final TradeRepository tradeRepository;
    private final FinpathClient finpathClient;

    @Transactional
    public void ingestForCode(String code) {
        FinpathResponse response = finpathClient.fetchTrades(code, 1, 10000);
        if (response == null || response.getData() == null || response.getData().getTrades() == null) {
            log.error("error");
            return;
        }

        List<Trade> trades = response.getData().getTrades().stream()
                .map(t -> Trade.builder()
                        .code(t.getCode())
                        .price(t.getPrice())
                        .volume(t.getVolume())
                        .side(t.getSide())
                        .tradeDate(t.getDate())  // Store as-is: "DD/MM/YYYY"
                        .tradeTime(t.getTime())  // Store as-is: "HH:mm:ss"
                        .build())
                .collect(Collectors.toList());

        try {
            tradeRepository.saveAll(trades);
        } catch (Exception ex) {
            log.error("Failed to save trades: {}", ex.getMessage(), ex);
        }
    }
}
