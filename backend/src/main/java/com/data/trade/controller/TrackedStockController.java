package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.PortfolioSimulationRequest;
import com.data.trade.dto.PortfolioSimulationResponse;
import com.data.trade.dto.TrackedStockStatsDTO;
import com.data.trade.dto.TrackedStockWithMarketPriceDTO;
import com.data.trade.model.TrackedStock;
import com.data.trade.model.User;
import com.data.trade.repository.TrackedStockRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiEndpoints.API_TRACKED_STOCKS)
@RequiredArgsConstructor
@PreAuthorize(RoleConstants.HAS_ANY_ROLE_VIP_ADMIN)
@Slf4j
public class TrackedStockController {

    private final TrackedStockRepository trackedStockRepository;
    private final TrackedStockStatsService trackedStockStatsService;
    private final FinpathClient finpathClient;

    @GetMapping
    public List<TrackedStockWithMarketPriceDTO> getAllTrackedStocks(@AuthenticationPrincipal User currentUser) {
        List<TrackedStock> stocks = trackedStockRepository.findAllByUserId(currentUser.getId());
        
        return stocks.stream()
                .map(stock -> {
                    BigDecimal marketPrice = getMarketPrice(stock.getCode());
                    return TrackedStockWithMarketPriceDTO.fromTrackedStock(stock, marketPrice);
                })
                .collect(Collectors.toList());
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

    @GetMapping(ApiEndpoints.TRACKED_STOCKS_STATS_PATH)
    public Map<String, TrackedStockStatsDTO> getTrackedStockStats(@AuthenticationPrincipal User currentUser) {
        return trackedStockStatsService.getStatsForUser(currentUser.getId());
    }

    @PostMapping("/refresh-market-price")
    public ResponseEntity<?> refreshMarketPrice(@AuthenticationPrincipal User currentUser) {
        try {
            List<TrackedStock> stocks = trackedStockRepository.findAllByUserId(currentUser.getId());
            
            List<TrackedStockWithMarketPriceDTO> result = stocks.stream()
                    .map(stock -> {
                        BigDecimal marketPrice = getMarketPrice(stock.getCode());
                        return TrackedStockWithMarketPriceDTO.fromTrackedStock(stock, marketPrice);
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
        private List<TrackedStockWithMarketPriceDTO> stocks;
        
        public RefreshMarketPriceResponse(String message, int successCount, int failedCount, List<TrackedStockWithMarketPriceDTO> stocks) {
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

                // Get market price
                BigDecimal marketPrice = getMarketPrice(code);

                PortfolioSimulationResponse.SimulatedStockResult result;
                if (marketPrice == null) {
                    result = PortfolioSimulationResponse.SimulatedStockResult.builder()
                            .code(code)
                            .costBasis(costBasis)
                            .volume(volume)
                            .marketPrice(null)
                            .profit(null)
                            .profitPercent(null)
                            .currentValue(null)
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

                    result = PortfolioSimulationResponse.SimulatedStockResult.builder()
                            .code(code)
                            .costBasis(costBasis)
                            .volume(volume)
                            .marketPrice(marketPrice)
                            .profit(profit)
                            .profitPercent(profitPercent)
                            .currentValue(currentValue)
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
    public ResponseEntity<?> addTrackedStock(
            @RequestBody AddTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        // Check if already exists
        if (trackedStockRepository.existsByUserIdAndCode(currentUser.getId(), request.getCode().toUpperCase())) {
            return ResponseEntity.badRequest().body("Stock already tracked");
        }

        TrackedStock trackedStock = TrackedStock.builder()
                .user(currentUser)
                .code(request.getCode().toUpperCase())
                .active(true)
                .costBasis(request.getCostBasis())
                .volume(request.getVolume())
                .createdAt(OffsetDateTime.now())
                .build();

        TrackedStock saved = trackedStockRepository.save(trackedStock);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping(ApiEndpoints.TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> deleteTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        trackedStockRepository.delete(stock);
        return ResponseEntity.ok().build();
    }

    @PutMapping(ApiEndpoints.TRACKED_STOCKS_TOGGLE_PATH)
    public ResponseEntity<?> toggleTrackedStock(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        stock.setActive(!stock.getActive());
        TrackedStock updated = trackedStockRepository.save(stock);
        return ResponseEntity.ok(updated);
    }

    @PutMapping(ApiEndpoints.TRACKED_STOCKS_BY_ID_PATH)
    public ResponseEntity<?> updateTrackedStock(
            @PathVariable Long id,
            @RequestBody UpdateTrackedStockRequest request,
            @AuthenticationPrincipal User currentUser) {
        
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Access denied");
        }

        // Update fields if provided
        if (request.getCode() != null) {
            // Check if new code already exists (if changing code)
            if (!stock.getCode().equals(request.getCode().toUpperCase())) {
                if (trackedStockRepository.existsByUserIdAndCode(currentUser.getId(), request.getCode().toUpperCase())) {
                    return ResponseEntity.badRequest().body("Stock code already tracked");
                }
                stock.setCode(request.getCode().toUpperCase());
            }
        }
        if (request.getActive() != null) {
            stock.setActive(request.getActive());
        }
        // Update costBasis - if sent as null in request, it will clear the value
        stock.setCostBasis(request.getCostBasis());
        // Update volume - if sent as null in request, it will clear the value
        stock.setVolume(request.getVolume());

        TrackedStock updated = trackedStockRepository.save(stock);
        return ResponseEntity.ok(updated);
    }

    @Data
    static class AddTrackedStockRequest {
        private String code;
        private BigDecimal costBasis;
        private Long volume;
    }

    @Data
    static class UpdateTrackedStockRequest {
        private String code;
        private Boolean active;
        private BigDecimal costBasis;
        private Long volume;
    }
}

