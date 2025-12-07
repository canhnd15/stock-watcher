package com.data.trade.service;

import com.data.trade.dto.*;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for calculating combined recommendation using 4 different formulas
 * Based on 10 days of trading data
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CombinedRecommendationService {

    private final TradeRepository tradeRepository;

    private static final DateTimeFormatter DD_MM_YYYY_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // Day weights for exponential decay (recent days more important)
    private static final double[] DAY_WEIGHTS = {1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2};

    /**
     * Pre-computed statistics for performance optimization
     * Converts BigDecimal to primitives and pre-calculates common values
     */
    private static class PrecomputedStats {
        final int size;
        final double[] closePrices;
        final double[] openPrices;
        final double[] highPrices;
        final double[] lowPrices;
        final long[] buyVolumes;
        final long[] sellVolumes;
        final long[] totalVolumes;
        final long[] largeBuyBlocks;
        final long[] largeSellBlocks;
        
        // Pre-computed sums
        final long totalBuyVolume;
        final long totalSellVolume;
        final long totalLargeBuys;
        final long totalLargeSells;
        
        PrecomputedStats(List<DailyStats> stats) {
            this.size = stats.size();
            int maxSize = Math.min(size, 10);
            
            this.closePrices = new double[maxSize];
            this.openPrices = new double[maxSize];
            this.highPrices = new double[maxSize];
            this.lowPrices = new double[maxSize];
            this.buyVolumes = new long[maxSize];
            this.sellVolumes = new long[maxSize];
            this.totalVolumes = new long[maxSize];
            this.largeBuyBlocks = new long[maxSize];
            this.largeSellBlocks = new long[maxSize];
            
            long totalBuy = 0;
            long totalSell = 0;
            long totalLargeBuy = 0;
            long totalLargeSell = 0;
            
            for (int i = 0; i < maxSize; i++) {
                DailyStats day = stats.get(i);
                closePrices[i] = day.getClosePrice() != null ? day.getClosePrice().doubleValue() : 0.0;
                openPrices[i] = day.getOpenPrice() != null ? day.getOpenPrice().doubleValue() : 0.0;
                highPrices[i] = day.getHighPrice() != null ? day.getHighPrice().doubleValue() : 0.0;
                lowPrices[i] = day.getLowPrice() != null ? day.getLowPrice().doubleValue() : 0.0;
                buyVolumes[i] = day.getBuyVolume() != null ? day.getBuyVolume() : 0L;
                sellVolumes[i] = day.getSellVolume() != null ? day.getSellVolume() : 0L;
                totalVolumes[i] = day.getTotalVolume() != null ? day.getTotalVolume() : 0L;
                largeBuyBlocks[i] = day.getLargeBuyBlocks() != null ? day.getLargeBuyBlocks() : 0L;
                largeSellBlocks[i] = day.getLargeSellBlocks() != null ? day.getLargeSellBlocks() : 0L;
                
                totalBuy += buyVolumes[i];
                totalSell += sellVolumes[i];
                totalLargeBuy += largeBuyBlocks[i];
                totalLargeSell += largeSellBlocks[i];
            }
            
            this.totalBuyVolume = totalBuy;
            this.totalSellVolume = totalSell;
            this.totalLargeBuys = totalLargeBuy;
            this.totalLargeSells = totalLargeSell;
        }
    }

    /**
     * Calculate combined recommendation for a stock based on 10 days of data
     * Results are cached for 5 minutes per stock code to improve performance
     */
    @Cacheable(value = "recommendations", key = "#stockCode")
    public RecommendationResult calculateRecommendation(String stockCode) {
        log.debug("Calculating recommendation for stock: {} (cache miss)", stockCode);

        // Fetch 10 days of data
        List<DailyStats> dailyStats = fetch10DaysData(stockCode);

        if (dailyStats.isEmpty()) {
            return RecommendationResult.builder()
                    .code(stockCode)
                    .action("hold")
                    .strength("neutral")
                    .confidence(0.0)
                    .reason("No trading data available")
                    .build();
        }

        if (dailyStats.size() < 5) {
            return RecommendationResult.builder()
                    .code(stockCode)
                    .action("hold")
                    .strength("neutral")
                    .confidence(0.0)
                    .reason("Insufficient data (need at least 5 days)")
                    .build();
        }

        // Pre-compute values once for all formulas
        PrecomputedStats precomputed = new PrecomputedStats(dailyStats);
        
        // Calculate all 4 formulas using pre-computed values
        FormulaResult formula1 = calculateWeightedVolumePriceMomentum(precomputed);
        FormulaResult formula2 = calculateMovingAverageCrossover(precomputed);
        FormulaResult formula3 = calculateRSIWithVolume(precomputed);
        FormulaResult formula4 = calculateTrendStrengthADLine(precomputed);

        // Combine results
        CombinedResult combined = combineResults(formula1, formula2, formula3, formula4);

        // Generate final recommendation
        return generateFinalRecommendation(combined, dailyStats, stockCode);
    }

    /**
     * Fetch last 10 trading days of aggregated data for multiple stocks in batch
     * Returns a map of stock code to list of daily stats
     */
    public Map<String, List<DailyStats>> fetch10DaysDataBatch(List<String> stockCodes) {
        if (stockCodes == null || stockCodes.isEmpty()) {
            return new HashMap<>();
        }

        List<Object[]> results = tradeRepository.findLast10DaysStatsForMultipleCodes(stockCodes);

        // Group results by stock code
        Map<String, List<DailyStats>> statsByCode = new HashMap<>();
        
        for (Object[] row : results) {
            String code = (String) row[0];
            DailyStats stats = DailyStats.builder()
                    .tradeDate((String) row[1])
                    .closePrice(((Number) row[2]).doubleValue() > 0 ? 
                        BigDecimal.valueOf(((Number) row[2]).doubleValue()) : null)
                    .openPrice(((Number) row[3]).doubleValue() > 0 ? 
                        BigDecimal.valueOf(((Number) row[3]).doubleValue()) : null)
                    .highPrice(((Number) row[4]).doubleValue() > 0 ? 
                        BigDecimal.valueOf(((Number) row[4]).doubleValue()) : null)
                    .lowPrice(((Number) row[5]).doubleValue() > 0 ? 
                        BigDecimal.valueOf(((Number) row[5]).doubleValue()) : null)
                    .buyVolume(((Number) row[6]).longValue())
                    .sellVolume(((Number) row[7]).longValue())
                    .totalVolume(((Number) row[8]).longValue())
                    .largeBuyBlocks(((Number) row[9]).longValue())
                    .largeSellBlocks(((Number) row[10]).longValue())
                    .mediumBuyBlocks(((Number) row[11]).longValue())
                    .mediumSellBlocks(((Number) row[12]).longValue())
                    .build();

            if (stats.getClosePrice() != null && stats.getClosePrice().compareTo(BigDecimal.ZERO) > 0) {
                statsByCode.computeIfAbsent(code, k -> new ArrayList<>()).add(stats);
            }
        }

        // Sort each list by date (most recent first)
        statsByCode.values().forEach(list -> 
            list.sort((a, b) -> {
                int dateA = Integer.parseInt(a.getTradeDate().substring(6, 10) + 
                                             a.getTradeDate().substring(3, 5) + 
                                             a.getTradeDate().substring(0, 2));
                int dateB = Integer.parseInt(b.getTradeDate().substring(6, 10) + 
                                             b.getTradeDate().substring(3, 5) + 
                                             b.getTradeDate().substring(0, 2));
                return Integer.compare(dateB, dateA);
            })
        );

        return statsByCode;
    }

    /**
     * Fetch last 10 trading days of aggregated data
     */
    private List<DailyStats> fetch10DaysData(String stockCode) {
        List<Object[]> results = tradeRepository.findLast10DaysStats(stockCode);

        return results.stream()
                .map(row -> DailyStats.builder()
                        .tradeDate((String) row[0])
                        .closePrice(((Number) row[1]).doubleValue() > 0 ? 
                            BigDecimal.valueOf(((Number) row[1]).doubleValue()) : null)
                        .openPrice(((Number) row[2]).doubleValue() > 0 ? 
                            BigDecimal.valueOf(((Number) row[2]).doubleValue()) : null)
                        .highPrice(((Number) row[3]).doubleValue() > 0 ? 
                            BigDecimal.valueOf(((Number) row[3]).doubleValue()) : null)
                        .lowPrice(((Number) row[4]).doubleValue() > 0 ? 
                            BigDecimal.valueOf(((Number) row[4]).doubleValue()) : null)
                        .buyVolume(((Number) row[5]).longValue())
                        .sellVolume(((Number) row[6]).longValue())
                        .totalVolume(((Number) row[7]).longValue())
                        .largeBuyBlocks(((Number) row[8]).longValue())
                        .largeSellBlocks(((Number) row[9]).longValue())
                        .mediumBuyBlocks(((Number) row[10]).longValue())
                        .mediumSellBlocks(((Number) row[11]).longValue())
                        .build())
                .filter(stats -> stats.getClosePrice() != null && stats.getClosePrice().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());
    }

    /**
     * Calculate recommendation for a stock using pre-fetched daily stats
     * This method is used for batch processing to avoid redundant database queries
     */
    public RecommendationResult calculateRecommendationFromStats(String stockCode, List<DailyStats> dailyStats) {
        if (dailyStats == null || dailyStats.isEmpty()) {
            return RecommendationResult.builder()
                    .code(stockCode)
                    .action("hold")
                    .strength("neutral")
                    .confidence(0.0)
                    .reason("No trading data available")
                    .build();
        }

        if (dailyStats.size() < 5) {
            return RecommendationResult.builder()
                    .code(stockCode)
                    .action("hold")
                    .strength("neutral")
                    .confidence(0.0)
                    .reason("Insufficient data (need at least 5 days)")
                    .build();
        }

        // Pre-compute values once for all formulas
        PrecomputedStats precomputed = new PrecomputedStats(dailyStats);
        
        // Calculate all 4 formulas using pre-computed values
        FormulaResult formula1 = calculateWeightedVolumePriceMomentum(precomputed);
        FormulaResult formula2 = calculateMovingAverageCrossover(precomputed);
        FormulaResult formula3 = calculateRSIWithVolume(precomputed);
        FormulaResult formula4 = calculateTrendStrengthADLine(precomputed);

        // Combine results
        CombinedResult combined = combineResults(formula1, formula2, formula3, formula4);

        // Generate final recommendation
        return generateFinalRecommendation(combined, dailyStats, stockCode);
    }

    /**
     * Calculate recommendations for multiple stocks in batch
     * Uses a single database query to fetch all data, then processes in parallel
     */
    public List<RecommendationResult> calculateRecommendationsBatch(List<String> stockCodes) {
        if (stockCodes == null || stockCodes.isEmpty()) {
            return new ArrayList<>();
        }

        // Fetch all data in a single query
        Map<String, List<DailyStats>> statsByCode = fetch10DaysDataBatch(stockCodes);

        // Calculate recommendations for each stock
        return stockCodes.stream()
                .map(code -> {
                    List<DailyStats> stats = statsByCode.getOrDefault(code, new ArrayList<>());
                    return calculateRecommendationFromStats(code, stats);
                })
                .collect(Collectors.toList());
    }

    /**
     * Formula 1: Weighted Volume-Price Momentum
     * Analyzes volume accumulation and price momentum over 10 days
     */
    private FormulaResult calculateWeightedVolumePriceMomentum(PrecomputedStats p) {
        if (p.size < 2) {
            return FormulaResult.builder()
                    .formulaName("VolumePriceMomentum")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Insufficient data")
                    .build();
        }

        double volumeScore = 0;
        double priceMomentum = 0;
        double blockScore = 0;

        // 1. Volume Accumulation Score (weighted by day importance)
        int maxDays = Math.min(p.size, DAY_WEIGHTS.length);
        for (int i = 0; i < maxDays; i++) {
            long totalVol = p.buyVolumes[i] + p.sellVolumes[i];
            if (totalVol > 0) {
                double dayRatio = (double) (p.buyVolumes[i] - p.sellVolumes[i]) / totalVol;
                volumeScore += dayRatio * DAY_WEIGHTS[i] * 10;
            }
        }
        volumeScore = Math.max(-30, Math.min(30, volumeScore));

        // 2. Price Momentum Score (using primitives)
        int maxDaysMinus1 = Math.min(p.size - 1, DAY_WEIGHTS.length - 1);
        for (int i = 0; i < maxDaysMinus1; i++) {
            double currentPrice = p.closePrices[i];
            double previousPrice = p.closePrices[i + 1];
            if (previousPrice > 0) {
                double dayChange = ((currentPrice - previousPrice) / previousPrice) * 100;
                priceMomentum += dayChange * DAY_WEIGHTS[i] * 0.5;
            }
        }
        priceMomentum = Math.max(-30, Math.min(30, priceMomentum));

        // 3. Large Block Frequency (using pre-computed sums)
        long totalBlocks = p.totalLargeBuys + p.totalLargeSells;
        if (totalBlocks > 0) {
            double blockRatio = (double) (p.totalLargeBuys - p.totalLargeSells) / totalBlocks;
            blockScore = blockRatio * 20;
        }

        // Calculate final score
        double finalScore = volumeScore + priceMomentum + blockScore;
        finalScore = Math.max(-100, Math.min(100, finalScore));

        // Determine vote and confidence
        String vote;
        double confidence;
        String reason;

        if (finalScore >= 40) {
            vote = "BUY";
            confidence = Math.min(0.9, 0.5 + (finalScore / 200));
            reason = "Strong volume-price momentum (score: " + String.format("%.1f", finalScore) + "). Buy volume accumulation and positive price trend.";
        } else if (finalScore >= 20) {
            vote = "BUY";
            confidence = Math.min(0.7, 0.4 + (finalScore / 200));
            reason = "Positive volume-price momentum (score: " + String.format("%.1f", finalScore) + "). Moderate buying pressure detected.";
        } else if (finalScore <= -40) {
            vote = "SELL";
            confidence = Math.min(0.9, 0.5 + (Math.abs(finalScore) / 200));
            reason = "Strong negative volume-price momentum (score: " + String.format("%.1f", finalScore) + "). Sell volume accumulation and negative price trend.";
        } else if (finalScore <= -20) {
            vote = "SELL";
            confidence = Math.min(0.7, 0.4 + (Math.abs(finalScore) / 200));
            reason = "Negative volume-price momentum (score: " + String.format("%.1f", finalScore) + "). Moderate selling pressure detected.";
        } else {
            vote = "NEUTRAL";
            confidence = 0.3;
            reason = "Neutral volume-price momentum (score: " + String.format("%.1f", finalScore) + "). No clear trend.";
        }

        return FormulaResult.builder()
                .formulaName("VolumePriceMomentum")
                .score(finalScore)
                .vote(vote)
                .confidence(confidence)
                .reason(reason)
                .build();
    }

    /**
     * Formula 2: Moving Average Crossover
     * Analyzes 5-day and 10-day moving averages
     */
    private FormulaResult calculateMovingAverageCrossover(PrecomputedStats p) {
        if (p.size < 5) {
            return FormulaResult.builder()
                    .formulaName("MACrossover")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Insufficient data for MA calculation")
                    .build();
        }

        // Calculate 5-day and 10-day moving averages in single pass
        double ma5Sum = 0;
        double ma10Sum = 0;
        long recentVolume = 0;
        long totalVolume10d = 0;
        int maxDays = Math.min(p.size, 10);
        
        for (int i = 0; i < maxDays; i++) {
            double price = p.closePrices[i];
            if (i < 5) ma5Sum += price;
            ma10Sum += price;
            if (i < 3) recentVolume += p.totalVolumes[i];
            totalVolume10d += p.totalVolumes[i];
        }
        
        double ma5 = ma5Sum / Math.min(5, p.size);
        double ma10 = ma10Sum / maxDays;

        if (ma5 == 0 || ma10 == 0) {
            return FormulaResult.builder()
                    .formulaName("MACrossover")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Unable to calculate moving averages")
                    .build();
        }

        // Calculate previous day's MA5 (if available)
        double ma5Yesterday = ma5;
        if (p.size >= 6) {
            double ma5YesterdaySum = 0;
            for (int i = 1; i <= 5; i++) {
                ma5YesterdaySum += p.closePrices[i];
            }
            ma5Yesterday = ma5YesterdaySum / 5;
        }

        double currentPrice = p.closePrices[0];

        // Calculate volume trend
        long avgVolume10d = totalVolume10d / maxDays;
        double volumeTrend = avgVolume10d > 0 ? (double) (recentVolume / 3.0 - avgVolume10d) / avgVolume10d : 0;

        // Score calculation
        double score = 0;

        // Bullish crossover (MA5 crosses above MA10)
        boolean bullishCrossover = (ma5 > ma10) && (ma5Yesterday <= ma10);
        if (bullishCrossover) {
            score += 40;
        } else if (ma5 > ma10) {
            score += 20; // MA5 above MA10 but no crossover
        }

        // Price above MA5
        if (currentPrice > ma5) {
            score += 20;
        } else if (currentPrice < ma5) {
            score -= 20;
        }

        // Volume confirmation
        if (volumeTrend > 0.2) {
            score += 20; // Volume increasing
        } else if (volumeTrend < -0.2) {
            score -= 20; // Volume decreasing
        }

        // Bearish crossover
        boolean bearishCrossover = (ma5 < ma10) && (ma5Yesterday >= ma10);
        if (bearishCrossover) {
            score -= 40;
        } else if (ma5 < ma10) {
            score -= 20; // MA5 below MA10 but no crossover
        }

        score = Math.max(-100, Math.min(100, score));

        String vote;
        double confidence;
        String reason;

        if (score >= 60) {
            vote = "BUY";
            confidence = 0.8;
            reason = "Bullish MA crossover: MA5(" + (int)ma5 + ") > MA10(" + (int)ma10 + "). Price above MA5. Volume increasing.";
        } else if (score >= 40) {
            vote = "BUY";
            confidence = 0.6;
            reason = "MA5(" + (int)ma5 + ") above MA10(" + (int)ma10 + "). Positive trend confirmed.";
        } else if (score <= -60) {
            vote = "SELL";
            confidence = 0.8;
            reason = "Bearish MA crossover: MA5(" + (int)ma5 + ") < MA10(" + (int)ma10 + "). Price below MA5. Volume decreasing.";
        } else if (score <= -40) {
            vote = "SELL";
            confidence = 0.6;
            reason = "MA5(" + (int)ma5 + ") below MA10(" + (int)ma10 + "). Negative trend confirmed.";
        } else {
            vote = "NEUTRAL";
            confidence = 0.4;
            reason = "Mixed MA signals. MA5(" + (int)ma5 + ") vs MA10(" + (int)ma10 + ").";
        }

        return FormulaResult.builder()
                .formulaName("MACrossover")
                .score(score)
                .vote(vote)
                .confidence(confidence)
                .reason(reason)
                .build();
    }

    /**
     * Formula 3: RSI-Style Relative Strength with Volume Weighting
     */
    private FormulaResult calculateRSIWithVolume(PrecomputedStats p) {
        if (p.size < 2) {
            return FormulaResult.builder()
                    .formulaName("RSI")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Insufficient data for RSI calculation")
                    .build();
        }

        // Calculate gains and losses weighted by volume and day importance (using primitives)
        double avgGain = 0;
        double avgLoss = 0;
        double totalWeight = 0;

        int maxDaysMinus1 = Math.min(p.size - 1, DAY_WEIGHTS.length - 1);
        for (int i = 0; i < maxDaysMinus1; i++) {
            double currentPrice = p.closePrices[i];
            double previousPrice = p.closePrices[i + 1];
            
            if (previousPrice > 0) {
                double change = currentPrice - previousPrice;
                double volume = p.totalVolumes[i];
                double weight = DAY_WEIGHTS[i] * (volume / 1000000.0); // Normalize volume
                
                if (change > 0) {
                    avgGain += change * weight;
                } else {
                    avgLoss += Math.abs(change) * weight;
                }
                totalWeight += weight;
            }
        }

        if (totalWeight == 0) {
            return FormulaResult.builder()
                    .formulaName("RSI")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Unable to calculate RSI")
                    .build();
        }

        avgGain /= totalWeight;
        avgLoss /= totalWeight;

        // Calculate RSI
        double rs = avgLoss == 0 ? 100 : avgGain / avgLoss;
        double rsi = 100 - (100 / (1 + rs));

        // Volume confirmation (using pre-computed sums)
        double volumeRatio = p.totalSellVolume > 0 ? (double) p.totalBuyVolume / p.totalSellVolume : p.totalBuyVolume;

        // Score calculation
        double score = 0;

        // RSI oversold (below 30) with buying pressure
        if (rsi < 30 && volumeRatio > 1.5) {
            score = 80; // Strong buy
        } else if (rsi < 40 && volumeRatio > 1.2) {
            score = 50; // Buy
        } else if (rsi > 70 && volumeRatio < 0.67) {
            score = -80; // Strong sell
        } else if (rsi > 60 && volumeRatio < 0.83) {
            score = -50; // Sell
        } else if (rsi >= 40 && rsi <= 60) {
            score = 0; // Neutral
        } else {
            // RSI in extreme zones but volume doesn't confirm
            score = rsi < 40 ? 20 : -20;
        }

        String vote;
        double confidence;
        String reason;

        if (score >= 60) {
            vote = "BUY";
            confidence = 0.8;
            reason = "RSI oversold (" + String.format("%.1f", rsi) + ") with strong buying pressure (volume ratio: " + String.format("%.2f", volumeRatio) + "). Potential reversal.";
        } else if (score >= 40) {
            vote = "BUY";
            confidence = 0.6;
            reason = "RSI low (" + String.format("%.1f", rsi) + ") with buying pressure (volume ratio: " + String.format("%.2f", volumeRatio) + ").";
        } else if (score <= -60) {
            vote = "SELL";
            confidence = 0.8;
            reason = "RSI overbought (" + String.format("%.1f", rsi) + ") with strong selling pressure (volume ratio: " + String.format("%.2f", volumeRatio) + "). Potential reversal.";
        } else if (score <= -40) {
            vote = "SELL";
            confidence = 0.6;
            reason = "RSI high (" + String.format("%.1f", rsi) + ") with selling pressure (volume ratio: " + String.format("%.2f", volumeRatio) + ").";
        } else {
            vote = "NEUTRAL";
            confidence = 0.4;
            reason = "RSI neutral (" + String.format("%.1f", rsi) + "). No clear momentum.";
        }

        return FormulaResult.builder()
                .formulaName("RSI")
                .score(score)
                .vote(vote)
                .confidence(confidence)
                .reason(reason)
                .build();
    }

    /**
     * Formula 4: Trend Strength with Accumulation/Distribution Line
     */
    private FormulaResult calculateTrendStrengthADLine(PrecomputedStats p) {
        if (p.size < 2) {
            return FormulaResult.builder()
                    .formulaName("TrendStrength")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Insufficient data")
                    .build();
        }

        // Calculate Accumulation/Distribution Line (using primitives)
        double adLine = 0;
        int maxDays = Math.min(p.size, DAY_WEIGHTS.length);
        for (int i = 0; i < maxDays; i++) {
            double close = p.closePrices[i];
            double low = p.lowPrices[i];
            double high = p.highPrices[i];
            long volume = p.totalVolumes[i];

            if (high > low) {
                // Money Flow Multiplier
                double hlcRange = high - low;
                double closeMinusLow = close - low;
                double highMinusClose = high - close;
                
                double mfm = (closeMinusLow - highMinusClose) / hlcRange;
                
                adLine += mfm * volume * DAY_WEIGHTS[i];
            }
        }

        // Price trend (10-day change) - using primitives
        double latestPrice = p.closePrices[0];
        int oldestIdx = Math.min(p.size - 1, 9);
        double oldestPrice = p.closePrices[oldestIdx];
        double priceChange10d = 0;
        if (oldestPrice > 0) {
            priceChange10d = ((latestPrice - oldestPrice) / oldestPrice) * 100;
        }

        // VWAP trend (simplified) - single pass calculation
        double recentPriceVolume = 0;
        long recentVol = 0;
        double olderPriceVolume = 0;
        long olderVol = 0;
        
        int maxDays5 = Math.min(p.size, 5);
        for (int i = 0; i < maxDays5; i++) {
            recentPriceVolume += p.closePrices[i] * p.totalVolumes[i];
            recentVol += p.totalVolumes[i];
        }
        
        int maxDays10 = Math.min(p.size, 10);
        for (int i = 5; i < maxDays10; i++) {
            olderPriceVolume += p.closePrices[i] * p.totalVolumes[i];
            olderVol += p.totalVolumes[i];
        }
        
        double vwapTrend = 0;
        if (recentVol > 0 && olderVol > 0) {
            double recentVWAP = recentPriceVolume / recentVol;
            double olderVWAP = olderPriceVolume / olderVol;
            vwapTrend = ((recentVWAP - olderVWAP) / olderVWAP) * 100;
        }

        // Score calculation
        double score = 0;

        // A/D Line positive with uptrend
        if (adLine > 0 && priceChange10d > 2) {
            score += 40;
        } else if (adLine > 0 && priceChange10d > 0) {
            score += 20;
        } else if (adLine < 0 && priceChange10d < -2) {
            score -= 40;
        } else if (adLine < 0 && priceChange10d < 0) {
            score -= 20;
        }

        // VWAP trend
        if (vwapTrend > 1) {
            score += 20;
        } else if (vwapTrend < -1) {
            score -= 20;
        }

        score = Math.max(-100, Math.min(100, score));

        String vote;
        double confidence;
        String reason;

        if (score >= 40) {
            vote = "BUY";
            confidence = 0.8;
            reason = "Strong accumulation trend. A/D Line positive, price up " + String.format("%.2f", priceChange10d) + "%, VWAP trending up.";
        } else if (score >= 20) {
            vote = "BUY";
            confidence = 0.6;
            reason = "Accumulation trend. A/D Line positive, price up " + String.format("%.2f", priceChange10d) + "%.";
        } else if (score <= -40) {
            vote = "SELL";
            confidence = 0.8;
            reason = "Strong distribution trend. A/D Line negative, price down " + String.format("%.2f", priceChange10d) + "%, VWAP trending down.";
        } else if (score <= -20) {
            vote = "SELL";
            confidence = 0.6;
            reason = "Distribution trend. A/D Line negative, price down " + String.format("%.2f", priceChange10d) + "%.";
        } else {
            vote = "NEUTRAL";
            confidence = 0.4;
            reason = "Mixed accumulation/distribution signals. Price change: " + String.format("%.2f", priceChange10d) + "%.";
        }

        return FormulaResult.builder()
                .formulaName("TrendStrength")
                .score(score)
                .vote(vote)
                .confidence(confidence)
                .reason(reason)
                .build();
    }

    /**
     * Combine results from all 4 formulas
     */
    private CombinedResult combineResults(FormulaResult f1, FormulaResult f2, FormulaResult f3, FormulaResult f4) {
        List<FormulaResult> formulas = Arrays.asList(f1, f2, f3, f4);

        // Extract scores
        double[] scores = {
                f1.getScore(),
                f2.getScore(),
                f3.getScore(),
                f4.getScore()
        };

        // Extract votes
        String[] votes = {
                f1.getVote(),
                f2.getVote(),
                f3.getVote(),
                f4.getVote()
        };

        // Extract confidences
        double[] confidences = {
                f1.getConfidence(),
                f2.getConfidence(),
                f3.getConfidence(),
                f4.getConfidence()
        };

        // Calculate weighted average score
        double[] weights = {0.30, 0.25, 0.25, 0.20};
        double weightedScore = 0;
        for (int i = 0; i < scores.length; i++) {
            weightedScore += scores[i] * weights[i];
        }

        // Count votes
        int buyVotes = (int) Arrays.stream(votes).filter(v -> "BUY".equals(v)).count();
        int sellVotes = (int) Arrays.stream(votes).filter(v -> "SELL".equals(v)).count();
        int neutralVotes = (int) Arrays.stream(votes).filter(v -> "NEUTRAL".equals(v)).count();

        // Calculate consensus (standard deviation as measure of agreement)
        double avgScore = Arrays.stream(scores).average().orElse(0.0);
        double variance = Arrays.stream(scores)
                .map(s -> Math.pow(s - avgScore, 2))
                .average()
                .orElse(0.0);
        double stdDev = Math.sqrt(variance);
        double consensus = Math.max(0.0, 1.0 - (stdDev / 100.0)); // 0.0 to 1.0

        // Average confidence
        double avgConfidence = Arrays.stream(confidences).average().orElse(0.0);

        return CombinedResult.builder()
                .weightedScore(weightedScore)
                .buyVotes(buyVotes)
                .sellVotes(sellVotes)
                .neutralVotes(neutralVotes)
                .consensus(consensus)
                .confidence(avgConfidence)
                .formulaDetails(formulas)
                .build();
    }

    /**
     * Generate final recommendation from combined results
     */
    private RecommendationResult generateFinalRecommendation(
            CombinedResult combined, List<DailyStats> dailyStats, String stockCode) {

        double score = combined.getWeightedScore();
        double consensus = combined.getConsensus();
        double confidence = combined.getConfidence();
        int buyVotes = combined.getBuyVotes();
        int sellVotes = combined.getSellVotes();

        // Get current price and volume
        BigDecimal currentPrice = dailyStats.get(0).getClosePrice();
        Long volume24h = dailyStats.get(0).getTotalVolume();

        // Decision matrix
        String action;
        String strength;
        BigDecimal targetPrice;

        // Strong signals: High score + High consensus + Majority vote
        if (score >= 60 && consensus >= 0.7 && buyVotes >= 3) {
            action = "buy";
            strength = "strong";
            targetPrice = calculateTargetPrice(dailyStats, "up");
        } else if (score <= -60 && consensus >= 0.7 && sellVotes >= 3) {
            action = "sell";
            strength = "strong";
            targetPrice = calculateTargetPrice(dailyStats, "down");
        }
        // Moderate signals
        else if (score >= 40 && consensus >= 0.5 && buyVotes >= 2) {
            action = "buy";
            strength = "moderate";
            targetPrice = calculateTargetPrice(dailyStats, "up");
        } else if (score <= -40 && consensus >= 0.5 && sellVotes >= 2) {
            action = "sell";
            strength = "moderate";
            targetPrice = calculateTargetPrice(dailyStats, "down");
        }
        // Weak signals
        else if (score >= 20 && buyVotes >= 2) {
            action = "buy";
            strength = "weak";
            targetPrice = calculateTargetPrice(dailyStats, "up");
        } else if (score <= -20 && sellVotes >= 2) {
            action = "sell";
            strength = "weak";
            targetPrice = calculateTargetPrice(dailyStats, "down");
        }
        // Neutral
        else {
            action = "hold";
            strength = "neutral";
            targetPrice = currentPrice;
        }

        // Generate reason
        String reason = generateReason(combined, dailyStats);

        return RecommendationResult.builder()
                .code(stockCode)
                .action(action)
                .strength(strength)
                .confidence(confidence)
                .currentPrice(currentPrice)
                .targetPrice(targetPrice)
                .score(score)
                .consensus(consensus)
                .buyVotes(buyVotes)
                .sellVotes(sellVotes)
                .reason(reason)
                .volume24h(volume24h)
                .build();
    }

    /**
     * Calculate target price based on trend direction
     */
    private BigDecimal calculateTargetPrice(List<DailyStats> stats, String direction) {
        if (stats.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal currentPrice = stats.get(0).getClosePrice();

        // Calculate average price change percentage
        double avgChange = 0;
        int count = 0;
        for (int i = 0; i < Math.min(stats.size() - 1, 5); i++) {
            BigDecimal current = stats.get(i).getClosePrice();
            BigDecimal previous = stats.get(i + 1).getClosePrice();
            if (previous.compareTo(BigDecimal.ZERO) > 0) {
                double change = current.subtract(previous)
                        .divide(previous, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
                avgChange += change;
                count++;
            }
        }

        if (count > 0) {
            avgChange /= count;
        }

        // Calculate target price (5-day projection)
        double targetPercent = 0;
        if ("up".equals(direction) && avgChange > 0) {
            targetPercent = Math.min(avgChange * 5, 10); // Max 10% target
        } else if ("down".equals(direction) && avgChange < 0) {
            targetPercent = Math.max(avgChange * 5, -10); // Max -10% target
        } else {
            // No clear trend, use current price
            return currentPrice;
        }

        return currentPrice.multiply(BigDecimal.valueOf(1 + targetPercent / 100))
                .setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * Generate detailed reason for recommendation
     */
    private String generateReason(CombinedResult combined, List<DailyStats> stats) {
        StringBuilder reason = new StringBuilder();

        int buyVotes = combined.getBuyVotes();
        int sellVotes = combined.getSellVotes();

        reason.append(String.format(
                "Consensus: %d of 4 formulas suggest %s. ",
                Math.max(buyVotes, sellVotes),
                buyVotes > sellVotes ? "buying" : "selling"
        ));

        reason.append(String.format(
                "Weighted score: %.1f/100. ",
                combined.getWeightedScore()
        ));

        reason.append(String.format(
                "Formula agreement: %.0f%%. ",
                combined.getConsensus() * 100
        ));

        // Add specific formula insights
        List<FormulaResult> formulas = combined.getFormulaDetails();
        for (FormulaResult formula : formulas) {
            if (Math.abs(formula.getScore()) > 50) {
                reason.append(String.format(
                        "%s: %s (score: %.1f). ",
                        formula.getFormulaName(),
                        formula.getVote(),
                        formula.getScore()
                ));
            }
        }

        return reason.toString().trim();
    }
}



