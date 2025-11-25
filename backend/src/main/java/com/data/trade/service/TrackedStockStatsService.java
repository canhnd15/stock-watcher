package com.data.trade.service;

import com.data.trade.dto.TrackedStockStatsDTO;
import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TrackedStockRepository;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackedStockStatsService {

    private final TradeRepository tradeRepository;
    private final TrackedStockRepository trackedStockRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTz;

    private static final String BUY_SIDE = "buy";
    private static final String SELL_SIDE = "sell";

    /**
     * Calculate statistics for a specific stock code on a specific date
     */
    public TrackedStockStatsDTO calculateStatsForCode(String code, String tradeDate) {
        log.debug("Calculating stats for code: {} on date: {}", code, tradeDate);

        BigDecimal lowestPriceBuy = tradeRepository.findMinPriceByCodeAndSideAndDate(code, BUY_SIDE, tradeDate).orElse(null);
        BigDecimal highestPriceBuy = tradeRepository.findMaxPriceByCodeAndSideAndDate(code, BUY_SIDE, tradeDate).orElse(null);
        BigDecimal lowestPriceSell = tradeRepository.findMinPriceByCodeAndSideAndDate(code, SELL_SIDE, tradeDate).orElse(null);
        BigDecimal highestPriceSell = tradeRepository.findMaxPriceByCodeAndSideAndDate(code, SELL_SIDE, tradeDate).orElse(null);
        Long largestVolumeBuy = tradeRepository.findMaxVolumeByCodeAndSideAndDate(code, BUY_SIDE, tradeDate).orElse(null);
        Long largestVolumeSell = tradeRepository.findMaxVolumeByCodeAndSideAndDate(code, SELL_SIDE, tradeDate).orElse(null);

        return TrackedStockStatsDTO.builder()
                .code(code)
                .lowestPriceBuy(lowestPriceBuy)
                .highestPriceBuy(highestPriceBuy)
                .lowestPriceSell(lowestPriceSell)
                .highestPriceSell(highestPriceSell)
                .largestVolumeBuy(largestVolumeBuy)
                .largestVolumeSell(largestVolumeSell)
                .lastUpdated(OffsetDateTime.now())
                .build();
    }

    /**
     * Get current trade date in DD/MM/YYYY format
     */
    private String getCurrentTradeDate() {
        ZoneId zone = ZoneId.of(appTz);
        LocalDate tradeDate = LocalDate.now(zone);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return tradeDate.format(formatter);
    }

    /**
     * Calculate statistics for all active tracked stocks and send WebSocket updates to users
     */
    public void calculateStatsForAllTrackedStocks() {
        log.info("========== Starting tracked stock statistics calculation ==========");

        String tradeDate = getCurrentTradeDate();
        List<TrackedStock> allTrackedStocks = trackedStockRepository.findAllByActiveTrue();

        if (allTrackedStocks.isEmpty()) {
            log.info("No active tracked stocks found. Skipping stats calculation.");
            return;
        }

        // Group tracked stocks by user
        Map<Long, List<TrackedStock>> stocksByUser = allTrackedStocks.stream()
                .collect(Collectors.groupingBy(ts -> ts.getUser().getId()));

        log.info("Calculating stats for {} users with tracked stocks", stocksByUser.size());

        int statsCalculated = 0;
        int failCount = 0;

        // Process each user
        for (Map.Entry<Long, List<TrackedStock>> entry : stocksByUser.entrySet()) {
            Long userId = entry.getKey();
            List<TrackedStock> userStocks = entry.getValue();

            Map<String, TrackedStockStatsDTO> userStatsMap = new HashMap<>();

            // Calculate stats for each of the user's tracked stocks
            for (TrackedStock stock : userStocks) {
                try {
                    TrackedStockStatsDTO stats = calculateStatsForCode(stock.getCode(), tradeDate);
                    userStatsMap.put(stock.getCode(), stats);
                    statsCalculated++;
                } catch (Exception e) {
                    failCount++;
                    log.error("Failed to calculate stats for {} (user {}): {}", 
                            stock.getCode(), userId, e.getMessage());
                }
            }

            // Send stats update to user via WebSocket
            if (!userStatsMap.isEmpty()) {
                messagingTemplate.convertAndSend("/topic/tracked-stocks-stats/user/" + userId, userStatsMap);
                log.info("Sent stats update to user {} for {} stocks", userId, userStatsMap.size());
            }
        }

        log.info("========== Tracked stock statistics calculation completed. Calculated: {}, Failed: {} ==========",
                statsCalculated, failCount);
    }

    /**
     * Get statistics for a specific user's tracked stocks
     */
    public Map<String, TrackedStockStatsDTO> getStatsForUser(Long userId) {
        String tradeDate = getCurrentTradeDate();
        List<TrackedStock> userStocks = trackedStockRepository.findAllByUserIdAndActiveTrue(userId);

        Map<String, TrackedStockStatsDTO> statsMap = new HashMap<>();

        for (TrackedStock stock : userStocks) {
            try {
                TrackedStockStatsDTO stats = calculateStatsForCode(stock.getCode(), tradeDate);
                statsMap.put(stock.getCode(), stats);
            } catch (Exception e) {
                log.error("Failed to calculate stats for {} (user {}): {}", 
                        stock.getCode(), userId, e.getMessage());
            }
        }

        return statsMap;
    }

    /**
     * Get statistics for a list of stock codes
     */
    public Map<String, TrackedStockStatsDTO> getStatsForCodes(List<String> codes) {
        String tradeDate = getCurrentTradeDate();
        Map<String, TrackedStockStatsDTO> statsMap = new HashMap<>();

        for (String code : codes) {
            try {
                TrackedStockStatsDTO stats = calculateStatsForCode(code, tradeDate);
                statsMap.put(code, stats);
            } catch (Exception e) {
                log.error("Failed to calculate stats for {}: {}", code, e.getMessage());
            }
        }

        return statsMap;
    }
}

