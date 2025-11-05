package com.data.trade.controller;

import com.data.trade.dto.RecommendationResult;
import com.data.trade.service.CombinedRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller for stock trading suggestions
 * Uses combined 4-formula approach based on 10 days of data
 */
@RestController
@RequestMapping("/api/suggestions")
@RequiredArgsConstructor
@Slf4j
public class SuggestionsController {

    private final CombinedRecommendationService recommendationService;

    @Value("${market.vn30.codes}")
    private List<String> vn30Codes;

    /**
     * Get recommendation for a specific stock
     */
    @GetMapping("/{code}")
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
     */
    @GetMapping
    public ResponseEntity<List<RecommendationResult>> getAllSuggestions(
            @RequestParam(required = false, defaultValue = "false") boolean includeNeutral) {
        try {
            List<RecommendationResult> suggestions = new ArrayList<>();

            for (String code : vn30Codes) {
                try {
                    RecommendationResult result = recommendationService.calculateRecommendation(code);
                    if (includeNeutral || !"hold".equals(result.getAction())) {
                        suggestions.add(result);
                    }
                } catch (Exception e) {
                    log.warn("Failed to calculate suggestion for {}: {}", code, e.getMessage());
                }
            }

            // Sort by score (highest first)
            suggestions.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

            return ResponseEntity.ok(suggestions);
        } catch (Exception e) {
            log.error("Failed to get suggestions: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get top N suggestions (buy or sell signals only)
     */
    @GetMapping("/top")
    public ResponseEntity<List<RecommendationResult>> getTopSuggestions(
            @RequestParam(required = false, defaultValue = "10") int limit) {
        try {
            List<RecommendationResult> suggestions = new ArrayList<>();

            for (String code : vn30Codes) {
                try {
                    RecommendationResult result = recommendationService.calculateRecommendation(code);
                    if (!"hold".equals(result.getAction())) {
                        suggestions.add(result);
                    }
                } catch (Exception e) {
                    log.warn("Failed to calculate suggestion for {}: {}", code, e.getMessage());
                }
            }

            // Sort by score (absolute value) and confidence
            suggestions.sort((a, b) -> {
                double scoreA = Math.abs(a.getScore()) * a.getConfidence();
                double scoreB = Math.abs(b.getScore()) * b.getConfidence();
                return Double.compare(scoreB, scoreA);
            });

            return ResponseEntity.ok(suggestions.stream().limit(limit).collect(Collectors.toList()));
        } catch (Exception e) {
            log.error("Failed to get top suggestions: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}



