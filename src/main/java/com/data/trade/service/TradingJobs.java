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
    private final ConfigService configService;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTz;

    @Value("${market.vn30.codes}")
    private List<String> vn30;

    /**
     * Refresh tracked stocks and generate recommendations every 5 minutes
     * Runs at: 00:00, 00:05, 00:10, ... 23:55
     */
    @Scheduled(cron = "${cron.tracked-stocks-refresh}", zone = "${cron.timezone}")
    public void refreshTodayAndRecommend() {
        // Check if cron job is enabled
        if (!configService.isTrackedStocksCronEnabled()) {
            log.info("Tracked stocks refresh cron job is disabled. Skipping...");
            return;
        }
        
        ZoneId zone = ZoneId.of(appTz);
        LocalDate tradeDate = LocalDate.now(zone);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String tradeDateStr = tradeDate.format(formatter);

        LocalDateTime now = LocalDateTime.now(zone);

        log.info("========== Starting tracked stocks refresh at {} ==========", 
                now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

        List<TrackedStock> actives = trackedStockRepository.findAllByActiveTrue();
        int successCount = 0;
        int failCount = 0;
        
        for (TrackedStock s : actives) {
            String code = s.getCode();
            try {
                tradeRepository.deleteForCodeOnDate(code, tradeDateStr);

                ingestionService.ingestForCode(code);

                String rec = tradeRepository.recommendationFor(code, tradeDateStr);

                log.info("[{}] Recommendation for {}: {}", tradeDateStr, code, rec);
                successCount++;
            } catch (Exception ex) {
                failCount++;
                log.error("Failed refresh/recommend for {}: {}", code, ex.getMessage(), ex);
            }
        }
        
        log.info("========== Tracked stocks refresh completed. Success: {}, Failed: {} ==========", 
                successCount, failCount);
    }

    /**
     * Ingest trade data for all VN30 stocks every 10 minutes
     * Runs at: 00:00, 00:10, 00:20, ... 23:50
     */
    @Scheduled(cron = "${cron.vn30-ingestion}", zone = "${cron.timezone}")
    public void ingestAllVn30Stocks() {
        // Check if cron job is enabled
        if (!configService.isVn30CronEnabled()) {
            log.info("VN30 ingestion cron job is disabled. Skipping...");
            return;
        }
        
        ZoneId zone = ZoneId.of(appTz);
        LocalDateTime now = LocalDateTime.now(zone);
        LocalDate tradeDate = LocalDate.now(zone);
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String tradeDateStr = tradeDate.format(formatter);
        
        log.info("========== Starting VN30 ingestion job at {} ==========", 
                now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        
        int successCount = 0;
        int failCount = 0;
        
        for (String stockCode : vn30) {
            try {
                tradeRepository.deleteForCodeOnDate(stockCode, tradeDateStr);
                
                ingestionService.ingestForCode(stockCode);
                successCount++;
                log.info("Successfully ingested data for {}", stockCode);
            } catch (Exception ex) {
                failCount++;
                log.error("Failed to ingest data for {}: {}", stockCode, ex.getMessage(), ex);
            }
        }
        
        log.info("========== VN30 ingestion completed. Success: {}, Failed: {} ==========", 
                successCount, failCount);
    }
}
