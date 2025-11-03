package com.data.trade.controller;

import com.data.trade.service.SignalCalculationService;
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
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@Slf4j
public class InternalController {

    private final SignalCalculationService signalCalculationService;
    private final com.data.trade.service.TrackedStockNotificationService trackedStockNotificationService;

    /**
     * Internal endpoint for cron-jobs service to trigger signal calculation
     * Signals will be broadcasted via backend's WebSocket to all connected clients
     */
    @PostMapping("/signals/refresh")
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
    @PostMapping("/signals/check-tracked")
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
}

