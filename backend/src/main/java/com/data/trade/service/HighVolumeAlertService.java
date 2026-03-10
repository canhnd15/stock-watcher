package com.data.trade.service;

import com.data.trade.dto.HighVolumeNotification;
import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TrackedStockRepository;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HighVolumeAlertService {

    private final TrackedStockRepository trackedStockRepository;
    private final TradeRepository tradeRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /** Number of historical days used to calculate average volume (default 20). */
    @Value("${alert.high-volume.lookback-days:20}")
    private int lookbackDays;

    /** Today's volume must be >= this multiplier * average to trigger alert (default 2.0). */
    @Value("${alert.high-volume.multiplier:2.0}")
    private double multiplier;

    /**
     * Track which (code, tradeDate) pairs have already been alerted today,
     * so we don't spam the same notification every cron tick.
     * Cleared automatically when the trade date changes.
     */
    private final Map<String, Set<String>> alertedToday = new ConcurrentHashMap<>();

    @Async
    public void checkHighVolumeAndNotify() {
        log.info("========== Checking high volume alerts ==========");

        List<TrackedStock> activeStocks = trackedStockRepository.findAllByActiveTrue();
        if (activeStocks.isEmpty()) {
            log.info("No active tracked stocks found for high-volume check");
            return;
        }

        Set<String> codes = activeStocks.stream()
                .map(TrackedStock::getCode)
                .collect(Collectors.toSet());

        log.info("Checking {} tracked stock codes for volume spikes (lookback={}, multiplier={}x): {}",
                codes.size(), lookbackDays, multiplier, codes);

        int alertsSent = 0;

        for (String code : codes) {
            try {
                HighVolumeNotification notification = detectHighVolume(code);
                if (notification != null) {
                    // Send per-user notifications to all users tracking this stock
                    Set<Long> userIds = activeStocks.stream()
                            .filter(s -> s.getCode().equals(code))
                            .map(s -> s.getUser().getId())
                            .collect(Collectors.toSet());

                    for (Long userId : userIds) {
                        messagingTemplate.convertAndSend(
                                "/topic/high-volume/user/" + userId, notification);
                    }

                    log.info("HIGH VOLUME alert sent for {}: today={}  avg={} ({}x)",
                            code, notification.getTodayVolume(),
                            notification.getAverageVolume(),
                            String.format("%.1f", notification.getVolumeRatio()));
                    alertsSent++;
                }
            } catch (Exception e) {
                log.error("Failed to check high volume for {}: {}", code, e.getMessage());
            }
        }

        log.info("========== High volume check completed. Alerts sent: {} ==========", alertsSent);
    }

    /**
     * Detect whether today's volume for {@code code} is a spike compared to
     * the historical average.  Returns a notification if so, or {@code null}.
     */
    private HighVolumeNotification detectHighVolume(String code) {
        // Fetch lookbackDays + 1 (today + N historical days)
        List<Object[]> rows = tradeRepository.findDailyVolumeForLastNDays(code, lookbackDays + 1);

        if (rows.size() < 2) {
            // Not enough data to compare
            return null;
        }

        // First row = most recent day (today or latest ingested day)
        String todayDate = (String) rows.get(0)[0];
        long todayVolume = ((Number) rows.get(0)[1]).longValue();

        // Already alerted for this code + date?
        Set<String> alerted = alertedToday.computeIfAbsent(todayDate, k -> {
            // New date → clear stale entries from previous days
            alertedToday.clear();
            return ConcurrentHashMap.newKeySet();
        });
        if (alerted.contains(code)) {
            return null;
        }

        // Calculate average of historical days (skip row 0 = today)
        long totalHistorical = 0;
        int count = 0;
        for (int i = 1; i < rows.size(); i++) {
            totalHistorical += ((Number) rows.get(i)[1]).longValue();
            count++;
        }

        if (count == 0 || totalHistorical == 0) {
            return null;
        }

        long averageVolume = totalHistorical / count;
        double ratio = (double) todayVolume / averageVolume;

        if (ratio >= multiplier) {
            alerted.add(code);

            return HighVolumeNotification.builder()
                    .code(code)
                    .tradeDate(todayDate)
                    .todayVolume(todayVolume)
                    .averageVolume(averageVolume)
                    .volumeRatio(Math.round(ratio * 100.0) / 100.0)
                    .lookbackDays(count)
                    .timestamp(OffsetDateTime.now())
                    .build();
        }

        return null;
    }
}
