package com.data.trade.jobs;

import com.data.trade.model.Trade;
import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TrackedStockRepository;
import com.data.trade.repository.TradeRepository;
import com.data.trade.service.BackendApiClient;
import com.data.trade.service.ConfigService;
import com.data.trade.service.GoogleDriveService;
import com.data.trade.service.SignalCalculationService;
import com.data.trade.service.TradeExportService;
import com.data.trade.service.TradeIngestionService;
import com.data.trade.service.TrackedStockNotificationService;
import com.data.trade.service.TrackedStockStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
    private final SignalCalculationService signalCalculationService;
    private final TrackedStockNotificationService trackedStockNotificationService;
    private final TrackedStockStatsService trackedStockStatsService;
    private final BackendApiClient backendApiClient;
    private final GoogleDriveService googleDriveService;
    private final TradeExportService tradeExportService;

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
     * Ingest trade data for all VN30 stocks
     * Runs: Monday to Friday, every 5 minutes from 9:15 AM to 3:00 PM (15:00)
     */
    @Scheduled(cron = "${cron.vn30-ingestion}", zone = "${cron.timezone}")
    public void ingestAllVn30Stocks() {
        if (!configService.isVn30CronEnabled()) {
            log.info("VN30 ingestion cron job is disabled. Skipping...");
            return;
        }
        
        ZoneId zone = ZoneId.of(appTz);
        LocalDateTime now = LocalDateTime.now(zone);
        LocalDate currentDate = LocalDate.now(zone);
        LocalTime currentTime = now.toLocalTime();
        DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
        
        // Check if it's a weekday (Monday-Friday)
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            log.debug("VN30 ingestion skipped: Today is {}, not a trading day", dayOfWeek);
            return;
        }
        
        // Check if time is within trading hours: 9:15 AM to 3:00 PM (15:00) inclusive
        LocalTime startTime = LocalTime.of(9, 15);  // 9:15 AM
        LocalTime endTime = LocalTime.of(15, 0);     // 3:00 PM (15:00)

        if (currentTime.isBefore(startTime) || currentTime.isAfter(endTime)) {
            log.debug("VN30 ingestion skipped: Current time {} is outside trading hours (9:15 AM - 3:00 PM)",
                    currentTime.format(DateTimeFormatter.ofPattern("HH:mm:ss")));
            return;
        }
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String tradeDateStr = currentDate.format(formatter);
        
        log.info("========== Starting VN30 ingestion job at {} for trade date {} ==========", 
                now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), tradeDateStr);
        
        int successCount = 0;
        int failCount = 0;

        tradeRepository.deleteOnDate(tradeDateStr);

        for (String stockCode : vn30) {
            try {
                ingestionService.ingestForCode(stockCode);
                successCount++;
            } catch (Exception ex) {
                failCount++;
                log.error("Failed to ingest data for {}: {}", stockCode, ex.getMessage(), ex);
            }
        }
        
        log.info("========== VN30 ingestion completed. Success: {}, Failed: {} ==========", 
                successCount, failCount);
        
        log.info("Triggering signal calculation after VN30 ingestion via backend API...");
        try {
            // Call backend API instead of local service to ensure signals reach frontend WebSocket clients
            backendApiClient.triggerSignalCalculation();
            log.info("Signal calculation triggered successfully via backend API after VN30 ingestion");
        } catch (Exception ex) {
            log.error("Failed to trigger signal calculation via backend API after VN30 ingestion: {}", ex.getMessage(), ex);
        }
        
        log.info("Triggering tracked stock statistics calculation after VN30 ingestion...");
        try {
            trackedStockStatsService.calculateStatsForAllTrackedStocks();
            log.info("Tracked stock statistics calculation triggered successfully after VN30 ingestion");
        } catch (Exception ex) {
            log.error("Failed to run tracked stock statistics calculation after VN30 ingestion: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Check tracked stocks and send notifications for BIG signals every 3 minutes
     * Runs at: 00:00, 00:03, 00:06, ... 23:57
     */
    @Scheduled(cron = "${cron.tracked-stock.notify}", zone = "${cron.timezone}")
    public void checkTrackedStocksNotifications() {
        // Check if cron job is enabled
        if (!configService.isTrackedStocksCronEnabled()) {
            log.debug("Tracked stocks notifications cron job is disabled. Skipping...");
            return;
        }
        
        log.info("Starting tracked stock notifications check via backend API...");
        try {
            // Call backend API instead of local service to ensure notifications reach frontend WebSocket clients
            backendApiClient.triggerTrackedStockNotificationsCheck();
            log.info("Tracked stock notifications check completed via backend API");
        } catch (Exception ex) {
            log.error("Failed to trigger tracked stock notifications via backend API: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Backup daily trades data to Google Drive
     * Runs at 15:05 every weekday (Monday-Friday)
     */
    @Scheduled(cron = "${cron.backup-trades:0 5 15 * * 1-5}", zone = "${cron.timezone}")
    public void backupDailyTrades() {
        if (!configService.isBackupCronEnabled()) {
            log.info("Backup cron job is disabled. Skipping...");
            return;
        }
        
        ZoneId zone = ZoneId.of(appTz);
        LocalDate currentDate = LocalDate.now(zone);
        LocalDateTime now = LocalDateTime.now(zone);
        DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
        
        // Double check it's a weekday (shouldn't run on weekends due to cron, but safety check)
        if (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY) {
            log.info("Backup skipped: Today is {}, not a weekday", dayOfWeek);
            return;
        }
        
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String tradeDateStr = currentDate.format(dateFormatter);
        
        log.info("========== Starting daily trades backup at {} for trade date {} ==========", 
                now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")), tradeDateStr);
        
        try {
            // Query all trades for current day
            List<Trade> trades = tradeRepository.findByTradeDate(tradeDateStr);
            
            if (trades.isEmpty()) {
                log.warn("No trades found for date {}. Skipping backup.", tradeDateStr);
                return;
            }
            
            log.info("Found {} trades for date {}", trades.size(), tradeDateStr);
            
            // Export to Excel
            byte[] excelData = tradeExportService.exportTradesToXlsx(trades);
            
            // Generate filename with date
            DateTimeFormatter filenameFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            String fileName = String.format("trades-backup-%s.xlsx", currentDate.format(filenameFormatter));
            
            // Upload to Google Drive
            String fileId = googleDriveService.uploadFile(
                fileName, 
                excelData, 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            
            log.info("========== Daily trades backup completed successfully. File ID: {} ==========", fileId);
            
        } catch (Exception ex) {
            log.error("Failed to backup daily trades: {}", ex.getMessage(), ex);
        }
    }
}
