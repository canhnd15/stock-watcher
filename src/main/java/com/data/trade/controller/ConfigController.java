package com.data.trade.controller;

import com.data.trade.service.ConfigService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;

    @GetMapping("/vn30-cron")
    public ResponseEntity<CronStatusResponse> getVn30CronStatus() {
        boolean enabled = configService.isVn30CronEnabled();
        return ResponseEntity.ok(new CronStatusResponse(enabled));
    }

    @PutMapping("/vn30-cron")
    public ResponseEntity<CronStatusResponse> setVn30CronStatus(@RequestBody CronStatusRequest request) {
        configService.setVn30CronEnabled(request.isEnabled());
        return ResponseEntity.ok(new CronStatusResponse(request.isEnabled()));
    }

    @GetMapping("/tracked-stocks-cron")
    public ResponseEntity<CronStatusResponse> getTrackedStocksCronStatus() {
        boolean enabled = configService.isTrackedStocksCronEnabled();
        return ResponseEntity.ok(new CronStatusResponse(enabled));
    }

    @PutMapping("/tracked-stocks-cron")
    public ResponseEntity<CronStatusResponse> setTrackedStocksCronStatus(@RequestBody CronStatusRequest request) {
        configService.setTrackedStocksCronEnabled(request.isEnabled());
        return ResponseEntity.ok(new CronStatusResponse(request.isEnabled()));
    }

    @GetMapping("/signal-calculation-cron")
    public ResponseEntity<CronStatusResponse> getSignalCalculationCronStatus() {
        boolean enabled = configService.isSignalCalculationCronEnabled();
        return ResponseEntity.ok(new CronStatusResponse(enabled));
    }

    @PutMapping("/signal-calculation-cron")
    public ResponseEntity<CronStatusResponse> setSignalCalculationCronStatus(@RequestBody CronStatusRequest request) {
        configService.setSignalCalculationCronEnabled(request.isEnabled());
        return ResponseEntity.ok(new CronStatusResponse(request.isEnabled()));
    }

    @Data
    public static class CronStatusRequest {
        private boolean enabled;
    }

    @Data
    public static class CronStatusResponse {
        private final boolean enabled;
    }
}

