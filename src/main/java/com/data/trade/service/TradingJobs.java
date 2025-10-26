package com.data.trade.service;

import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TrackedStockRepository;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradingJobs {
    private final TrackedStockRepository trackedStockRepository;
    private final TradeRepository tradeRepository;
    private final TradeIngestionService ingestionService;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTz;

//    @Scheduled(cron = "0 */5 * * * *", zone = "Asia/Ho_Chi_Minh")
    public void refreshTodayAndRecommend() {
        ZoneId zone = ZoneId.of(appTz);
        LocalDate tradeDate = LocalDate.now(zone);
        // Convert LocalDate to DD/MM/YYYY format
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String tradeDateStr = tradeDate.format(formatter);

        LocalDateTime now = LocalDateTime.now(zone);

        log.info("------------ {} ------------", now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        List<TrackedStock> actives = trackedStockRepository.findAllByActiveTrue();
        for (TrackedStock s : actives) {
            String code = s.getCode();
            try {
                tradeRepository.deleteForCodeOnDate(code, tradeDateStr);

                ingestionService.ingestForCode(code);

                String rec = tradeRepository.recommendationFor(code, tradeDateStr);

                log.info("[{}] Recommendation for {}: {}", tradeDateStr, code, rec);
            } catch (Exception ex) {
                log.error("Failed refresh/recommend for {}: {}", code, ex.getMessage(), ex);
            }
        }
    }
}
