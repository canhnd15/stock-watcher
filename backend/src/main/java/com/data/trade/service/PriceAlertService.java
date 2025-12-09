package com.data.trade.service;

import com.data.trade.dto.PriceAlertDTO;
import com.data.trade.dto.PriceAlertCountsDTO;
import com.data.trade.dto.CreatePriceAlertRequest;
import com.data.trade.dto.UpdatePriceAlertRequest;
import com.data.trade.model.PriceAlert;
import com.data.trade.model.User;
import com.data.trade.repository.PriceAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceAlertService {

    private final PriceAlertRepository priceAlertRepository;
    private final FinpathClient finpathClient;
    private final PriceAlertNotificationService priceAlertNotificationService;

    /**
     * Get paginated price alerts for a specific user
     * @param userId The user ID
     * @param pageable Pagination parameters
     * @param active Optional filter for active status (null = all, true = active only, false = inactive only)
     */
    public Page<PriceAlertDTO> getAllPriceAlertsForUser(Long userId, Pageable pageable, Boolean active) {
        Page<PriceAlert> alertsPage;
        if (active != null) {
            alertsPage = priceAlertRepository.findAllByUserIdAndActive(userId, active, pageable);
        } else {
            alertsPage = priceAlertRepository.findAllByUserId(userId, pageable);
        }
        
        List<PriceAlert> alerts = alertsPage.getContent();
        
        // Group alerts by stock code to minimize API calls
        Set<String> uniqueCodes = alerts.stream()
                .map(PriceAlert::getCode)
                .collect(Collectors.toSet());
        
        // Fetch market data in parallel for all unique codes
        Map<String, MarketData> marketDataMap = new ConcurrentHashMap<>();
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        
        for (String code : uniqueCodes) {
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                MarketData marketData = getMarketData(code);
                marketDataMap.put(code, marketData);
            });
            futures.add(future);
        }
        
        // Wait for all market data fetches to complete
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        
        // Map alerts to DTOs using cached market data
        List<PriceAlertDTO> dtos = alerts.stream()
                .map(alert -> {
                    MarketData marketData = marketDataMap.get(alert.getCode());
                    return PriceAlertDTO.fromPriceAlertWithMarketData(
                            alert, 
                            marketData != null ? marketData.price : null,
                            marketData != null ? marketData.volume : null
                    );
                })
                .collect(Collectors.toList());
        
        return new PageImpl<>(dtos, pageable, alertsPage.getTotalElements());
    }
    
    /**
     * Helper class to store market price and volume together
     */
    private static class MarketData {
        final BigDecimal price;
        final Long volume;
        
        MarketData(BigDecimal price, Long volume) {
            this.price = price;
            this.volume = volume;
        }
    }
    
    /**
     * Get market data (price and volume) for a stock code in a single API call
     */
    private MarketData getMarketData(String code) {
        try {
            var response = finpathClient.fetchTradingViewBars(code);
            if (response != null) {
                Double price = response.getMarketPrice();
                Long volume = response.getMarketVolume();
                return new MarketData(
                        price != null ? BigDecimal.valueOf(price) : null,
                        volume
                );
            }
        } catch (Exception e) {
            log.debug("Failed to fetch market data for {}: {}", code, e.getMessage());
        }
        return new MarketData(null, null);
    }

    /**
     * Get market price for a stock code from TradingView API
     */
    private BigDecimal getMarketPrice(String code) {
        try {
            var response = finpathClient.fetchTradingViewBars(code);
            if (response != null) {
                Double price = response.getMarketPrice();
                if (price != null) {
                    return BigDecimal.valueOf(price);
                }
            }
        } catch (Exception e) {
            log.debug("Failed to fetch market price for {}: {}", code, e.getMessage());
        }
        return null;
    }
    
    /**
     * Get market volume for a stock code from TradingView API
     */
    private Long getMarketVolume(String code) {
        try {
            var response = finpathClient.fetchTradingViewBars(code);
            if (response != null) {
                return response.getMarketVolume();
            }
        } catch (Exception e) {
            log.debug("Failed to fetch market volume for {}: {}", code, e.getMessage());
        }
        return null;
    }

    /**
     * Create a new price alert
     */
    public PriceAlertDTO createPriceAlert(User user, CreatePriceAlertRequest request) {
        // Validate that at least one alert condition is provided
        if (request.getReachPrice() == null && request.getDropPrice() == null && request.getReachVolume() == null) {
            throw new IllegalArgumentException("At least one alert condition (price or volume) must be provided");
        }

        // Normalize code
        String code = request.getCode().toUpperCase();

        // Check if alert already exists for this user and code
        if (priceAlertRepository.existsByUserIdAndCode(user.getId(), code)) {
            throw new IllegalArgumentException("Price alert already exists for stock " + code);
        }

        PriceAlert alert = PriceAlert.builder()
                .user(user)
                .code(code)
                .reachPrice(request.getReachPrice())
                .dropPrice(request.getDropPrice())
                .reachVolume(request.getReachVolume())
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build();

        PriceAlert saved = priceAlertRepository.save(alert);
        MarketData marketData = getMarketData(saved.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketData(saved, marketData.price, marketData.volume);
    }

    /**
     * Update an existing price alert
     */
    public PriceAlertDTO updatePriceAlert(Long alertId, User user, UpdatePriceAlertRequest request) {
        PriceAlert alert = priceAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Price alert not found"));

        // Verify ownership
        if (!alert.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Access denied");
        }

        // Validate that at least one alert condition is provided after update
        BigDecimal finalReachPrice = request.getReachPrice() != null ? request.getReachPrice() : alert.getReachPrice();
        BigDecimal finalDropPrice = request.getDropPrice() != null ? request.getDropPrice() : alert.getDropPrice();
        Long finalReachVolume = request.getReachVolume() != null ? request.getReachVolume() : alert.getReachVolume();
        
        if (finalReachPrice == null && finalDropPrice == null && finalReachVolume == null) {
            throw new IllegalArgumentException("At least one alert condition (price or volume) must be provided");
        }

        // Update fields if provided
        if (request.getCode() != null) {
            String code = request.getCode().toUpperCase();
            if (!alert.getCode().equals(code)) {
                // Check if new code already exists for this user
                if (priceAlertRepository.existsByUserIdAndCode(user.getId(), code)) {
                    throw new IllegalArgumentException("Price alert already exists for stock " + code);
                }
                alert.setCode(code);
            }
        }
        if (request.getReachPrice() != null) {
            alert.setReachPrice(request.getReachPrice());
        }
        if (request.getDropPrice() != null) {
            alert.setDropPrice(request.getDropPrice());
        }
        if (request.getReachVolume() != null) {
            alert.setReachVolume(request.getReachVolume());
        }
        if (request.getActive() != null) {
            alert.setActive(request.getActive());
        }

        PriceAlert updated = priceAlertRepository.save(alert);
        
        // Clear notification cooldown when alert is updated
        priceAlertNotificationService.clearNotificationCooldown(alert.getId());
        
        MarketData marketData = getMarketData(updated.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketData(updated, marketData.price, marketData.volume);
    }

    /**
     * Delete a price alert
     */
    public void deletePriceAlert(Long alertId, User user) {
        PriceAlert alert = priceAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Price alert not found"));

        // Verify ownership
        if (!alert.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Access denied");
        }

        // Clear notification cooldown when alert is deleted
        priceAlertNotificationService.clearNotificationCooldown(alertId);
        
        priceAlertRepository.delete(alert);
    }

    /**
     * Toggle active status of a price alert
     */
    public PriceAlertDTO togglePriceAlert(Long alertId, User user) {
        PriceAlert alert = priceAlertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Price alert not found"));

        // Verify ownership
        if (!alert.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Access denied");
        }

        alert.setActive(!alert.getActive());
        PriceAlert updated = priceAlertRepository.save(alert);
        
        // Clear notification cooldown when alert is toggled
        priceAlertNotificationService.clearNotificationCooldown(alert.getId());
        
        MarketData marketData = getMarketData(updated.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketData(updated, marketData.price, marketData.volume);
    }

    /**
     * Get all active price alerts (for checking)
     */
    public List<PriceAlert> getAllActivePriceAlerts() {
        return priceAlertRepository.findAllByActiveTrue();
    }
    
    /**
     * Get counts of price alerts for a specific user (total, active, inactive)
     */
    public PriceAlertCountsDTO getPriceAlertCounts(Long userId) {
        long totalCount = priceAlertRepository.countByUserId(userId);
        long activeCount = priceAlertRepository.countByUserIdAndActive(userId, true);
        long inactiveCount = priceAlertRepository.countByUserIdAndActive(userId, false);
        
        return PriceAlertCountsDTO.builder()
                .totalCount(totalCount)
                .activeCount(activeCount)
                .inactiveCount(inactiveCount)
                .build();
    }
}

