package com.data.trade;

import com.data.trade.service.TradeDataBatchImportService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Slf4j
@SpringBootApplication
@EnableJpaRepositories(basePackages = "com.data.trade.repository")
@EntityScan(basePackages = "com.data.trade.model")
public class DataImportApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(DataImportApplication.class, args);
    }
    
    @Bean
    public CommandLineRunner commandLineRunner(TradeDataBatchImportService importService) {
        return args -> {
            if (args.length == 0) {
                printUsage();
                return;
            }
            
            String command = args[0];
            
            switch (command) {
                case "import" -> {
                    String directoryPath = args.length > 1 ? args[1] : "./data/trades";
                    log.info("Starting import from directory: {}", directoryPath);
                    importService.importAllFiles(directoryPath);
                    log.info("Import completed. Staging table count: {}", 
                        importService.getStagingCount());
                }
                case "migrate" -> {
                    log.info("Starting migration from staging to main table...");
                    long migrated = importService.migrateStagingToMain();
                    log.info("Migration completed. Migrated {} records", migrated);
                }
                case "cleanup" -> {
                    log.info("Cleaning up staging table...");
                    importService.cleanupStaging();
                    log.info("Cleanup completed");
                }
                case "full" -> {
                    // Full workflow: import -> migrate -> cleanup
                    String directoryPath = args.length > 1 ? args[1] : "./data/trades";
                    log.info("Starting full import workflow from directory: {}", directoryPath);
                    
                    // Step 1: Import
                    importService.importAllFiles(directoryPath);
                    log.info("Import completed. Staging table count: {}", 
                        importService.getStagingCount());
                    
                    // Step 2: Migrate
                    log.info("Starting migration...");
                    long migrated = importService.migrateStagingToMain();
                    log.info("Migration completed. Migrated {} records", migrated);
                    
                    // Step 3: Cleanup
                    log.info("Cleaning up staging table...");
                    importService.cleanupStaging();
                    log.info("Full workflow completed!");
                }
                default -> {
                    log.error("Unknown command: {}", command);
                    printUsage();
                }
            }
        };
    }
    
    private void printUsage() {
        System.out.println("""
            Trade Data Import Service
            ========================
            
            Usage: java -jar data-import.jar <command> [arguments]
            
            Commands:
              import [directory]    Import all XLSX files from directory to staging table
                                    Default directory: ./data/trades
                                    
              migrate               Migrate data from staging table to main trades table
              
              cleanup               Clean up (truncate) staging table
              
              full [directory]      Full workflow: import -> migrate -> cleanup
                                    Default directory: ./data/trades
            
            Examples:
              java -jar data-import.jar import /path/to/xlsx/files
              java -jar data-import.jar migrate
              java -jar data-import.jar full /path/to/xlsx/files
            """);
    }
}

