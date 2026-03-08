package com.data.trade.service;

import com.data.trade.model.MarketCode;
import com.data.trade.repository.MarketCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MarketCodeService {

    private final MarketCodeRepository marketCodeRepository;

    public List<String> getActiveCodes() {
        return marketCodeRepository.findAllByActiveTrueOrderByCodeAsc().stream()
                .map(MarketCode::getCode)
                .collect(Collectors.toList());
    }

    public List<MarketCode> getAllCodes() {
        return marketCodeRepository.findAllByOrderByCodeAsc();
    }

    @Transactional
    public MarketCode addCode(String code) {
        String normalized = code.trim().toUpperCase();
        if (marketCodeRepository.existsByCode(normalized)) {
            return marketCodeRepository.findByCode(normalized)
                    .map(existing -> {
                        existing.setActive(true);
                        return marketCodeRepository.save(existing);
                    })
                    .orElseThrow();
        }
        MarketCode marketCode = MarketCode.builder()
                .code(normalized)
                .active(true)
                .build();
        return marketCodeRepository.save(marketCode);
    }

    @Transactional
    public void deleteCode(String code) {
        String normalized = code.trim().toUpperCase();
        marketCodeRepository.findByCode(normalized)
                .ifPresent(marketCodeRepository::delete);
    }
}
