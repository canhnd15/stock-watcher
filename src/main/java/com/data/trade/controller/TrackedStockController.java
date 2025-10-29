package com.data.trade.controller;

import com.data.trade.model.TrackedStock;
import com.data.trade.model.User;
import com.data.trade.repository.TrackedStockRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/tracked-stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8089", "http://localhost:4200"})
@PreAuthorize("hasAnyRole('VIP', 'ADMIN')")
public class TrackedStockController {

    private final TrackedStockRepository trackedStockRepository;

    @GetMapping
    public List<TrackedStock> getAllTrackedStocks(@AuthenticationPrincipal User currentUser) {
        return trackedStockRepository.findAllByUserId(currentUser.getId());
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
                .createdAt(OffsetDateTime.now())
                .build();

        TrackedStock saved = trackedStockRepository.save(trackedStock);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
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

    @PutMapping("/{id}/toggle")
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

    @Data
    static class AddTrackedStockRequest {
        private String code;
    }
}

