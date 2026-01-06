package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.dto.RagIndexingRequest;
import com.data.trade.service.DataIndexingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.API_INTERNAL + "/rag")
@RequiredArgsConstructor
@Slf4j
public class RagIndexingController {

    private final DataIndexingService dataIndexingService;

    @Value("${rag.initial-indexing.max-days:180}")
    private int defaultMaxDays;

    @Value("${rag.initial-indexing.batch-size:30}")
    private int defaultBatchSize;

    /**
     * Index trades for a specific date (called by cron job after data ingestion)
     * Internal endpoint - accessible by cron-jobs service (no auth required)
     */
    @PostMapping("/index-trades")
    public ResponseEntity<Map<String, Object>> indexTrades(@RequestBody RagIndexingRequest request) {
        try {
            if (request.getTradeDate() == null || request.getTradeDate().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "tradeDate is required");
                return ResponseEntity.badRequest().body(error);
            }

            log.info("Received indexing request for trade date: {}", request.getTradeDate());
            int chunksIndexed = dataIndexingService.indexTradesForDate(request.getTradeDate());

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("tradeDate", request.getTradeDate());
            response.put("chunksIndexed", chunksIndexed);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error indexing trades for date {}: {}", request.getTradeDate(), e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Index all historical trades (for initial setup or manual trigger)
     * Admin-only endpoint
     */
    @PostMapping("/index-all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> indexAll(@RequestBody(required = false) RagIndexingRequest request) {
        try {
            int maxDays = (request != null && request.getMaxDays() != null) 
                ? request.getMaxDays() 
                : defaultMaxDays;
            int batchSize = (request != null && request.getBatchSize() != null) 
                ? request.getBatchSize() 
                : defaultBatchSize;

            log.info("Received bulk indexing request. Max days: {}, Batch size: {}", maxDays, batchSize);

            Map<String, Object> result = dataIndexingService.indexAllHistoricalTrades(maxDays, batchSize);
            result.put("status", "in_progress".equals(result.get("status")) ? "in_progress" : "completed");

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error during bulk indexing: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Index trades for a specific date range
     * Admin-only endpoint
     */
    @PostMapping("/index-date-range")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> indexDateRange(@RequestBody RagIndexingRequest request) {
        try {
            if (request.getFromDate() == null || request.getToDate() == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "fromDate and toDate are required");
                return ResponseEntity.badRequest().body(error);
            }

            int batchSize = (request.getBatchSize() != null) 
                ? request.getBatchSize() 
                : defaultBatchSize;

            log.info("Received date range indexing request. From: {}, To: {}, Batch size: {}", 
                request.getFromDate(), request.getToDate(), batchSize);

            Map<String, Object> result = dataIndexingService.indexTradesForDateRange(
                request.getFromDate(), 
                request.getToDate(), 
                batchSize
            );

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error indexing date range: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}

