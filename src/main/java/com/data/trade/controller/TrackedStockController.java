package com.data.trade.controller;

import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TrackedStockRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:8089")
public class TrackedStockController {

    private final TrackedStockRepository trackedStockRepository;
    
    @Value("${market.vn30.codes}")
    private List<String> vn30Codes;

    @GetMapping
    public List<TrackedStock> list() {
        return trackedStockRepository.findAll();
    }
    
    @GetMapping("/vn30")
    public ResponseEntity<List<String>> getVn30Codes() {
        return ResponseEntity.ok(vn30Codes);
    }

    @PostMapping
    public ResponseEntity<?> upsert(@RequestBody CodesRequest request) {
        for (String code : request.getCodes()) {
            String c = code.trim().toUpperCase();
            TrackedStock ts = trackedStockRepository.findAll().stream()
                    .filter(x -> x.getCode().equalsIgnoreCase(c))
                    .findFirst().orElse(TrackedStock.builder().code(c).active(true).build());
            ts.setActive(true);
            trackedStockRepository.save(ts);
        }
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{code}/active/{active}")
    public ResponseEntity<?> setActive(@PathVariable String code, @PathVariable boolean active) {
        TrackedStock ts = trackedStockRepository.findAll().stream()
                .filter(x -> x.getCode().equalsIgnoreCase(code))
                .findFirst().orElse(TrackedStock.builder().code(code.toUpperCase()).active(active).build());
        ts.setActive(active);
        trackedStockRepository.save(ts);
        return ResponseEntity.ok(ts);
    }

    @Data
    public static class CodesRequest {
        private List<String> codes;
    }
}
