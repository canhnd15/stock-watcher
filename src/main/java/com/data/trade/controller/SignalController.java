package com.data.trade.controller;

import com.data.trade.service.SignalCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/signals")
@RequiredArgsConstructor
@Slf4j
public class SignalController {

    private final SignalCalculationService signalCalculationService;

    /**
     * Manually trigger signal calculation for all VN30 stocks
     * Signals will be broadcasted via WebSocket to all connected clients
     */
    @PostMapping("/refresh")
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
}

