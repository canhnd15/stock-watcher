package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.dto.RecommendationResult;
import com.data.trade.service.CombinedRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.data.trade.dto.DailyStats;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

/**
 * Controller for stock trading suggestions
 * Uses combined 4-formula approach based on 10 days of data
 */
@RestController
@RequestMapping(ApiEndpoints.API_SUGGESTIONS)
@RequiredArgsConstructor
@Slf4j
public class SuggestionsController {

    private final CombinedRecommendationService recommendationService;

    @Autowired
    @Qualifier("recommendationExecutor")
    private Executor recommendationExecutor;

    @Value("${market.vn30.codes}")
    private List<String> vn30Codes;

    /**
     * Get recommendation for a specific stock
     */
    @GetMapping(ApiEndpoints.SUGGESTIONS_BY_CODE_PATH)
    public ResponseEntity<RecommendationResult> getSuggestion(@PathVariable String code) {
        try {
            RecommendationResult result = recommendationService.calculateRecommendation(code);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to calculate suggestion for {}: {}", code, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get suggestions for all VN30 stocks
     * Returns only stocks with actionable signals (not neutral)
     * Results are cached for 5 minutes to improve performance
     * Uses batch database query and parallel processing for optimal performance
     */
    @GetMapping
    @Cacheable(value = "allSuggestions", key = "#includeNeutral")
    public ResponseEntity<List<RecommendationResult>> getAllSuggestions(
            @RequestParam(required = false, defaultValue = "false") boolean includeNeutral) {
        try {
            log.debug("Fetching all suggestions (cache miss), includeNeutral: {}", includeNeutral);
            long startTime = System.currentTimeMillis();

            // Fetch all data in a single batch query
            Map<String, List<DailyStats>> statsByCode = recommendationService.fetch10DaysDataBatch(vn30Codes);
            
            // Process recommendations in parallel
            List<CompletableFuture<RecommendationResult>> futures = vn30Codes.stream()
                    .map(code -> CompletableFuture.supplyAsync(() -> {
                        try {
                            List<DailyStats> stats = statsByCode.getOrDefault(code, new ArrayList<>());
                            return recommendationService.calculateRecommendationFromStats(code, stats);
                        } catch (Exception e) {
                            log.warn("Failed to calculate suggestion for {}: {}", code, e.getMessage());
                            return null;
                        }
                    }, recommendationExecutor))
                    .collect(Collectors.toList());

            // Wait for all futures to complete and collect results
            List<RecommendationResult> suggestions = futures.stream()
                    .map(CompletableFuture::join)
                    .filter(Objects::nonNull)
                    .filter(result -> includeNeutral || !"hold".equals(result.getAction()))
                    .collect(Collectors.toList());

            // Sort by score (highest first)
            suggestions.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

            long duration = System.currentTimeMillis() - startTime;
            log.debug("Fetched {} suggestions in {}ms", suggestions.size(), duration);

            return ResponseEntity.ok(suggestions);
        } catch (Exception e) {
            log.error("Failed to get suggestions: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get top N suggestions (buy or sell signals only)
     * Uses batch database query and parallel processing for optimal performance
     */
    @GetMapping(ApiEndpoints.SUGGESTIONS_TOP_PATH)
    public ResponseEntity<List<RecommendationResult>> getTopSuggestions(
            @RequestParam(required = false, defaultValue = "10") int limit) {
        try {
            long startTime = System.currentTimeMillis();

            // Fetch all data in a single batch query
            Map<String, List<DailyStats>> statsByCode = recommendationService.fetch10DaysDataBatch(vn30Codes);
            
            // Process recommendations in parallel
            List<CompletableFuture<RecommendationResult>> futures = vn30Codes.stream()
                    .map(code -> CompletableFuture.supplyAsync(() -> {
                        try {
                            List<DailyStats> stats = statsByCode.getOrDefault(code, new ArrayList<>());
                            return recommendationService.calculateRecommendationFromStats(code, stats);
                        } catch (Exception e) {
                            log.warn("Failed to calculate suggestion for {}: {}", code, e.getMessage());
                            return null;
                        }
                    }, recommendationExecutor))
                    .collect(Collectors.toList());

            // Wait for all futures to complete and collect results
            List<RecommendationResult> suggestions = futures.stream()
                    .map(CompletableFuture::join)
                    .filter(Objects::nonNull)
                    .filter(result -> !"hold".equals(result.getAction()))
                    .collect(Collectors.toList());

            // Sort by score (absolute value) and confidence
            suggestions.sort((a, b) -> {
                double scoreA = Math.abs(a.getScore()) * a.getConfidence();
                double scoreB = Math.abs(b.getScore()) * b.getConfidence();
                return Double.compare(scoreB, scoreA);
            });

            long duration = System.currentTimeMillis() - startTime;
            log.debug("Fetched top {} suggestions in {}ms", limit, duration);

            return ResponseEntity.ok(suggestions.stream().limit(limit).collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("Failed to get top suggestions: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Refresh cache - evicts all cached suggestions
     * Allows manual cache refresh when needed
     */
    @PostMapping("/refresh")
    @CacheEvict(value = {"recommendations", "allSuggestions"}, allEntries = true)
    public ResponseEntity<Void> refreshCache() {
        log.info("Cache evicted for suggestions - recommendations and allSuggestions");
        return ResponseEntity.ok().build();
    }
}



