package com.data.trade.service;

import com.data.trade.dto.SignalNotification;
import com.data.trade.dto.TrackedStockNotification;
import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TrackedStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackedStockNotificationService {

    private final TrackedStockRepository trackedStockRepository;
    private final SignalCalculationService signalCalculationService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Calculate signals for tracked stocks and send notifications for BIG signals only
     */
    @Async
    public void checkTrackedStocksAndNotify() {
        log.info("========== Checking tracked stocks for notifications ==========");

        // Get all active tracked stocks
        List<TrackedStock> trackedStocks = trackedStockRepository.findAllByActiveTrue();
        
        if (trackedStocks.isEmpty()) {
            log.info("No active tracked stocks found");
            return;
        }

        Set<String> trackedCodes = trackedStocks.stream()
                .map(TrackedStock::getCode)
                .collect(Collectors.toSet());

        log.info("Monitoring {} tracked stocks: {}", trackedCodes.size(), trackedCodes);

        int notificationsSent = 0;
        
        for (String code : trackedCodes) {
            try {
                // Calculate signal for this tracked stock
                SignalNotification signal = signalCalculationService.calculateSignalForCode(code);
                
                if (signal != null) {
                    // Only send notification for BIG signals (score >= 6)
                    if (signal.getScore() >= 6) {
                        TrackedStockNotification notification = TrackedStockNotification.builder()
                                .code(signal.getCode())
                                .signalType(signal.getSignalType())
                                .score(signal.getScore())
                                .reason(signal.getReason())
                                .buyVolume(signal.getBuyVolume())
                                .sellVolume(signal.getSellVolume())
                                .lastPrice(signal.getLastPrice())
                                .priceChange(signal.getPriceChange())
                                .timestamp(signal.getTimestamp())
                                .isBigSignal(true)
                                .build();

                        // Send to separate WebSocket topic for tracked stock notifications
                        messagingTemplate.convertAndSend("/topic/tracked-notifications", notification);
                        
                        log.info("🔔 BIG Signal notification sent for tracked stock: {} - {} (score: {})", 
                                code, signal.getSignalType(), signal.getScore());
                        notificationsSent++;
                    } else {
                        log.debug("Signal for {} has score {} - not big enough for notification", 
                                code, signal.getScore());
                    }
                }
            } catch (Exception e) {
                log.error("Failed to check tracked stock {}: {}", code, e.getMessage());
            }
        }

        log.info("========== Tracked stocks check completed. Notifications sent: {} ==========", 
                notificationsSent);
    }
}

