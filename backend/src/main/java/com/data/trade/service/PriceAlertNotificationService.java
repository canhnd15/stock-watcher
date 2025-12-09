package com.data.trade.service;

import com.data.trade.dto.PriceAlertNotification;
import com.data.trade.model.PriceAlert;
import com.data.trade.repository.PriceAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceAlertNotificationService {

    private final PriceAlertRepository priceAlertRepository;
    private final FinpathClient finpathClient;
    private final SimpMessagingTemplate messagingTemplate;
    
    // Track last notification time per alert to prevent spam (notify at most once per 5 minutes)
    private final Map<Long, OffsetDateTime> lastNotificationTime = new ConcurrentHashMap<>();
    private static final int NOTIFICATION_COOLDOWN_MINUTES = 5;

    /**
     * Check all active price and volume alerts and send notifications if conditions are met
     * Conditions: 
     *   - Price: price >= reachPrice OR price <= dropPrice
     *   - Volume: volume >= reachVolume
     * Alerts remain active and continue checking until manually deactivated
     */
    public void checkPriceAlertsAndNotify() {
        log.info("========== Starting price and volume alerts check ==========");
        
        List<PriceAlert> activeAlerts = priceAlertRepository.findAllByActiveTrueWithUser();
        
        if (activeAlerts.isEmpty()) {
            log.info("No active price alerts found. Skipping check.");
            return;
        }
        
        log.info("Checking {} active price alerts", activeAlerts.size());
        
        // Group alerts by stock code to minimize API calls
        Map<String, List<PriceAlert>> alertsByCode = activeAlerts.stream()
                .collect(Collectors.groupingBy(PriceAlert::getCode));
        
        int notificationsSent = 0;
        int failCount = 0;
        
        for (Map.Entry<String, List<PriceAlert>> entry : alertsByCode.entrySet()) {
            String code = entry.getKey();
            List<PriceAlert> alertsForCode = entry.getValue();
            
            try {
                // Fetch current market data (price and volume) for this stock
                BigDecimal currentPrice = getMarketPrice(code);
                Long currentVolume = getMarketVolume(code);
                
                // Skip if we can't get any market data (at least price or volume should be available)
                if (currentPrice == null && currentVolume == null) {
                    log.debug("Failed to fetch market data for {}. Skipping alerts.", code);
                    failCount += alertsForCode.size();
                    continue;
                }
                
                // Check each alert for this stock
                for (PriceAlert alert : alertsForCode) {
                    boolean shouldAlert = false;
                    String alertType = null;
                    
                    // Check reach price condition: price >= reachPrice
                    if (alert.getReachPrice() != null && currentPrice != null && 
                        currentPrice.compareTo(alert.getReachPrice()) >= 0) {
                        shouldAlert = true;
                        alertType = "REACH";
                    }
                    
                    // Check drop price condition: price <= dropPrice
                    if (alert.getDropPrice() != null && currentPrice != null && 
                        currentPrice.compareTo(alert.getDropPrice()) <= 0) {
                        shouldAlert = true;
                        // If both price conditions are met, prioritize REACH over DROP
                        if (alertType == null) {
                            alertType = "DROP";
                        }
                    }
                    
                    // Check reach volume condition: volume >= reachVolume
                    if (alert.getReachVolume() != null && currentVolume != null && 
                        currentVolume >= alert.getReachVolume()) {
                        shouldAlert = true;
                        // Prioritize price alerts over volume alerts if both are triggered
                        if (alertType == null) {
                            alertType = "VOLUME_REACH";
                        }
                    }
                    
                    if (shouldAlert) {
                        // Check if we should send notification (cooldown to prevent spam)
                        if (shouldSendNotification(alert.getId())) {
                            // Send notification to user
                            Long userId = alert.getUser().getId();
                            String message = buildAlertMessage(code, currentPrice, currentVolume, alert, alertType);
                            
                            PriceAlertNotification notification = PriceAlertNotification.builder()
                                    .alertId(alert.getId())
                                    .code(code)
                                    .currentPrice(currentPrice)
                                    .reachPrice(alert.getReachPrice())
                                    .dropPrice(alert.getDropPrice())
                                    .currentVolume(currentVolume)
                                    .reachVolume(alert.getReachVolume())
                                    .alertType(alertType)
                                    .timestamp(OffsetDateTime.now())
                                    .message(message)
                                    .build();
                            
                            // Send to user-specific WebSocket topic
                            messagingTemplate.convertAndSend("/topic/price-alerts/user/" + userId, notification);
                            
                            // Update last notification time
                            lastNotificationTime.put(alert.getId(), OffsetDateTime.now());
                            
                            log.info("🔔 Alert notification sent to user {}: {} - {} (price: {}, volume: {})", 
                                    userId, code, alertType, currentPrice, currentVolume);
                            
                            notificationsSent++;
                        } else {
                            log.debug("Skipping notification for alert {} due to cooldown", alert.getId());
                        }
                        
                        // Note: Alert remains active - no deactivation
                    } else {
                        // Condition no longer met, remove from cooldown tracking
                        lastNotificationTime.remove(alert.getId());
                    }
                }
            } catch (Exception e) {
                log.error("Failed to check price alerts for {}: {}", code, e.getMessage(), e);
                failCount += alertsForCode.size();
            }
        }
        
        log.info("========== Price alerts check completed. Notifications sent: {}, Failed: {} ==========", 
                notificationsSent, failCount);
    }
    
    /**
     * Check if notification should be sent based on cooldown period
     */
    private boolean shouldSendNotification(Long alertId) {
        OffsetDateTime lastNotification = lastNotificationTime.get(alertId);
        if (lastNotification == null) {
            return true; // No previous notification, send it
        }
        
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime cooldownEnd = lastNotification.plusMinutes(NOTIFICATION_COOLDOWN_MINUTES);
        
        return now.isAfter(cooldownEnd);
    }
    
    /**
     * Get market price for a stock code
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
     * Get market volume for a stock code
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
     * Build alert message
     */
    private String buildAlertMessage(String code, BigDecimal currentPrice, Long currentVolume, PriceAlert alert, String alertType) {
        switch (alertType) {
            case "REACH":
                return String.format("%s reached target price %s (current: %s)", 
                        code, formatPrice(alert.getReachPrice()), formatPrice(currentPrice));
            case "DROP":
                return String.format("%s dropped to target price %s (current: %s)", 
                        code, formatPrice(alert.getDropPrice()), formatPrice(currentPrice));
            case "VOLUME_REACH":
                return String.format("%s reached target volume %s (current: %s)", 
                        code, formatVolume(alert.getReachVolume()), formatVolume(currentVolume));
            default:
                return String.format("%s alert triggered", code);
        }
    }
    
    /**
     * Format price (BigDecimal) with dot separators for thousands
     * e.g., 120000.0 -> "120.000"
     */
    private String formatPrice(BigDecimal price) {
        if (price == null) {
            return "N/A";
        }
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.getDefault());
        symbols.setGroupingSeparator('.');
        DecimalFormat formatter = new DecimalFormat("#,###", symbols);
        formatter.setMaximumFractionDigits(0);
        return formatter.format(price);
    }
    
    /**
     * Format volume (Long) with dot separators for thousands
     * e.g., 5000000 -> "5.000.000"
     */
    private String formatVolume(Long volume) {
        if (volume == null) {
            return "N/A";
        }
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.getDefault());
        symbols.setGroupingSeparator('.');
        DecimalFormat formatter = new DecimalFormat("#,###", symbols);
        formatter.setMaximumFractionDigits(0);
        return formatter.format(volume);
    }
    
    /**
     * Clear notification cooldown for an alert (called when alert is modified or deleted)
     */
    public void clearNotificationCooldown(Long alertId) {
        lastNotificationTime.remove(alertId);
    }
}

