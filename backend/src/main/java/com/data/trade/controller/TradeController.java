package com.data.trade.controller;

import io.github.bucket4j.Bucket;
import com.data.trade.config.RateLimitConfig;
import com.data.trade.constants.ApiEndpoints;
import com.data.trade.dto.DailyOHLCDTO;
import com.data.trade.dto.DailyTradeStatsDTO;
import com.data.trade.dto.TradePageResponse;
import com.data.trade.exception.RateLimitExceededException;
import com.data.trade.model.Trade;
import com.data.trade.model.User;
import com.data.trade.model.UserRole;
import com.data.trade.service.TradeExcelService;
import com.data.trade.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.API_TRADES)
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;
    private final TradeExcelService tradeExcelService;
    private final RateLimitConfig rateLimitConfig;

    @GetMapping
    public ResponseEntity<?> findTrades(
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
            @RequestParam(required = false) String direction,
            @AuthenticationPrincipal User currentUser
    ) {
        // Rate limiting check
        if (currentUser != null) {
            Bucket bucket = rateLimitConfig.resolveBucket(currentUser);
            if (!bucket.tryConsume(1)) {
                // Calculate retry after time (1 minute)
                long retryAfterSeconds = Duration.ofMinutes(1).getSeconds();
                throw new RateLimitExceededException(
                    "Rate limit exceeded. Please try again later.",
                    retryAfterSeconds
                );
            }
        }
        
        // Validate date range for non-VIP/ADMIN users
        if (fromDate != null && toDate != null && currentUser != null) {
            UserRole userRole = currentUser.getRole();
            if (userRole != UserRole.VIP && userRole != UserRole.ADMIN) {
                LocalDate oneMonthBefore = toDate.minusMonths(1);
                if (fromDate.isBefore(oneMonthBefore)) {
                    Map<String, String> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Date range exceeds one month limit");
                    errorResponse.put("message", "The date range you selected exceeds one month. " +
                            "Please upgrade to VIP account to query larger date ranges.");
                    errorResponse.put("fromDate", fromDate.toString());
                    errorResponse.put("toDate", toDate.toString());
                    errorResponse.put("minimumAllowedFromDate", oneMonthBefore.toString());
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
                }
            }
        }
        
        TradePageResponse response = tradeService.findTradesWithFilters(
                code, type, minVolume, maxVolume, minPrice, maxPrice, highVolume,
                fromDate, toDate, page, size, sort, direction
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping(ApiEndpoints.TRADES_INGEST_CODE_PATH)
    public ResponseEntity<?> ingestNow(@PathVariable String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        tradeService.ingestForCode(code);
        return ResponseEntity.ok("Ingestion completed for code: " + code.trim().toUpperCase());
    }

    @PostMapping(ApiEndpoints.TRADES_INGEST_ALL_PATH)
    public ResponseEntity<?> ingestAllNow() {
        tradeService.ingestAllVn30();
        return ResponseEntity.ok("Ingestion completed for all vn30");
    }

    @GetMapping(ApiEndpoints.TRADES_RECOMMENDATION_PATH)
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

    @PostMapping(ApiEndpoints.TRADES_REINGEST_CODE_PATH)
    public ResponseEntity<?> reingest(@PathVariable String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body("code is required");
        }
        tradeService.reingestForCode(code);
        return ResponseEntity.ok("Re-ingested for code: " + code.trim().toUpperCase());
    }

    @GetMapping(ApiEndpoints.TRADES_EXPORT_PATH)
    public ResponseEntity<?> exportToExcel(
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
            @AuthenticationPrincipal User currentUser
    ) {
        // Validate date range for non-VIP/ADMIN users
        // The date range from fromDate to toDate should not exceed one month
        // fromDate must not be more than one month before toDate
        if (fromDate != null && toDate != null && currentUser != null) {
            UserRole userRole = currentUser.getRole();
            if (userRole != UserRole.VIP && userRole != UserRole.ADMIN) {
                // Calculate one month before toDate
                LocalDate oneMonthBefore = toDate.minusMonths(1);
                // If fromDate is before oneMonthBefore, the range exceeds one month
                if (fromDate.isBefore(oneMonthBefore)) {
                    Map<String, String> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Date range exceeds one month limit");
                    errorResponse.put("message", "The date range you selected exceeds one month. Please upgrade to VIP account to export larger date ranges.");
                    errorResponse.put("fromDate", fromDate.toString());
                    errorResponse.put("toDate", toDate.toString());
                    errorResponse.put("minimumAllowedFromDate", oneMonthBefore.toString());
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
                }
            }
        }
        
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

    @PostMapping(value = ApiEndpoints.TRADES_IMPORT_PATH, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> importFromExcel(@RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body("file is required");
        }
        int saved = tradeExcelService.importFromXlsx(file);
        return ResponseEntity.ok("Imported records: " + saved);
    }

    @GetMapping(ApiEndpoints.TRADES_DAILY_STATS_PATH)
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

    @GetMapping(ApiEndpoints.TRADES_DAILY_OHLC_PATH)
    public ResponseEntity<List<DailyOHLCDTO>> getDailyOHLC(
            @RequestParam(required = false) String code,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<DailyOHLCDTO> ohlc = tradeService.getDailyOHLC(code, fromDate, toDate);
        return ResponseEntity.ok(ohlc);
    }

    @GetMapping(ApiEndpoints.TRADES_LATEST_DATE_PATH)
    public ResponseEntity<LocalDate> getLatestTransactionDate() {
        return tradeService.getLatestTransactionDate()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

