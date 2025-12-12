package com.data.trade.service;

import com.data.trade.dto.FinpathResponse;
import com.data.trade.model.Trade;
import com.data.trade.model.TradeStaging;
import com.data.trade.repository.TradeRepository;
import com.data.trade.repository.TradeStagingRepository;
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
    private final TradeStagingRepository tradeStagingRepository;
    private final FinpathClient finpathClient;

    /**
     * Ingest data into staging table
     * This method is used by the new staging-based ingestion flow
     */
    @Transactional
    public void ingestForCodeToStaging(String code) {
        FinpathResponse response = finpathClient.fetchTrades(code, 1, 10000);
        if (response == null || response.getData() == null || response.getData().getTrades() == null) {
            log.error("Failed to fetch trades for code: {}", code);
            return;
        }

        List<TradeStaging> trades = response.getData().getTrades().stream()
                .map(t -> TradeStaging.builder()
                        .code(t.getCode())
                        .price(t.getPrice())
                        .volume(t.getVolume())
                        .side(t.getSide())
                        .tradeDate(t.getDate())  // Store as-is: "DD/MM/YYYY"
                        .tradeTime(t.getTime())  // Store as-is: "HH:mm:ss"
                        .build())
                .collect(Collectors.toList());

        try {
            // Save to staging table
            tradeStagingRepository.saveAll(trades);
            log.debug("Ingested {} trades for {} into staging", trades.size(), code);
        } catch (Exception ex) {
            log.error("Failed to save trades to staging for {}: {}", code, ex.getMessage(), ex);
            throw ex; // Re-throw to handle in job
        }
    }

    /**
     * Original method kept for backward compatibility (if needed)
     */
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
