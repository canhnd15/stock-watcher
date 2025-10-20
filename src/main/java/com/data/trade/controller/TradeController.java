package com.data.trade.controller;

import com.data.trade.model.Trade;
import com.data.trade.repository.TradeRepository;
import com.data.trade.service.TradeIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeRepository tradeRepository;
    private final TradeIngestionService ingestionService;

    private final List<String> vn30 = List.of(
            "ACB", "BCM", "BID", "BVH", "CTG", "DGC", "FPT", "GAS",
            "HDB", "HDG", "HPG", "KDH", "MBB", "MSN", "MWG", "NVL",
            "PDR", "PGD", "PLX", "PNJ", "REE", "SBT", "SSI", "STB",
            "TCB", "TPB", "VCB", "VJC", "VIC", "VHM", "VNM", "VPB", "VRE"
    );

    private final List<String> deleteStock = List.of(
            "VPB", "TCB", "MWG"
    );

    @GetMapping
    public Page<Trade> findTrades(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long minVolume,
            @RequestParam(required = false) Long maxVolume,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer highVolume,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        List<Specification<Trade>> specs = new ArrayList<>();
        if (code != null && !code.isBlank()) {
            specs.add((root, q, cb) -> cb.equal(cb.upper(root.get("code")), code.toUpperCase()));
        }
        if (type != null && !type.isBlank()) {
            specs.add((root, q, cb) -> cb.equal(root.get("side"), type));
        }
        if (minVolume != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), minVolume));
        }
        if (maxVolume != null) {
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("volume"), maxVolume));
        }
        if (minPrice != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice));
        }
        if (maxPrice != null) {
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice));
        }
        if (highVolume != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), highVolume));
        }
        Specification<Trade> spec = Specification.allOf(specs);
        return tradeRepository.findAll(spec, pageable);
    }

    @PostMapping("/ingest/{code}")
    public ResponseEntity<?> ingestNow(@PathVariable String code) {
        String normalized = code == null ? null : code.trim().toUpperCase();
        if (normalized == null || normalized.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        ingestionService.ingestForCode(normalized);
        return ResponseEntity.ok("Ingestion completed for code: " + normalized);
    }

    @PostMapping("/ingest/all")
    public ResponseEntity<?> ingestAllNow() {
        for (String stockCode: vn30) {
            ingestionService.ingestForCode(stockCode);
        }
        return ResponseEntity.ok("Ingestion completed for all vn30: ");
    }
}

