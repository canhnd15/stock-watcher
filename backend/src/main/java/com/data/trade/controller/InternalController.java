package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.service.PriceAlertNotificationService;
import com.data.trade.service.SignalCalculationService;
import com.data.trade.service.TrackedStockNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Internal endpoints for service-to-service communication (cron-jobs -> backend)
 * These endpoints are public (no authentication) to allow internal service calls
 */
@RestController
@RequestMapping(ApiEndpoints.API_INTERNAL)
@RequiredArgsConstructor
@Slf4j
public class InternalController {

    private final SignalCalculationService signalCalculationService;
    private final TrackedStockNotificationService trackedStockNotificationService;
    private final PriceAlertNotificationService priceAlertNotificationService;

    /**
     * Internal endpoint for cron-jobs service to trigger signal calculation
     * Signals will be broadcasted via backend's WebSocket to all connected clients
     */
    @PostMapping(ApiEndpoints.INTERNAL_SIGNALS_REFRESH_PATH)
    public ResponseEntity<Map<String, String>> refreshSignals() {
        log.info("Signal refresh triggered by cron-jobs service via internal API");
        
        try {
            // This will calculate signals and broadcast them via backend's WebSocket
            signalCalculationService.calculateAndNotifySignals();
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Signal calculation triggered successfully. Signals will be sent via WebSocket.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to refresh signals: {}", e.getMessage(), e);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to calculate signals: " + e.getMessage());
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Internal endpoint for cron-jobs service to trigger tracked stock notifications check
     * Only sends notifications for tracked stocks with BIG signals (score >= 6)
     */
    @PostMapping(ApiEndpoints.INTERNAL_SIGNALS_CHECK_TRACKED_PATH)
    public ResponseEntity<Map<String, String>> checkTrackedStocks() {
        log.info("Tracked stock notifications check triggered by cron-jobs service via internal API");
        
        try {
            trackedStockNotificationService.checkTrackedStocksAndNotify();
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Tracked stock notifications check completed. Notifications sent for BIG signals.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to check tracked stocks: {}", e.getMessage(), e);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to check tracked stocks: " + e.getMessage());
            
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Internal endpoint for cron-jobs service to trigger price alerts check
     * Checks all active price alerts and sends notifications via WebSocket when conditions are met
     */
    @PostMapping(ApiEndpoints.INTERNAL_PRICE_ALERTS_CHECK_PATH)
    public ResponseEntity<Map<String, String>> checkPriceAlerts() {
        log.info("Price alerts check triggered by cron-jobs service via internal API");
        
        try {
            priceAlertNotificationService.checkPriceAlertsAndNotify();
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Price alerts check completed. Notifications sent if conditions met.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to check price alerts: {}", e.getMessage(), e);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to check price alerts: " + e.getMessage());
            
            return ResponseEntity.internalServerError().body(response);
        }
    }
}


