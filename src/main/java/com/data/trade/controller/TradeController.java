package com.data.trade.controller;

import com.data.trade.dto.TradePageResponse;
import com.data.trade.model.Trade;
import com.data.trade.repository.TradeRepository;
import com.data.trade.service.TradeIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:8089")
public class TradeController {

    private final TradeRepository tradeRepository;
    private final TradeIngestionService ingestionService;
    private final com.data.trade.service.TradeExcelService tradeExcelService;

    private final List<String> vn30 = List.of(
            "ACB",
            "BCM",
            "CTG",
            "DGC",
            "FPT",
            "BFG",
            "HDB",
            "HPG",
            "LPB",
            "MBB",
            "MSN",
            "PLX",
            "SAB",
            "SHB",
            "SSB",
            "SSI",
            "TCB",
            "TPB",
            "VCB",
            "VHM",
            "VIB",
            "VIC",
            "VJC",
            "VNM",
            "VPB"
    );

    @GetMapping
    public TradePageResponse findTrades(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long minVolume,
            @RequestParam(required = false) Long maxVolume,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer highVolume,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String direction
    ) {
        // Create Pageable with sorting if sort parameter is provided
        Pageable pageable;
        if (sort != null && !sort.isBlank()) {
            org.springframework.data.domain.Sort.Direction sortDirection = 
                "desc".equalsIgnoreCase(direction) ? 
                org.springframework.data.domain.Sort.Direction.DESC : 
                org.springframework.data.domain.Sort.Direction.ASC;
            pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(sortDirection, sort));
        } else {
            pageable = PageRequest.of(page, size);
        }
        
        // Build specifications for filtering
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
        
        // Date range filtering on tradeDate (string in DD/MM/YYYY format)
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        if (fromDate != null && toDate != null) {
            String fromDateStr = fromDate.format(formatter);
            String toDateStr = toDate.format(formatter);
            specs.add((root, q, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.get("tradeDate"), fromDateStr),
                    cb.lessThanOrEqualTo(root.get("tradeDate"), toDateStr)
            ));
        } else if (fromDate != null) {
            String fromDateStr = fromDate.format(formatter);
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("tradeDate"), fromDateStr));
        } else if (toDate != null) {
            String toDateStr = toDate.format(formatter);
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("tradeDate"), toDateStr));
        }
        
        Specification<Trade> spec = Specification.allOf(specs);
        
        // Get paginated results
        Page<Trade> tradesPage = tradeRepository.findAll(spec, pageable);
        
        // Calculate volume statistics from all matching records (not just the current page)
        List<Trade> allMatchingTrades = tradeRepository.findAll(spec);
        
        long totalVolume = allMatchingTrades.stream()
                .mapToLong(Trade::getVolume)
                .sum();
        
        long buyVolume = allMatchingTrades.stream()
                .filter(t -> "buy".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();
        
        long sellVolume = allMatchingTrades.stream()
                .filter(t -> "sell".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();
        
        long otherVolume = allMatchingTrades.stream()
                .filter(t -> "other".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();
        
        // Build response with both page data and volume statistics
        return TradePageResponse.builder()
                .trades(tradesPage)
                .totalVolume(totalVolume)
                .buyVolume(buyVolume)
                .sellVolume(sellVolume)
                .otherVolume(otherVolume)
                .totalRecords(allMatchingTrades.size())
                .build();
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

    @GetMapping("/recommendation")
    public ResponseEntity<String> getRecommendation(
            @RequestParam String code,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        String normalized = code == null ? null : code.trim().toUpperCase();
        if (normalized == null || normalized.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        LocalDate tradeDate = (date == null) ? LocalDate.now() : date;
        // Convert LocalDate to DD/MM/YYYY format
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String tradeDateStr = tradeDate.format(formatter);
        String rec = tradeRepository.recommendationFor(normalized, tradeDateStr);
        if (rec == null) rec = "Neutral — hold";
        return ResponseEntity.ok(rec);
    }

    @PostMapping("/reingest/{code}")
    public ResponseEntity<?> reingest(@PathVariable String code) {
        String normalized = code == null ? null : code.trim().toUpperCase();
        if (normalized == null || normalized.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        LocalDate today = LocalDate.now();
        // Convert LocalDate to DD/MM/YYYY format
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String todayStr = today.format(formatter);
        tradeRepository.deleteForCodeOnDate(normalized, todayStr);
        ingestionService.ingestForCode(normalized);
        return ResponseEntity.ok("Re-ingested for code: " + normalized + " on date: " + todayStr);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportToExcel(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long minVolume,
            @RequestParam(required = false) Long maxVolume,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer highVolume,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Specification<Trade>> specs = new ArrayList<>();
        if (code != null && !code.isBlank()) specs.add((root, q, cb) -> cb.equal(cb.upper(root.get("code")), code.toUpperCase()));
        if (type != null && !type.isBlank()) specs.add((root, q, cb) -> cb.equal(root.get("side"), type));
        if (minVolume != null) specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), minVolume));
        if (maxVolume != null) specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("volume"), maxVolume));
        if (minPrice != null) specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice));
        if (maxPrice != null) specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice));
        if (highVolume != null) specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), highVolume));
        // Date range filtering on tradeDate (string in DD/MM/YYYY format)
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        if (fromDate != null && toDate != null) {
            String fromDateStr = fromDate.format(formatter);
            String toDateStr = toDate.format(formatter);
            specs.add((root, q, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.get("tradeDate"), fromDateStr),
                    cb.lessThanOrEqualTo(root.get("tradeDate"), toDateStr)
            ));
        } else if (fromDate != null) {
            String fromDateStr = fromDate.format(formatter);
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("tradeDate"), fromDateStr));
        } else if (toDate != null) {
            String toDateStr = toDate.format(formatter);
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("tradeDate"), toDateStr));
        }
        Specification<Trade> spec = Specification.allOf(specs);
        List<Trade> all = tradeRepository.findAll(spec);
        byte[] bytes = tradeExcelService.exportToXlsx(all);
        String filename = "trades-export.xlsx";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);
        headers.setContentLength(bytes.length);
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> importFromExcel(@RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("file is required");
        }
        int saved = tradeExcelService.importFromXlsx(file);
        return ResponseEntity.ok("Imported records: " + saved);
    }
}

