package com.data.trade.service;

import com.data.trade.repository.TradeStagingRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobParameters;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TradeDataBatchImportService {
    
    private final JobLauncher jobLauncher;
    private final Job tradeDataImportJob;
    private final EntityManager entityManager;
    private final TradeStagingRepository tradeStagingRepository;
    
    /**
     * Import all XLSX files from a directory
     */
    public List<String> importAllFiles(String directoryPath) {
        File dir = new File(directoryPath);
        if (!dir.exists() || !dir.isDirectory()) {
            throw new IllegalArgumentException("Directory does not exist: " + directoryPath);
        }
        
        File[] files = dir.listFiles((d, name) -> 
            name.toLowerCase().endsWith(".xlsx"));
        
        if (files == null || files.length == 0) {
            log.warn("No XLSX files found in directory: {}", directoryPath);
            return new ArrayList<>();
        }
        
        // Sort files by name for consistent processing
        Arrays.sort(files, Comparator.comparing(File::getName));
        
        log.info("Found {} XLSX files to import", files.length);
        List<String> processedFiles = new ArrayList<>();
        List<String> failedFiles = new ArrayList<>();
        
        // Process files sequentially to avoid memory issues
        for (File file : files) {
            try {
                log.info("Processing file: {} ({}/{})", file.getName(), 
                    processedFiles.size() + failedFiles.size() + 1, files.length);
                importFile(file.getAbsolutePath());
                processedFiles.add(file.getName());
                log.info("Successfully imported: {}", file.getName());
            } catch (Exception e) {
                log.error("Failed to import file: {}", file.getName(), e);
                failedFiles.add(file.getName());
                // Continue with next file
            }
        }
        
        log.info("Import completed. Success: {}, Failed: {}", 
            processedFiles.size(), failedFiles.size());
        
        if (!failedFiles.isEmpty()) {
            log.warn("Failed files: {}", String.join(", ", failedFiles));
        }
        
        return processedFiles;
    }
    
    /**
     * Import a single XLSX file
     */
    public void importFile(String filePath) throws Exception {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new IllegalArgumentException("File does not exist: " + filePath);
        }
        
        JobParameters jobParameters = new JobParametersBuilder()
                .addString("input.file", file.getAbsolutePath())
                .addString("file.name", file.getName())
                .addLong("timestamp", System.currentTimeMillis())
                .toJobParameters();
        
        jobLauncher.run(tradeDataImportJob, jobParameters);
    }
    
    /**
     * Migrate data from staging table to main trades table
     * This should be called after all files are imported
     */
    @Transactional
    public long migrateStagingToMain() {
        log.info("Starting migration from staging to main table...");
        
        String sql = """
            INSERT INTO trades (code, price, volume, side, trade_date, trade_time)
            SELECT DISTINCT ON (code, trade_date, trade_time) 
                code, price, volume, side, trade_date, trade_time
            FROM trades_staging
            WHERE NOT EXISTS (
                SELECT 1 FROM trades t 
                WHERE t.code = trades_staging.code 
                AND t.trade_date = trades_staging.trade_date
                AND t.trade_time = trades_staging.trade_time
            )
        """;
        
        int inserted = entityManager.createNativeQuery(sql).executeUpdate();
        log.info("Migrated {} records from staging to main table", inserted);
        
        return inserted;
    }
    
    /**
     * Cleanup staging table
     */
    @Transactional
    public void cleanupStaging() {
        log.info("Cleaning up staging table...");
        entityManager.createNativeQuery("TRUNCATE TABLE trades_staging").executeUpdate();
        log.info("Staging table cleaned up");
    }
    
    /**
     * Get count of records in staging table
     */
    public long getStagingCount() {
        return tradeStagingRepository.count();
    }
}

