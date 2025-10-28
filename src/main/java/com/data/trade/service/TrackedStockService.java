package com.data.trade.service;

import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TrackedStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TrackedStockService {

    private final TrackedStockRepository trackedStockRepository;

    @Value("${market.vn30.codes}")
    private List<String> vn30Codes;

    public List<TrackedStock> getAllTrackedStocks() {
        return trackedStockRepository.findAll();
    }

    public List<String> getVn30Codes() {
        return vn30Codes;
    }

    public void upsertStocks(List<String> codes) {
        for (String code : codes) {
            String normalizedCode = code.trim().toUpperCase();
            TrackedStock stock = trackedStockRepository.findAll().stream()
                    .filter(x -> x.getCode().equalsIgnoreCase(normalizedCode))
                    .findFirst()
                    .orElse(TrackedStock.builder()
                            .code(normalizedCode)
                            .active(true)
                            .build());
            stock.setActive(true);
            trackedStockRepository.save(stock);
        }
    }

    public TrackedStock setActive(String code, boolean active) {
        String normalizedCode = code.trim().toUpperCase();
        TrackedStock stock = trackedStockRepository.findAll().stream()
                .filter(x -> x.getCode().equalsIgnoreCase(normalizedCode))
                .findFirst()
                .orElse(TrackedStock.builder()
                        .code(normalizedCode)
                        .active(active)
                        .build());
        stock.setActive(active);
        return trackedStockRepository.save(stock);
    }

    public boolean deleteStock(String code) {
        String normalizedCode = code.trim().toUpperCase();
        Optional<TrackedStock> stock = trackedStockRepository.findAll().stream()
                .filter(x -> x.getCode().equalsIgnoreCase(normalizedCode))
                .findFirst();
        
        if (stock.isPresent()) {
            trackedStockRepository.delete(stock.get());
            return true;
        }
        
        return false;
    }
}

