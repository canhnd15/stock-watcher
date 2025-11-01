package com.data.trade.service;

import com.data.trade.dto.TradePageResponse;
import com.data.trade.model.Trade;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TradeService {

    private final TradeRepository tradeRepository;
    private final TradeIngestionService ingestionService;

    @Value("${market.vn30.codes}")
    private List<String> vn30;

    public TradePageResponse findTrades(Specification<Trade> spec, Pageable pageable) {
        // Get paginated results
        Page<Trade> tradesPage = tradeRepository.findAll(spec, pageable);
        
        // Calculate volume statistics from all matching records (not just the current page)
        List<Trade> allMatchingTrades = tradeRepository.findAll(spec);
        
        long totalVolume = allMatchingTrades.stream()
                .mapToLong(Trade::getVolume)
                .sum();
        
        long buyVolume = allMatchingTrades.stream()
                .filter(t -> "buy".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();
        
        long sellVolume = allMatchingTrades.stream()
                .filter(t -> "sell".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();

        long buyCount = allMatchingTrades.stream()
                .filter(t -> "buy".equalsIgnoreCase(t.getSide()))
                .count();
        
        long sellCount = allMatchingTrades.stream()
                .filter(t -> "sell".equalsIgnoreCase(t.getSide()))
                .count();
        
        return TradePageResponse.builder()
                .trades(tradesPage)
                .totalVolume(totalVolume)
                .buyVolume(buyVolume)
                .sellVolume(sellVolume)
                .totalRecords(allMatchingTrades.size())
                .buyCount(buyCount)
                .sellCount(sellCount)
                .build();
    }

    public void ingestForCode(String code) {
        String normalized = code.trim().toUpperCase();
        ingestionService.ingestForCode(normalized);
    }

    public void ingestAllVn30() {
        for (String stockCode : vn30) {
            ingestionService.ingestForCode(stockCode);
        }
    }

    public String getRecommendation(String code, LocalDate date) {
        String normalized = code.trim().toUpperCase();
        LocalDate tradeDate = (date == null) ? LocalDate.now() : date;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String tradeDateStr = tradeDate.format(formatter);
        String rec = tradeRepository.recommendationFor(normalized, tradeDateStr);
        return (rec == null) ? "Neutral — hold" : rec;
    }

    public void reingestForCode(String code) {
        String normalized = code.trim().toUpperCase();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String todayStr = today.format(formatter);
        tradeRepository.deleteForCodeOnDate(normalized, todayStr);
        ingestionService.ingestForCode(normalized);
    }

    public List<Trade> findAllTrades(Specification<Trade> spec) {
        return tradeRepository.findAll(spec);
    }
}

