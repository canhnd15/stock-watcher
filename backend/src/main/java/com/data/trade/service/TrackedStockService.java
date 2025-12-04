package com.data.trade.service;

import com.data.trade.dto.PortfolioSimulationRequest;
import com.data.trade.dto.PortfolioSimulationResponse;
import com.data.trade.dto.RefreshMarketPriceResponse;
import com.data.trade.dto.TrackedStockWithMarketPriceDTO;
import com.data.trade.model.TrackedStock;
import com.data.trade.model.User;
import com.data.trade.repository.TrackedStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackedStockService {

    private final TrackedStockRepository trackedStockRepository;
    private final FinpathClient finpathClient;

    @Value("${market.vn30.codes}")
    private List<String> vn30Codes;

    /**
     * Get all tracked stocks for a specific user
     * Returns stocks immediately without market price for faster response
     * Frontend will fetch market prices separately via /market-prices endpoint
     */
    public List<TrackedStockWithMarketPriceDTO> getAllTrackedStocksForUser(Long userId) {
        List<TrackedStock> stocks = trackedStockRepository.findAllByUserId(userId);
        
        // Return stocks immediately without market price
        return stocks.stream()
                .map(stock -> TrackedStockWithMarketPriceDTO.fromTrackedStock(stock, null))
                .collect(Collectors.toList());
    }

    /**
     * Get market prices for multiple stock codes in parallel (no cache)
     * Used by frontend to fetch prices asynchronously after stocks are loaded
     */
    public Map<String, BigDecimal> getMarketPricesForCodes(Set<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return Collections.emptyMap();
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

        return result;
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

    /**
     * Refresh market prices for all tracked stocks of a user
     * Uses parallel fetching for better performance
     */
    public RefreshMarketPriceResponse refreshMarketPriceForUser(Long userId) {
        List<TrackedStock> stocks = trackedStockRepository.findAllByUserId(userId);
        
        // Get all codes
        Set<String> codes = stocks.stream()
                .map(TrackedStock::getCode)
                .collect(Collectors.toSet());
        
        // Fetch prices in parallel
        Map<String, BigDecimal> priceMap = getMarketPricesForCodes(codes);
        
        // Build result
        List<TrackedStockWithMarketPriceDTO> result = stocks.stream()
                .map(stock -> {
                    BigDecimal marketPrice = priceMap.get(stock.getCode());
                    return TrackedStockWithMarketPriceDTO.fromTrackedStock(stock, marketPrice);
                })
                .collect(Collectors.toList());
        
        int successCount = (int) result.stream()
                .filter(dto -> dto.getMarketPrice() != null)
                .count();
        
        return new RefreshMarketPriceResponse(
                "Market prices refreshed successfully",
                successCount,
                result.size() - successCount,
                result
        );
    }

    /**
     * Simulate portfolio profit calculation
     */
    public PortfolioSimulationResponse simulatePortfolio(PortfolioSimulationRequest request) {
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

        return PortfolioSimulationResponse.builder()
                .stocks(results)
                .totalProfit(totalProfit)
                .totalCostBasis(totalCostBasis)
                .totalCurrentValue(totalCurrentValue)
                .build();
    }

    /**
     * Add a new tracked stock for a user
     */
    @Transactional
    public TrackedStock addTrackedStock(User user, String code, BigDecimal costBasis, Long volume, BigDecimal targetPrice) {
        // Check if already exists
        if (trackedStockRepository.existsByUserIdAndCode(user.getId(), code.toUpperCase())) {
            throw new IllegalArgumentException("Stock already tracked");
        }

        TrackedStock trackedStock = TrackedStock.builder()
                .user(user)
                .code(code.toUpperCase())
                .active(true)
                .costBasis(costBasis)
                .volume(volume)
                .targetPrice(targetPrice)
                .createdAt(OffsetDateTime.now())
                .build();

        return trackedStockRepository.save(trackedStock);
    }

    /**
     * Delete a tracked stock by ID (with ownership verification)
     */
    @Transactional
    public void deleteTrackedStock(Long id, Long userId) {
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }

        trackedStockRepository.delete(stock);
    }

    /**
     * Toggle active status of a tracked stock (with ownership verification)
     */
    @Transactional
    public TrackedStock toggleTrackedStock(Long id, Long userId) {
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }

        stock.setActive(!stock.getActive());
        return trackedStockRepository.save(stock);
    }

    /**
     * Update a tracked stock (with ownership verification)
     * Note: Frontend now always sends targetPrice in update requests to preserve it.
     *       This method preserves targetPrice if null and other fields are being updated (safety check).
     */
    @Transactional
    public TrackedStock updateTrackedStock(Long id, Long userId, String code, Boolean active, 
                                          BigDecimal costBasis, Long volume, BigDecimal targetPrice) {
        TrackedStock stock = trackedStockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tracked stock not found"));

        // Verify ownership
        if (!stock.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }

        // Check if other fields are being updated (safety check to preserve targetPrice if not provided)
        boolean otherFieldsBeingUpdated = code != null || active != null || 
                                         costBasis != null || volume != null;

        // Update fields if provided
        if (code != null) {
            // Check if new code already exists (if changing code)
            if (!stock.getCode().equals(code.toUpperCase())) {
                if (trackedStockRepository.existsByUserIdAndCode(userId, code.toUpperCase())) {
                    throw new IllegalArgumentException("Stock code already tracked");
                }
                stock.setCode(code.toUpperCase());
            }
        }
        if (active != null) {
            stock.setActive(active);
        }
        // Update costBasis - frontend always sends this (even if null to clear)
        stock.setCostBasis(costBasis);
        // Update volume - frontend always sends this (even if null to clear)
        stock.setVolume(volume);
        
        // Update targetPrice - frontend now always sends this to preserve it
        // Safety check: if targetPrice is null and other fields are being updated, preserve existing value
        // (This handles edge cases where API is called directly without targetPrice)
        if (targetPrice != null || !otherFieldsBeingUpdated) {
            stock.setTargetPrice(targetPrice);
        }
        // Otherwise, preserve existing targetPrice value (safety check for direct API calls)

        return trackedStockRepository.save(stock);
    }

}

