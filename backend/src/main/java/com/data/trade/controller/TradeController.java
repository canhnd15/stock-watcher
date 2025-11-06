package com.data.trade.controller;

import com.data.trade.dto.DailyTradeStatsDTO;
import com.data.trade.dto.TradePageResponse;
import com.data.trade.model.Trade;
import com.data.trade.service.TradeExcelService;
import com.data.trade.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;
    private final TradeExcelService tradeExcelService;

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
        return tradeService.findTradesWithFilters(
                code, type, minVolume, maxVolume, minPrice, maxPrice, highVolume,
                fromDate, toDate, page, size, sort, direction
        );
    }

    @PostMapping("/ingest/{code}")
    public ResponseEntity<?> ingestNow(@PathVariable String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        tradeService.ingestForCode(code);
        return ResponseEntity.ok("Ingestion completed for code: " + code.trim().toUpperCase());
    }

    @PostMapping("/ingest/all")
    public ResponseEntity<?> ingestAllNow() {
        tradeService.ingestAllVn30();
        return ResponseEntity.ok("Ingestion completed for all vn30");
    }

    @GetMapping("/recommendation")
    public ResponseEntity<String> getRecommendation(
            @RequestParam String code,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        String recommendation = tradeService.getRecommendation(code, date);
        return ResponseEntity.ok(recommendation);
    }

    @PostMapping("/reingest/{code}")
    public ResponseEntity<?> reingest(@PathVariable String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        tradeService.reingestForCode(code);
        return ResponseEntity.ok("Re-ingested for code: " + code.trim().toUpperCase());
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
        Specification<Trade> spec = tradeService.buildTradeSpecification(
                code, type, minVolume, maxVolume, minPrice, maxPrice, highVolume, fromDate, toDate
        );
        List<Trade> all = tradeService.findAllTrades(spec);
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

    @GetMapping("/daily-stats")
    public ResponseEntity<List<DailyTradeStatsDTO>> getDailyStats(
            @RequestParam(required = false) String code,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<DailyTradeStatsDTO> stats = tradeService.getDailyStats(code, fromDate, toDate);
        return ResponseEntity.ok(stats);
    }
}

