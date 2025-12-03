package com.data.trade.service;

import com.data.trade.dto.PriceAlertDTO;
import com.data.trade.dto.CreatePriceAlertRequest;
import com.data.trade.dto.UpdatePriceAlertRequest;
import com.data.trade.model.PriceAlert;
import com.data.trade.model.User;
import com.data.trade.repository.PriceAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    /**
     * Get all price alerts for a specific user
     */
    public List<PriceAlertDTO> getAllPriceAlertsForUser(Long userId) {
        List<PriceAlert> alerts = priceAlertRepository.findAllByUserId(userId);
        
        return alerts.stream()
                .map(alert -> {
                    BigDecimal marketPrice = getMarketPrice(alert.getCode());
                    return PriceAlertDTO.fromPriceAlertWithMarketPrice(alert, marketPrice);
                })
                .collect(Collectors.toList());
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
     * Create a new price alert
     */
    public PriceAlertDTO createPriceAlert(User user, CreatePriceAlertRequest request) {
        // Validate that at least one price is provided
        if (request.getReachPrice() == null && request.getDropPrice() == null) {
            throw new IllegalArgumentException("At least one of reachPrice or dropPrice must be provided");
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
                .active(true)
                .createdAt(OffsetDateTime.now())
                .build();

        PriceAlert saved = priceAlertRepository.save(alert);
        BigDecimal marketPrice = getMarketPrice(saved.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketPrice(saved, marketPrice);
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

        // Validate that at least one price is provided
        if (request.getReachPrice() == null && request.getDropPrice() == null && 
            (request.getReachPrice() == null || request.getDropPrice() == null)) {
            // If both are being set to null, keep existing values
            if (request.getReachPrice() == null && request.getDropPrice() == null) {
                // Check if we're trying to clear both
                if (alert.getReachPrice() == null && alert.getDropPrice() == null) {
                    throw new IllegalArgumentException("At least one of reachPrice or dropPrice must be provided");
                }
            }
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
        if (request.getActive() != null) {
            alert.setActive(request.getActive());
        }

        PriceAlert updated = priceAlertRepository.save(alert);
        BigDecimal marketPrice = getMarketPrice(updated.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketPrice(updated, marketPrice);
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
        BigDecimal marketPrice = getMarketPrice(updated.getCode());
        return PriceAlertDTO.fromPriceAlertWithMarketPrice(updated, marketPrice);
    }

    /**
     * Get all active price alerts (for checking)
     */
    public List<PriceAlert> getAllActivePriceAlerts() {
        return priceAlertRepository.findAllByActiveTrue();
    }
}

