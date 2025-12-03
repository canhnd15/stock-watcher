package com.data.trade.service;

import com.data.trade.dto.PriceAlertNotification;
import com.data.trade.model.PriceAlert;
import com.data.trade.repository.PriceAlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceAlertNotificationService {

    private final PriceAlertRepository priceAlertRepository;
    private final FinpathClient finpathClient;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Check all active price alerts and send notifications if conditions are met
     * Condition: price >= reachPrice OR price <= dropPrice
     */
    public void checkPriceAlertsAndNotify() {
        log.info("========== Starting price alerts check ==========");
        
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
                // Fetch current market price for this stock
                BigDecimal currentPrice = getMarketPrice(code);
                
                if (currentPrice == null) {
                    log.debug("Failed to fetch market price for {}. Skipping alerts.", code);
                    failCount += alertsForCode.size();
                    continue;
                }
                
                // Check each alert for this stock
                for (PriceAlert alert : alertsForCode) {
                    boolean shouldAlert = false;
                    String alertType = null;
                    
                    // Check reach price condition: price >= reachPrice
                    if (alert.getReachPrice() != null && currentPrice.compareTo(alert.getReachPrice()) >= 0) {
                        shouldAlert = true;
                        alertType = "REACH";
                    }
                    
                    // Check drop price condition: price <= dropPrice
                    if (alert.getDropPrice() != null && currentPrice.compareTo(alert.getDropPrice()) <= 0) {
                        shouldAlert = true;
                        alertType = "DROP";
                    }
                    
                    if (shouldAlert) {
                        // Send notification to user
                        Long userId = alert.getUser().getId();
                        String message = buildAlertMessage(code, currentPrice, alert, alertType);
                        
                        PriceAlertNotification notification = PriceAlertNotification.builder()
                                .alertId(alert.getId())
                                .code(code)
                                .currentPrice(currentPrice)
                                .reachPrice(alert.getReachPrice())
                                .dropPrice(alert.getDropPrice())
                                .alertType(alertType)
                                .timestamp(OffsetDateTime.now())
                                .message(message)
                                .build();
                        
                        // Send to user-specific WebSocket topic
                        messagingTemplate.convertAndSend("/topic/price-alerts/user/" + userId, notification);
                        
                        log.info("🔔 Price alert notification sent to user {}: {} - {} (current: {}, target: {})", 
                                userId, code, alertType, currentPrice, 
                                alertType.equals("REACH") ? alert.getReachPrice() : alert.getDropPrice());
                        
                        notificationsSent++;
                        
                        // Deactivate alert after notification to prevent spam
                        alert.setActive(false);
                        priceAlertRepository.save(alert);
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
     * Build alert message
     */
    private String buildAlertMessage(String code, BigDecimal currentPrice, PriceAlert alert, String alertType) {
        if ("REACH".equals(alertType)) {
            return String.format("%s reached target price %s (current: %s)", 
                    code, alert.getReachPrice(), currentPrice);
        } else {
            return String.format("%s dropped to target price %s (current: %s)", 
                    code, alert.getDropPrice(), currentPrice);
        }
    }
}

