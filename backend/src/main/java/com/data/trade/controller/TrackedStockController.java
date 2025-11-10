package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.dto.TrackedStockStatsDTO;
import com.data.trade.model.TrackedStock;
import com.data.trade.model.User;
import com.data.trade.repository.TrackedStockRepository;
import com.data.trade.service.TrackedStockStatsService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.API_TRACKED_STOCKS)
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('VIP', 'ADMIN')")
public class TrackedStockController {

    private final TrackedStockRepository trackedStockRepository;
    private final TrackedStockStatsService trackedStockStatsService;

    @GetMapping
    public List<TrackedStock> getAllTrackedStocks(@AuthenticationPrincipal User currentUser) {
        return trackedStockRepository.findAllByUserId(currentUser.getId());
    }

    @GetMapping(ApiEndpoints.TRACKED_STOCKS_STATS_PATH)
    public Map<String, TrackedStockStatsDTO> getTrackedStockStats(@AuthenticationPrincipal User currentUser) {
        return trackedStockStatsService.getStatsForUser(currentUser.getId());
    }

    @PostMapping
    public ResponseEntity<?> addTrackedStock(
            @RequestBody AddTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        // Check if already exists
        if (trackedStockRepository.existsByUserIdAndCode(currentUser.getId(), request.getCode().toUpperCase())) {
            return ResponseEntity.badRequest().body("Stock already tracked");
        }

        TrackedStock trackedStock = TrackedStock.builder()
                .user(currentUser)
                .code(request.getCode().toUpperCase())
                .active(true)
                .costBasis(request.getCostBasis())
                .createdAt(OffsetDateTime.now())
                .build();

        TrackedStock saved = trackedStockRepository.save(trackedStock);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping(ApiEndpoints.TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> deleteTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        trackedStockRepository.delete(stock);
        return ResponseEntity.ok().build();
    }

    @PutMapping(ApiEndpoints.TRACKED_STOCKS_TOGGLE_PATH)
    public ResponseEntity<?> toggleTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        stock.setActive(!stock.getActive());
        TrackedStock updated = trackedStockRepository.save(stock);
        return ResponseEntity.ok(updated);
    }

    @PutMapping(ApiEndpoints.TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> updateTrackedStock(
            @PathVariable Long id,
            @RequestBody UpdateTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        // Update fields if provided
        if (request.getCode() != null) {
            // Check if new code already exists (if changing code)
            if (!stock.getCode().equals(request.getCode().toUpperCase())) {
                if (trackedStockRepository.existsByUserIdAndCode(currentUser.getId(), request.getCode().toUpperCase())) {
                    return ResponseEntity.badRequest().body("Stock code already tracked");
                }
                stock.setCode(request.getCode().toUpperCase());
            }
        }
        if (request.getActive() != null) {
            stock.setActive(request.getActive());
        }
        // Update costBasis - if sent as null in request, it will clear the value
        stock.setCostBasis(request.getCostBasis());

        TrackedStock updated = trackedStockRepository.save(stock);
        return ResponseEntity.ok(updated);
    }

    @Data
    static class AddTrackedStockRequest {
        private String code;
        private BigDecimal costBasis;
    }

    @Data
    static class UpdateTrackedStockRequest {
        private String code;
        private Boolean active;
        private BigDecimal costBasis;
    }
}

