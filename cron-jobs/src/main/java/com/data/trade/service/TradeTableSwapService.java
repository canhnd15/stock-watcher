package com.data.trade.service;

import com.data.trade.repository.TradeRepository;
import com.data.trade.repository.TradeStagingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeTableSwapService {

    private final TradeRepository tradeRepository;
    private final TradeStagingRepository tradeStagingRepository;

    /**
     * Clear staging table
     */
    @Transactional
    public void clearStaging() {
        try {
            tradeStagingRepository.truncateStaging();
            log.info("Staging table cleared");
        } catch (Exception ex) {
            log.error("Failed to clear staging table: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    /**
     * Swap staging data to main table for a specific date
     * This is an atomic operation that ensures zero downtime
     * 
     * Process:
     * 1. Verify staging has data
     * 2. Delete old data from main table for this date
     * 3. Copy staging data to main table
     * 4. Clear staging table
     */
    @Transactional
    public void swapStagingToMain(String tradeDate) {
        log.info("Starting table swap for trade date: {}", tradeDate);
        
        try {
            // Step 1: Verify staging has data
            long stagingCount = tradeStagingRepository.countByTradeDate(tradeDate);
            if (stagingCount == 0) {
                log.warn("No data in staging for date: {}. Skipping swap.", tradeDate);
                return;
            }
            
            log.info("Staging table contains {} records for date {}", stagingCount, tradeDate);
            
            // Step 2: Delete old data from main table for this date
            tradeRepository.deleteOnDate(tradeDate);
            log.info("Deleted old data from main table for date: {}", tradeDate);
            
            // Step 3: Copy staging data to main table
            tradeStagingRepository.copyStagingToMain(tradeDate);
            log.info("Copied {} records from staging to main table", stagingCount);
            
            // Step 4: Clear staging table
            tradeStagingRepository.truncateStaging();
            log.info("Cleared staging table");
            
            log.info("Table swap completed successfully for date: {}", tradeDate);
            
        } catch (Exception ex) {
            log.error("Failed to swap tables for date {}: {}", tradeDate, ex.getMessage(), ex);
            throw ex; // Re-throw to handle in job
        }
    }
}

