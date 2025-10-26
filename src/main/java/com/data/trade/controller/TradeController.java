package com.data.trade.controller;

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
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
    public Page<Trade> findTrades(
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
        // Date range on tradeTime (OffsetDateTime) in Asia/Ho_Chi_Minh
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        if (fromDate != null && toDate != null) {
            OffsetDateTime start = fromDate.atStartOfDay(vnZone).toOffsetDateTime();
            OffsetDateTime endExclusive = toDate.plusDays(1).atStartOfDay(vnZone).toOffsetDateTime();
            specs.add((root, q, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.get("tradeTime"), start),
                    cb.lessThan(root.get("tradeTime"), endExclusive)
            ));
        } else if (fromDate != null) {
            OffsetDateTime start = fromDate.atStartOfDay(vnZone).toOffsetDateTime();
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("tradeTime"), start));
        } else if (toDate != null) {
            OffsetDateTime endExclusive = toDate.plusDays(1).atStartOfDay(vnZone).toOffsetDateTime();
            specs.add((root, q, cb) -> cb.lessThan(root.get("tradeTime"), endExclusive));
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
        String rec = tradeRepository.recommendationFor(normalized, tradeDate);
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
        tradeRepository.deleteForCodeOnDate(normalized, today);
        ingestionService.ingestForCode(normalized);
        return ResponseEntity.ok("Re-ingested for code: " + normalized + " on date: " + today);
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
        // date range
        ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");
        if (fromDate != null) {
            var start = fromDate.atStartOfDay(vnZone).toOffsetDateTime();
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("tradeTime"), start));
        }
        if (toDate != null) {
            var endExclusive = toDate.plusDays(1).atStartOfDay(vnZone).toOffsetDateTime();
            specs.add((root, q, cb) -> cb.lessThan(root.get("tradeTime"), endExclusive));
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

