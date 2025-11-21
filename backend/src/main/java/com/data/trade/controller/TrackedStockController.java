package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.PortfolioSimulationRequest;
import com.data.trade.dto.PortfolioSimulationResponse;
import com.data.trade.dto.RefreshMarketPriceResponse;
import com.data.trade.dto.TrackedStockStatsDTO;
import com.data.trade.dto.TrackedStockWithMarketPriceDTO;
import com.data.trade.model.TrackedStock;
import com.data.trade.model.User;
import com.data.trade.service.TrackedStockService;
import com.data.trade.service.TrackedStockStatsService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.API_TRACKED_STOCKS)
@RequiredArgsConstructor
@PreAuthorize(RoleConstants.HAS_ANY_ROLE_VIP_ADMIN)
@Slf4j
public class TrackedStockController {

    private final TrackedStockService trackedStockService;
    private final TrackedStockStatsService trackedStockStatsService;

    @GetMapping
    public List<TrackedStockWithMarketPriceDTO> getAllTrackedStocks(@AuthenticationPrincipal User currentUser) {
        return trackedStockService.getAllTrackedStocksForUser(currentUser.getId());
    }

    @GetMapping(ApiEndpoints.TRACKED_STOCKS_STATS_PATH)
    public Map<String, TrackedStockStatsDTO> getTrackedStockStats(@AuthenticationPrincipal User currentUser) {
        return trackedStockStatsService.getStatsForUser(currentUser.getId());
    }

    @PostMapping("/refresh-market-price")
    public ResponseEntity<?> refreshMarketPrice(@AuthenticationPrincipal User currentUser) {
        try {
            RefreshMarketPriceResponse response = trackedStockService.refreshMarketPriceForUser(currentUser.getId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to refresh market prices", e);
            return ResponseEntity.status(500).body("Failed to refresh market prices: " + e.getMessage());
        }
    }

    /**
     * Simulate portfolio profit calculation
     * Accepts a list of stocks with cost basis and volume, returns profit calculations
     */
    @PostMapping("/simulate-portfolio")
    public ResponseEntity<PortfolioSimulationResponse> simulatePortfolio(
            @Valid @RequestBody PortfolioSimulationRequest request) {
        try {
            PortfolioSimulationResponse response = trackedStockService.simulatePortfolio(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to simulate portfolio", e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addTrackedStock(
            @RequestBody AddTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        try {
            TrackedStock saved = trackedStockService.addTrackedStock(
                    currentUser,
                    request.getCode(),
                    request.getCostBasis(),
                    request.getVolume(),
                    request.getTargetPrice()
            );
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to add tracked stock", e);
            return ResponseEntity.status(500).body("Failed to add tracked stock: " + e.getMessage());
        }
    }

    @DeleteMapping(ApiEndpoints.TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> deleteTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        try {
            trackedStockService.deleteTrackedStock(id, currentUser.getId());
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to delete tracked stock", e);
            return ResponseEntity.status(500).body("Failed to delete tracked stock: " + e.getMessage());
        }
    }

    @PutMapping(ApiEndpoints.TRACKED_STOCKS_TOGGLE_PATH)
    public ResponseEntity<?> toggleTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        try {
            TrackedStock updated = trackedStockService.toggleTrackedStock(id, currentUser.getId());
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to toggle tracked stock", e);
            return ResponseEntity.status(500).body("Failed to toggle tracked stock: " + e.getMessage());
        }
    }

    @PutMapping(ApiEndpoints.TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> updateTrackedStock(
            @PathVariable Long id,
            @RequestBody UpdateTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        try {
            TrackedStock updated = trackedStockService.updateTrackedStock(
                    id,
                    currentUser.getId(),
                    request.getCode(),
                    request.getActive(),
                    request.getCostBasis(),
                    request.getVolume(),
                    request.getTargetPrice()
            );
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to update tracked stock", e);
            return ResponseEntity.status(500).body("Failed to update tracked stock: " + e.getMessage());
        }
    }

    @Data
    static class AddTrackedStockRequest {
        private String code;
        private BigDecimal costBasis;
        private Long volume;
        private BigDecimal targetPrice;
    }

    @Data
    static class UpdateTrackedStockRequest {
        private String code;
        private Boolean active;
        private BigDecimal costBasis;
        private Long volume;
        private BigDecimal targetPrice;
    }
}

