package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.PortfolioSimulationRequest;
import com.data.trade.dto.PortfolioSimulationResponse;
import com.data.trade.dto.ShortTermTrackedStockWithMarketPriceDTO;
import com.data.trade.dto.TrackedStockStatsDTO;
import com.data.trade.model.ShortTermTrackedStock;
import com.data.trade.model.User;
import com.data.trade.repository.ShortTermTrackedStockRepository;
import com.data.trade.service.FinpathClient;
import com.data.trade.service.TrackedStockStatsService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiEndpoints.API_SHORT_TERM_TRACKED_STOCKS)
@RequiredArgsConstructor
@PreAuthorize(RoleConstants.HAS_ANY_ROLE_VIP_ADMIN)
@Slf4j
public class ShortTermTrackedStockController {

    private final ShortTermTrackedStockRepository shortTermTrackedStockRepository;
    private final TrackedStockStatsService trackedStockStatsService;
    private final FinpathClient finpathClient;

    /**
     * Get all tracked stocks WITHOUT market price (fast response)
     * Frontend will fetch market prices separately via /market-prices endpoint
     */
    @GetMapping
    public List<ShortTermTrackedStockWithMarketPriceDTO> getAllShortTermTrackedStocks(@AuthenticationPrincipal User currentUser) {
        List<ShortTermTrackedStock> stocks = shortTermTrackedStockRepository.findAllByUserId(currentUser.getId());
        
        // Return stocks immediately without market price for faster response
        return stocks.stream()
                .map(stock -> ShortTermTrackedStockWithMarketPriceDTO.fromShortTermTrackedStock(stock, null))
                .collect(Collectors.toList());
    }

    /**
     * Get market prices for multiple stock codes in parallel (no cache)
     * POST /api/short-term-tracked-stocks/market-prices
     * Body: ["VCB", "FPT", "HPG"]
     * Returns: {"VCB": 85000, "FPT": 125000, "HPG": 45000}
     */
    @PostMapping("/market-prices")
    public ResponseEntity<Map<String, BigDecimal>> getMarketPrices(@RequestBody List<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyMap());
        }

        Map<String, BigDecimal> result = new ConcurrentHashMap<>();
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        // Fetch all prices in parallel
        for (String code : codes) {
            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                BigDecimal price = getMarketPrice(code);
                result.put(code, price); // null if failed
            });
            futures.add(future);
        }

        // Wait for all to complete
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        return ResponseEntity.ok(result);
    }
    
    /**
     * Get market price for a stock code from TradingView API
     */
    private BigDecimal getMarketPrice(String code) {
        try {
            var response = finpathClient.fetchTradingViewBars(code);
            if (response != null) {
                Double price = response.getMarketPrice();
                if (price != null) {
                    return BigDecimal.valueOf(price);
                }
            }
        } catch (Exception e) {
            log.debug("Failed to fetch market price for {}: {}", code, e.getMessage());
        }
        return null;
    }

    @GetMapping(ApiEndpoints.SHORT_TERM_TRACKED_STOCKS_STATS_PATH)
    public Map<String, TrackedStockStatsDTO> getShortTermTrackedStockStats(@AuthenticationPrincipal User currentUser) {
        // Use the same stats service, but filter by short-term tracked stocks
        List<ShortTermTrackedStock> stocks = shortTermTrackedStockRepository.findAllByUserIdAndActiveTrue(currentUser.getId());
        List<String> codes = stocks.stream().map(ShortTermTrackedStock::getCode).collect(Collectors.toList());
        return trackedStockStatsService.getStatsForCodes(codes);
    }

    @PostMapping("/refresh-market-price")
    public ResponseEntity<?> refreshMarketPrice(@AuthenticationPrincipal User currentUser) {
        try {
            List<ShortTermTrackedStock> stocks = shortTermTrackedStockRepository.findAllByUserId(currentUser.getId());
            
            // Get all codes
            Set<String> codes = stocks.stream()
                    .map(ShortTermTrackedStock::getCode)
                    .collect(Collectors.toSet());
            
            // Fetch prices in parallel
            Map<String, BigDecimal> priceMap = new ConcurrentHashMap<>();
            List<CompletableFuture<Void>> futures = new ArrayList<>();
            
            for (String code : codes) {
                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    BigDecimal price = getMarketPrice(code);
                    priceMap.put(code, price);
                });
                futures.add(future);
            }
            
            // Wait for all to complete
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            
            // Build result
            List<ShortTermTrackedStockWithMarketPriceDTO> result = stocks.stream()
                    .map(stock -> {
                        BigDecimal marketPrice = priceMap.get(stock.getCode());
                        return ShortTermTrackedStockWithMarketPriceDTO.fromShortTermTrackedStock(stock, marketPrice);
                    })
                    .collect(Collectors.toList());
            
            int successCount = (int) result.stream()
                    .filter(dto -> dto.getMarketPrice() != null)
                    .count();
            
            return ResponseEntity.ok(new RefreshMarketPriceResponse(
                    "Market prices refreshed successfully",
                    successCount,
                    result.size() - successCount,
                    result
            ));
        } catch (Exception e) {
            log.error("Failed to refresh market prices", e);
            return ResponseEntity.status(500).body("Failed to refresh market prices: " + e.getMessage());
        }
    }
    
    @Data
    static class RefreshMarketPriceResponse {
        private String message;
        private int successCount;
        private int failedCount;
        private List<ShortTermTrackedStockWithMarketPriceDTO> stocks;
        
        public RefreshMarketPriceResponse(String message, int successCount, int failedCount, List<ShortTermTrackedStockWithMarketPriceDTO> stocks) {
            this.message = message;
            this.successCount = successCount;
            this.failedCount = failedCount;
            this.stocks = stocks;
        }
    }

    /**
     * Simulate portfolio profit calculation
     * Accepts a list of stocks with cost basis and volume, returns profit calculations
     */
    @PostMapping("/simulate-portfolio")
    public ResponseEntity<PortfolioSimulationResponse> simulatePortfolio(
            @Valid @RequestBody PortfolioSimulationRequest request) {
        try {
            List<PortfolioSimulationResponse.SimulatedStockResult> results = new ArrayList<>();
            BigDecimal totalProfit = BigDecimal.ZERO;
            BigDecimal totalCostBasis = BigDecimal.ZERO;
            BigDecimal totalCurrentValue = BigDecimal.ZERO;

            for (PortfolioSimulationRequest.SimulatedStock stock : request.getStocks()) {
                String code = stock.getCode().toUpperCase();
                BigDecimal costBasis = stock.getCostBasis();
                Long volume = stock.getVolume();
                BigDecimal targetPrice = stock.getTargetPrice();

                // Get market price
                BigDecimal marketPrice = getMarketPrice(code);

                PortfolioSimulationResponse.SimulatedStockResult result;
                if (marketPrice == null) {
                    result = PortfolioSimulationResponse.SimulatedStockResult.builder()
                            .code(code)
                            .costBasis(costBasis)
                            .volume(volume)
                            .targetPrice(targetPrice)
                            .marketPrice(null)
                            .profit(null)
                            .profitPercent(null)
                            .currentValue(null)
                            .targetProfit(null)
                            .error("Failed to fetch market price")
                            .build();
                } else {
                    // Calculate profit
                    BigDecimal currentValue = (volume != null && volume > 0) 
                            ? marketPrice.multiply(BigDecimal.valueOf(volume))
                            : BigDecimal.ZERO;
                    BigDecimal profit = (costBasis != null && volume != null && volume > 0)
                            ? marketPrice.subtract(costBasis).multiply(BigDecimal.valueOf(volume))
                            : null;
                    BigDecimal profitPercent = (costBasis != null && costBasis.compareTo(BigDecimal.ZERO) > 0)
                            ? marketPrice.subtract(costBasis)
                                    .divide(costBasis, 4, RoundingMode.HALF_UP)
                                    .multiply(BigDecimal.valueOf(100))
                            : null;
                    
                    // Calculate target profit: (targetPrice - costBasis) * volume
                    BigDecimal targetProfit = (targetPrice != null && costBasis != null && volume != null && volume > 0)
                            ? targetPrice.subtract(costBasis).multiply(BigDecimal.valueOf(volume))
                            : null;

                    result = PortfolioSimulationResponse.SimulatedStockResult.builder()
                            .code(code)
                            .costBasis(costBasis)
                            .volume(volume)
                            .targetPrice(targetPrice)
                            .marketPrice(marketPrice)
                            .profit(profit)
                            .profitPercent(profitPercent)
                            .currentValue(currentValue)
                            .targetProfit(targetProfit)
                            .error(null)
                            .build();

                    // Accumulate totals
                    if (profit != null) {
                        totalProfit = totalProfit.add(profit);
                    }
                    if (costBasis != null && volume != null && volume > 0) {
                        totalCostBasis = totalCostBasis.add(costBasis.multiply(BigDecimal.valueOf(volume)));
                    }
                    if (currentValue != null) {
                        totalCurrentValue = totalCurrentValue.add(currentValue);
                    }
                }

                results.add(result);
            }

            PortfolioSimulationResponse response = PortfolioSimulationResponse.builder()
                    .stocks(results)
                    .totalProfit(totalProfit)
                    .totalCostBasis(totalCostBasis)
                    .totalCurrentValue(totalCurrentValue)
                    .build();

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to simulate portfolio", e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> addShortTermTrackedStock(
            @RequestBody AddShortTermTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        // Check if already exists
        if (shortTermTrackedStockRepository.existsByUserIdAndCode(currentUser.getId(), request.getCode().toUpperCase())) {
            return ResponseEntity.badRequest().body("Stock already tracked");
        }

        ShortTermTrackedStock trackedStock = ShortTermTrackedStock.builder()
                .user(currentUser)
                .code(request.getCode().toUpperCase())
                .active(true)
                .costBasis(request.getCostBasis())
                .volume(request.getVolume())
                .targetPrice(request.getTargetPrice())
                .createdAt(OffsetDateTime.now())
                .build();

        ShortTermTrackedStock saved = shortTermTrackedStockRepository.save(trackedStock);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping(ApiEndpoints.SHORT_TERM_TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> deleteShortTermTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        
        ShortTermTrackedStock stock = shortTermTrackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Short-term tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        shortTermTrackedStockRepository.delete(stock);
        return ResponseEntity.ok().build();
    }

    @PutMapping(ApiEndpoints.SHORT_TERM_TRACKED_STOCKS_TOGGLE_PATH)
    public ResponseEntity<?> toggleShortTermTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        
        ShortTermTrackedStock stock = shortTermTrackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Short-term tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        stock.setActive(!stock.getActive());
        ShortTermTrackedStock updated = shortTermTrackedStockRepository.save(stock);
        return ResponseEntity.ok(updated);
    }

    @PutMapping(ApiEndpoints.SHORT_TERM_TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> updateShortTermTrackedStock(
            @PathVariable Long id,
            @RequestBody UpdateShortTermTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        ShortTermTrackedStock stock = shortTermTrackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Short-term tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        // Check if other fields are being updated (safety check to preserve targetPrice if not provided)
        boolean otherFieldsBeingUpdated = request.getCode() != null || request.getActive() != null || 
                                         request.getCostBasis() != null || request.getVolume() != null;

        // Update fields if provided
        if (request.getCode() != null) {
            // Check if new code already exists (if changing code)
            if (!stock.getCode().equals(request.getCode().toUpperCase())) {
                if (shortTermTrackedStockRepository.existsByUserIdAndCode(currentUser.getId(), request.getCode().toUpperCase())) {
                    return ResponseEntity.badRequest().body("Stock code already tracked");
                }
                stock.setCode(request.getCode().toUpperCase());
            }
        }
        if (request.getActive() != null) {
            stock.setActive(request.getActive());
        }
        // Update costBasis - frontend always sends this (even if null to clear)
        stock.setCostBasis(request.getCostBasis());
        // Update volume - frontend always sends this (even if null to clear)
        stock.setVolume(request.getVolume());
        
        // Update targetPrice - frontend now always sends this to preserve it
        // Safety check: if targetPrice is null and other fields are being updated, preserve existing value
        // (This handles edge cases where API is called directly without targetPrice)
        if (request.getTargetPrice() != null || !otherFieldsBeingUpdated) {
            stock.setTargetPrice(request.getTargetPrice());
        }
        // Otherwise, preserve existing targetPrice value (safety check for direct API calls)

        ShortTermTrackedStock updated = shortTermTrackedStockRepository.save(stock);
        return ResponseEntity.ok(updated);
    }

    @Data
    static class AddShortTermTrackedStockRequest {
        private String code;
        private BigDecimal costBasis;
        private Long volume;
        private BigDecimal targetPrice;
    }

    @Data
    static class UpdateShortTermTrackedStockRequest {
        private String code;
        private Boolean active;
        private BigDecimal costBasis;
        private Long volume;
        private BigDecimal targetPrice;
    }
}

