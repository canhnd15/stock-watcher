package com.data.trade.service;

import com.data.trade.dto.PriceAlertDTO;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceAlertService {

    private final PriceAlertRepository priceAlertRepository;
    private final FinpathClient finpathClient;
    private final PriceAlertNotificationService priceAlertNotificationService;

    /**
     * Get all price alerts for a specific user
     */
    public List<PriceAlertDTO> getAllPriceAlertsForUser(Long userId) {
        List<PriceAlert> alerts = priceAlertRepository.findAllByUserId(userId);
        
        return alerts.stream()
                .map(alert -> {
                    BigDecimal marketPrice = getMarketPrice(alert.getCode());
                    Long marketVolume = getMarketVolume(alert.getCode());
                    return PriceAlertDTO.fromPriceAlertWithMarketData(alert, marketPrice, marketVolume);
                })
                .collect(Collectors.toList());
    }

    /**
     * Get paginated price alerts for a specific user
     */
    public Page<PriceAlertDTO> getAllPriceAlertsForUser(Long userId, Pageable pageable) {
        Page<PriceAlert> alertsPage = priceAlertRepository.findAllByUserId(userId, pageable);
        
        List<PriceAlertDTO> dtos = alertsPage.getContent().stream()
                .map(alert -> {
                    BigDecimal marketPrice = getMarketPrice(alert.getCode());
                    Long marketVolume = getMarketVolume(alert.getCode());
                    return PriceAlertDTO.fromPriceAlertWithMarketData(alert, marketPrice, marketVolume);
                })
                .collect(Collectors.toList());
        
        return new PageImpl<>(dtos, pageable, alertsPage.getTotalElements());
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
        BigDecimal marketPrice = getMarketPrice(saved.getCode());
        Long marketVolume = getMarketVolume(saved.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketData(saved, marketPrice, marketVolume);
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
        
        BigDecimal marketPrice = getMarketPrice(updated.getCode());
        Long marketVolume = getMarketVolume(updated.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketData(updated, marketPrice, marketVolume);
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
        
        BigDecimal marketPrice = getMarketPrice(updated.getCode());
        Long marketVolume = getMarketVolume(updated.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketData(updated, marketPrice, marketVolume);
    }

    /**
     * Get all active price alerts (for checking)
     */
    public List<PriceAlert> getAllActivePriceAlerts() {
        return priceAlertRepository.findAllByActiveTrue();
    }
}

