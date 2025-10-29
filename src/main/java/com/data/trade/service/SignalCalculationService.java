package com.data.trade.service;

import com.data.trade.dto.SignalNotification;
import com.data.trade.model.Trade;
import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TradeRepository;
import com.data.trade.repository.TrackedStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SignalCalculationService {

    private final TradeRepository tradeRepository;
    private final TrackedStockRepository trackedStockRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${market.vn30.codes}")
    private List<String> vn30;

    public void calculateAndNotifySignals() {
        log.info("========== Starting signal calculation for tracked stocks ==========");

        // Get all active tracked stocks grouped by user
        List<TrackedStock> allTrackedStocks = trackedStockRepository.findAllByActiveTrue();
        
        if (allTrackedStocks.isEmpty()) {
            log.info("No active tracked stocks found. Using VN30 default for broadcast.");
            calculateForVN30Broadcast();
            return;
        }
        
        Map<Long, List<TrackedStock>> stocksByUser = allTrackedStocks.stream()
                .collect(Collectors.groupingBy(ts -> ts.getUser().getId()));
        
        log.info("Processing signals for {} users with tracked stocks", stocksByUser.size());

        int signalsSent = 0;
        int failCount = 0;
        
        for (Map.Entry<Long, List<TrackedStock>> entry : stocksByUser.entrySet()) {
            Long userId = entry.getKey();
            List<TrackedStock> userStocks = entry.getValue();
            
            log.info("Processing {} tracked stocks for user {}", userStocks.size(), userId);
            
            for (TrackedStock stock : userStocks) {
                try {
                    SignalNotification signal = calculateSignalForCode(stock.getCode());
                    if (signal != null) {
                        // Send to specific user's topic
                        messagingTemplate.convertAndSend("/topic/signals/user/" + userId, signal);
                        log.info("Signal sent to user {}: {} for {} (score: {})", 
                            userId, signal.getSignalType(), stock.getCode(), signal.getScore());
                        signalsSent++;
                    }
                } catch (Exception e) {
                    failCount++;
                    log.error("Failed to calculate signal for {} (user {}): {}", 
                        stock.getCode(), userId, e.getMessage());
                }
            }
        }

        log.info("========== Signal calculation completed. Signals sent: {}, Failed: {} ==========", 
                signalsSent, failCount);
    }
    
    private void calculateForVN30Broadcast() {
        log.info("Broadcasting signals for {} VN30 stocks", vn30.size());
        
        int signalsSent = 0;
        for (String code : vn30) {
            try {
                SignalNotification signal = calculateSignalForCode(code);
                if (signal != null) {
                    messagingTemplate.convertAndSend("/topic/signals", signal);
                    log.info("Broadcast signal: {} for {} (score: {})", 
                        signal.getSignalType(), code, signal.getScore());
                    signalsSent++;
                }
            } catch (Exception e) {
                log.error("Failed to calculate VN30 signal for {}: {}", code, e.getMessage());
            }
        }
        log.info("VN30 broadcast completed. Signals sent: {}", signalsSent);
    }

    /**
     * Calculate buy/sell signal for a specific stock code
     * Uses multi-factor analysis including volume imbalance, large blocks, and price momentum
     */
    public SignalNotification calculateSignalForCode(String code) {
        // Find the latest trade for this stock code
        List<Trade> latestTrades = tradeRepository.findLatestByCode(code);
        
        if (latestTrades == null || latestTrades.isEmpty()) {
            log.debug("No trades found for code: {}", code);
            return null;
        }
        
        Trade latestTrade = latestTrades.get(0);
        String latestTradeDate = latestTrade.getTradeDate(); // Format: "DD/MM/YYYY"
        
        // Get all trades from the same date as the latest trade
        // This simplified approach uses same-day trades instead of 30-minute window
        List<Trade> recentTrades = tradeRepository.findByCodeAndTradeDate(code, latestTradeDate);

        if (recentTrades.isEmpty()) {
            log.debug("No trades found for code: {} on date {}", code, latestTradeDate);
            return null;
        }

        // Already sorted by time descending from the query

        // 1. Volume Analysis
        long buyVolume = recentTrades.stream()
                .filter(t -> "buy".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();

        long sellVolume = recentTrades.stream()
                .filter(t -> "sell".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();

        // 2. Large Block Detection (>= 100k shares)
        long largeBuyCount = recentTrades.stream()
                .filter(t -> "buy".equalsIgnoreCase(t.getSide()) && t.getVolume() >= 100000)
                .count();

        long largeSellCount = recentTrades.stream()
                .filter(t -> "sell".equalsIgnoreCase(t.getSide()) && t.getVolume() >= 100000)
                .count();

        // 3. Price Momentum Analysis
        BigDecimal firstPrice = recentTrades.get(recentTrades.size() - 1).getPrice();
        BigDecimal lastPrice = recentTrades.get(0).getPrice();
        double priceChange = 0;
        
        if (firstPrice.compareTo(BigDecimal.ZERO) > 0) {
            priceChange = lastPrice.subtract(firstPrice)
                    .divide(firstPrice, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        // 4. Decision Logic with Scoring System
        int buyScore = 0;
        int sellScore = 0;

        // Volume imbalance factor (weight: 3 points)
        if (buyVolume > sellVolume * 1.5 && buyVolume > 50000) {
            buyScore += 3;
        }
        if (sellVolume > buyVolume * 1.5 && sellVolume > 50000) {
            sellScore += 3;
        }

        // Strong volume imbalance (weight: 2 additional points)
        if (buyVolume > sellVolume * 3 && buyVolume > 100000) {
            buyScore += 2;
        }
        if (sellVolume > buyVolume * 3 && sellVolume > 100000) {
            sellScore += 2;
        }

        // Large block trades factor (weight: 2 points)
        if (largeBuyCount >= 2) {
            buyScore += 2;
        }
        if (largeSellCount >= 2) {
            sellScore += 2;
        }

        // Very large blocks (weight: 1 additional point)
        if (largeBuyCount >= 5) {
            buyScore += 1;
        }
        if (largeSellCount >= 5) {
            sellScore += 1;
        }

        // Price momentum factor (weight: 1 point)
        if (priceChange > 0.5) {
            buyScore += 1;
        }
        if (priceChange < -0.5) {
            sellScore += 1;
        }

        // Strong price movement (weight: 1 additional point)
        if (priceChange > 2.0) {
            buyScore += 1;
        }
        if (priceChange < -2.0) {
            sellScore += 1;
        }

        // Minimum volume threshold to avoid false signals on low liquidity
        long totalVolume = buyVolume + sellVolume;
        if (totalVolume < 50000) {
            return null; // Not enough volume to be confident
        }

        // Generate signal based on scores
        String signalType = null;
        String reason = null;
        int finalScore = 0;

        // Strong signal threshold: score >= 4 and must be stronger than opposite
        if (buyScore >= 4 && buyScore > sellScore) {
            signalType = "BUY";
            finalScore = buyScore;
            
            double volumeRatio = sellVolume > 0 ? (double) buyVolume / sellVolume : buyVolume;
            reason = String.format(
                    "Strong buy pressure detected! Buy volume: %,d vs Sell: %,d (Ratio: %.2fx). " +
                    "Large buy blocks: %d. Price change: %+.2f%%. Total trades: %d",
                    buyVolume, sellVolume, volumeRatio,
                    largeBuyCount, priceChange, recentTrades.size()
            );
        } else if (sellScore >= 4 && sellScore > buyScore) {
            signalType = "SELL";
            finalScore = sellScore;
            
            double volumeRatio = buyVolume > 0 ? (double) sellVolume / buyVolume : sellVolume;
            reason = String.format(
                    "Strong sell pressure detected! Sell volume: %,d vs Buy: %,d (Ratio: %.2fx). " +
                    "Large sell blocks: %d. Price change: %+.2f%%. Total trades: %d",
                    sellVolume, buyVolume, volumeRatio,
                    largeSellCount, priceChange, recentTrades.size()
            );
        }

        if (signalType == null) {
            return null;
        }

        return SignalNotification.builder()
                .code(code)
                .signalType(signalType)
                .reason(reason)
                .buyVolume(buyVolume)
                .sellVolume(sellVolume)
                .lastPrice(lastPrice)
                .timestamp(OffsetDateTime.now())
                .score(finalScore)
                .priceChange(priceChange)
                .build();
    }
}

