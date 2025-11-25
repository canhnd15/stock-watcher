package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.service.SignalCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.API_SIGNALS)
@RequiredArgsConstructor
@Slf4j
@PreAuthorize(RoleConstants.HAS_ANY_ROLE_VIP_ADMIN)
public class SignalController {

    private final SignalCalculationService signalCalculationService;
    private final com.data.trade.service.TrackedStockNotificationService trackedStockNotificationService;

    /**
     * Manually trigger signal calculation for all VN30 stocks
     * Signals will be broadcasted via WebSocket to all connected clients
     * Requires VIP or ADMIN role
     */
    @PostMapping(ApiEndpoints.SIGNALS_REFRESH_PATH)
    public ResponseEntity<Map<String, String>> refreshSignals() {
        log.info("Manual signal refresh triggered via API");
        
        try {
            // This will calculate signals and broadcast them via WebSocket
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
     * Manually trigger tracked stock notifications check
     * Only sends notifications for tracked stocks with BIG signals (score >= 6)
     * Requires VIP or ADMIN role
     */
    @PostMapping(ApiEndpoints.SIGNALS_CHECK_TRACKED_PATH)
    public ResponseEntity<Map<String, String>> checkTrackedStocks() {
        log.info("Manual tracked stock notifications check triggered via API");
        
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

