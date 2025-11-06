package com.data.trade.service;

import com.data.trade.dto.*;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
     * Calculate combined recommendation for a stock based on 10 days of data
     */
    public RecommendationResult calculateRecommendation(String stockCode) {
        log.debug("Calculating recommendation for stock: {}", stockCode);

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

        // Calculate all 4 formulas
        FormulaResult formula1 = calculateWeightedVolumePriceMomentum(dailyStats);
        FormulaResult formula2 = calculateMovingAverageCrossover(dailyStats);
        FormulaResult formula3 = calculateRSIWithVolume(dailyStats);
        FormulaResult formula4 = calculateTrendStrengthADLine(dailyStats);

        // Combine results
        CombinedResult combined = combineResults(formula1, formula2, formula3, formula4);

        // Generate final recommendation
        return generateFinalRecommendation(combined, dailyStats, stockCode);
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
     * Formula 1: Weighted Volume-Price Momentum
     * Analyzes volume accumulation and price momentum over 10 days
     */
    private FormulaResult calculateWeightedVolumePriceMomentum(List<DailyStats> stats) {
        if (stats.size() < 2) {
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
        for (int i = 0; i < Math.min(stats.size(), DAY_WEIGHTS.length); i++) {
            DailyStats day = stats.get(i);
            long totalVol = day.getBuyVolume() + day.getSellVolume();
            if (totalVol > 0) {
                double dayRatio = (double) (day.getBuyVolume() - day.getSellVolume()) / totalVol;
                volumeScore += dayRatio * DAY_WEIGHTS[i] * 10;
            }
        }
        volumeScore = Math.max(-30, Math.min(30, volumeScore));

        // 2. Price Momentum Score
        for (int i = 0; i < Math.min(stats.size() - 1, DAY_WEIGHTS.length - 1); i++) {
            BigDecimal currentPrice = stats.get(i).getClosePrice();
            BigDecimal previousPrice = stats.get(i + 1).getClosePrice();
            if (previousPrice.compareTo(BigDecimal.ZERO) > 0) {
                double dayChange = currentPrice.subtract(previousPrice)
                        .divide(previousPrice, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue();
                priceMomentum += dayChange * DAY_WEIGHTS[i] * 0.5;
            }
        }
        priceMomentum = Math.max(-30, Math.min(30, priceMomentum));

        // 3. Large Block Frequency
        long totalLargeBuys = stats.stream().mapToLong(DailyStats::getLargeBuyBlocks).sum();
        long totalLargeSells = stats.stream().mapToLong(DailyStats::getLargeSellBlocks).sum();
        long totalBlocks = totalLargeBuys + totalLargeSells;
        if (totalBlocks > 0) {
            double blockRatio = (double) (totalLargeBuys - totalLargeSells) / totalBlocks;
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
            reason = String.format("Strong volume-price momentum (score: %.1f). Buy volume accumulation and positive price trend.", finalScore);
        } else if (finalScore >= 20) {
            vote = "BUY";
            confidence = Math.min(0.7, 0.4 + (finalScore / 200));
            reason = String.format("Positive volume-price momentum (score: %.1f). Moderate buying pressure detected.", finalScore);
        } else if (finalScore <= -40) {
            vote = "SELL";
            confidence = Math.min(0.9, 0.5 + (Math.abs(finalScore) / 200));
            reason = String.format("Strong negative volume-price momentum (score: %.1f). Sell volume accumulation and negative price trend.", finalScore);
        } else if (finalScore <= -20) {
            vote = "SELL";
            confidence = Math.min(0.7, 0.4 + (Math.abs(finalScore) / 200));
            reason = String.format("Negative volume-price momentum (score: %.1f). Moderate selling pressure detected.", finalScore);
        } else {
            vote = "NEUTRAL";
            confidence = 0.3;
            reason = String.format("Neutral volume-price momentum (score: %.1f). No clear trend.", finalScore);
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
    private FormulaResult calculateMovingAverageCrossover(List<DailyStats> stats) {
        if (stats.size() < 5) {
            return FormulaResult.builder()
                    .formulaName("MACrossover")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Insufficient data for MA calculation")
                    .build();
        }

        // Calculate 5-day and 10-day moving averages
        double ma5 = stats.stream()
                .limit(5)
                .map(DailyStats::getClosePrice)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(0);

        double ma10 = stats.stream()
                .limit(Math.min(stats.size(), 10))
                .map(DailyStats::getClosePrice)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(0);

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
        double ma5Yesterday = stats.size() >= 6 ? 
                stats.stream()
                        .skip(1)
                        .limit(5)
                        .map(DailyStats::getClosePrice)
                        .mapToDouble(BigDecimal::doubleValue)
                        .average()
                        .orElse(ma5) : ma5;

        double currentPrice = stats.get(0).getClosePrice().doubleValue();

        // Calculate volume trend
        long recentVolume = stats.stream().limit(3).mapToLong(DailyStats::getTotalVolume).sum();
        long avgVolume10d = stats.stream().limit(10).mapToLong(DailyStats::getTotalVolume).sum() / Math.min(stats.size(), 10);
        double volumeTrend = avgVolume10d > 0 ? (double) (recentVolume / 3 - avgVolume10d) / avgVolume10d : 0;

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
            reason = String.format("Bullish MA crossover: MA5(%.0f) > MA10(%.0f). Price above MA5. Volume increasing.", ma5, ma10);
        } else if (score >= 40) {
            vote = "BUY";
            confidence = 0.6;
            reason = String.format("MA5(%.0f) above MA10(%.0f). Positive trend confirmed.", ma5, ma10);
        } else if (score <= -60) {
            vote = "SELL";
            confidence = 0.8;
            reason = String.format("Bearish MA crossover: MA5(%.0f) < MA10(%.0f). Price below MA5. Volume decreasing.", ma5, ma10);
        } else if (score <= -40) {
            vote = "SELL";
            confidence = 0.6;
            reason = String.format("MA5(%.0f) below MA10(%.0f). Negative trend confirmed.", ma5, ma10);
        } else {
            vote = "NEUTRAL";
            confidence = 0.4;
            reason = String.format("Mixed MA signals. MA5(%.0f) vs MA10(%.0f).", ma5, ma10);
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
    private FormulaResult calculateRSIWithVolume(List<DailyStats> stats) {
        if (stats.size() < 2) {
            return FormulaResult.builder()
                    .formulaName("RSI")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Insufficient data for RSI calculation")
                    .build();
        }

        // Calculate gains and losses weighted by volume and day importance
        double avgGain = 0;
        double avgLoss = 0;
        double totalWeight = 0;

        for (int i = 0; i < Math.min(stats.size() - 1, DAY_WEIGHTS.length - 1); i++) {
            BigDecimal currentPrice = stats.get(i).getClosePrice();
            BigDecimal previousPrice = stats.get(i + 1).getClosePrice();
            
            if (previousPrice.compareTo(BigDecimal.ZERO) > 0) {
                double change = currentPrice.subtract(previousPrice).doubleValue();
                double volume = stats.get(i).getTotalVolume();
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

        // Volume confirmation
        long totalBuyVolume = stats.stream().limit(10).mapToLong(DailyStats::getBuyVolume).sum();
        long totalSellVolume = stats.stream().limit(10).mapToLong(DailyStats::getSellVolume).sum();
        double volumeRatio = totalSellVolume > 0 ? (double) totalBuyVolume / totalSellVolume : totalBuyVolume;

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
            reason = String.format("RSI oversold (%.1f) with strong buying pressure (volume ratio: %.2f). Potential reversal.", rsi, volumeRatio);
        } else if (score >= 40) {
            vote = "BUY";
            confidence = 0.6;
            reason = String.format("RSI low (%.1f) with buying pressure (volume ratio: %.2f).", rsi, volumeRatio);
        } else if (score <= -60) {
            vote = "SELL";
            confidence = 0.8;
            reason = String.format("RSI overbought (%.1f) with strong selling pressure (volume ratio: %.2f). Potential reversal.", rsi, volumeRatio);
        } else if (score <= -40) {
            vote = "SELL";
            confidence = 0.6;
            reason = String.format("RSI high (%.1f) with selling pressure (volume ratio: %.2f).", rsi, volumeRatio);
        } else {
            vote = "NEUTRAL";
            confidence = 0.4;
            reason = String.format("RSI neutral (%.1f). No clear momentum.", rsi);
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
    private FormulaResult calculateTrendStrengthADLine(List<DailyStats> stats) {
        if (stats.size() < 2) {
            return FormulaResult.builder()
                    .formulaName("TrendStrength")
                    .score(0)
                    .vote("NEUTRAL")
                    .confidence(0.0)
                    .reason("Insufficient data")
                    .build();
        }

        // Calculate Accumulation/Distribution Line
        double adLine = 0;
        for (int i = 0; i < Math.min(stats.size(), DAY_WEIGHTS.length); i++) {
            DailyStats day = stats.get(i);
            BigDecimal close = day.getClosePrice();
            BigDecimal low = day.getLowPrice();
            BigDecimal high = day.getHighPrice();
            long volume = day.getTotalVolume();

            if (high.compareTo(low) > 0) {
                // Money Flow Multiplier
                BigDecimal hlcRange = high.subtract(low);
                BigDecimal closeMinusLow = close.subtract(low);
                BigDecimal highMinusClose = high.subtract(close);
                
                BigDecimal mfm = closeMinusLow.subtract(highMinusClose)
                        .divide(hlcRange, 4, RoundingMode.HALF_UP);
                
                adLine += mfm.doubleValue() * volume * DAY_WEIGHTS[i];
            }
        }

        // Price trend (10-day change)
        BigDecimal latestPrice = stats.get(0).getClosePrice();
        BigDecimal oldestPrice = stats.get(Math.min(stats.size() - 1, 9)).getClosePrice();
        double priceChange10d = 0;
        if (oldestPrice.compareTo(BigDecimal.ZERO) > 0) {
            priceChange10d = latestPrice.subtract(oldestPrice)
                    .divide(oldestPrice, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        // VWAP trend (simplified)
        double vwapTrend = 0;
        double totalPriceVolume = 0;
        long totalVol = 0;
        for (int i = 0; i < Math.min(stats.size(), 5); i++) {
            DailyStats day = stats.get(i);
            totalPriceVolume += day.getClosePrice().doubleValue() * day.getTotalVolume();
            totalVol += day.getTotalVolume();
        }
        if (totalVol > 0) {
            double recentVWAP = totalPriceVolume / totalVol;
            
            totalPriceVolume = 0;
            totalVol = 0;
            for (int i = 5; i < Math.min(stats.size(), 10); i++) {
                DailyStats day = stats.get(i);
                totalPriceVolume += day.getClosePrice().doubleValue() * day.getTotalVolume();
                totalVol += day.getTotalVolume();
            }
            if (totalVol > 0) {
                double olderVWAP = totalPriceVolume / totalVol;
                vwapTrend = (recentVWAP - olderVWAP) / olderVWAP * 100;
            }
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
            reason = String.format("Strong accumulation trend. A/D Line positive, price up %.2f%%, VWAP trending up.", priceChange10d);
        } else if (score >= 20) {
            vote = "BUY";
            confidence = 0.6;
            reason = String.format("Accumulation trend. A/D Line positive, price up %.2f%%.", priceChange10d);
        } else if (score <= -40) {
            vote = "SELL";
            confidence = 0.8;
            reason = String.format("Strong distribution trend. A/D Line negative, price down %.2f%%, VWAP trending down.", priceChange10d);
        } else if (score <= -20) {
            vote = "SELL";
            confidence = 0.6;
            reason = String.format("Distribution trend. A/D Line negative, price down %.2f%%.", priceChange10d);
        } else {
            vote = "NEUTRAL";
            confidence = 0.4;
            reason = String.format("Mixed accumulation/distribution signals. Price change: %.2f%%.", priceChange10d);
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



