package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.service.ConfigService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiEndpoints.API_CONFIG)
@RequiredArgsConstructor
public class ConfigController {

    private final ConfigService configService;

    @GetMapping(ApiEndpoints.CONFIG_VN30_CRON_PATH)
    public ResponseEntity<CronStatusResponse> getVn30CronStatus() {
        boolean enabled = configService.isVn30CronEnabled();
        return ResponseEntity.ok(new CronStatusResponse(enabled));
    }

    @PutMapping(ApiEndpoints.CONFIG_VN30_CRON_PATH)
    public ResponseEntity<CronStatusResponse> setVn30CronStatus(@RequestBody CronStatusRequest request) {
        configService.setVn30CronEnabled(request.isEnabled());
        return ResponseEntity.ok(new CronStatusResponse(request.isEnabled()));
    }

    @GetMapping(ApiEndpoints.CONFIG_TRACKED_STOCKS_CRON_PATH)
    public ResponseEntity<CronStatusResponse> getTrackedStocksCronStatus() {
        boolean enabled = configService.isTrackedStocksCronEnabled();
        return ResponseEntity.ok(new CronStatusResponse(enabled));
    }

    @PutMapping(ApiEndpoints.CONFIG_TRACKED_STOCKS_CRON_PATH)
    public ResponseEntity<CronStatusResponse> setTrackedStocksCronStatus(@RequestBody CronStatusRequest request) {
        configService.setTrackedStocksCronEnabled(request.isEnabled());
        return ResponseEntity.ok(new CronStatusResponse(request.isEnabled()));
    }

    @GetMapping(ApiEndpoints.CONFIG_SIGNAL_CALCULATION_CRON_PATH)
    public ResponseEntity<CronStatusResponse> getSignalCalculationCronStatus() {
        boolean enabled = configService.isSignalCalculationCronEnabled();
        return ResponseEntity.ok(new CronStatusResponse(enabled));
    }

    @PutMapping(ApiEndpoints.CONFIG_SIGNAL_CALCULATION_CRON_PATH)
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

