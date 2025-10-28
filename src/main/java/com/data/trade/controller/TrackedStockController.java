package com.data.trade.controller;

import com.data.trade.model.TrackedStock;
import com.data.trade.service.TrackedStockService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class TrackedStockController {

    private final TrackedStockService trackedStockService;

    @GetMapping
    public List<TrackedStock> list() {
        return trackedStockService.getAllTrackedStocks();
    }
    
    @GetMapping("/vn30")
    public ResponseEntity<List<String>> getVn30Codes() {
        return ResponseEntity.ok(trackedStockService.getVn30Codes());
    }

    @PostMapping
    public ResponseEntity<?> upsert(@RequestBody CodesRequest request) {
        trackedStockService.upsertStocks(request.getCodes());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{code}/active/{active}")
    public ResponseEntity<?> setActive(@PathVariable String code, @PathVariable boolean active) {
        TrackedStock result = trackedStockService.setActive(code, active);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<?> delete(@PathVariable String code) {
        boolean deleted = trackedStockService.deleteStock(code);
        
        if (deleted) {
            return ResponseEntity.ok().build();
        }
        
        return ResponseEntity.notFound().build();
    }

    @Data
    public static class CodesRequest {
        private List<String> codes;
    }
}
