package com.data.trade.batch.reader;

import com.data.trade.model.TradeStaging;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.batch.item.ItemReader;
import org.springframework.batch.item.NonTransientResourceException;
import org.springframework.batch.item.ParseException;
import org.springframework.batch.item.UnexpectedInputException;
import org.springframework.core.io.Resource;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;

@Slf4j
public class ExcelTradeItemReader implements ItemReader<TradeStaging> {
    
    private final Resource resource;
    private Workbook workbook;
    private Sheet sheet;
    private int currentRowIndex = 1; // Start after header
    private int totalRows;
    private boolean initialized = false;
    
    // Reuse cell reading logic from TradeExcelService
    private static final DateTimeFormatter DATE_FORMATTER = 
        DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    
    public ExcelTradeItemReader(Resource resource) {
        this.resource = resource;
    }
    
    private void initialize() throws Exception {
        if (initialized) return;
        
        try (InputStream inputStream = resource.getInputStream()) {
            workbook = new XSSFWorkbook(inputStream);
            sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new IllegalStateException("Sheet not found in Excel file");
            }
            totalRows = sheet.getPhysicalNumberOfRows();
            log.info("Initialized Excel reader for file: {}. Total rows: {}", 
                resource.getFilename(), totalRows);
            initialized = true;
        }
    }
    
    @Override
    public TradeStaging read() throws Exception {
        
        if (!initialized) {
            initialize();
        }
        
        // End of file
        if (currentRowIndex >= totalRows) {
            close();
            return null;
        }
        
        Row row = sheet.getRow(currentRowIndex++);
        if (row == null) {
            return read(); // Skip empty rows
        }
        
        try {
            // Support two formats:
            // Format 1 (Import format): code(1), price(2), side(3), date(4), time(5), volume(6)
            // Format 2 (Export format): time(0), date(1), code(2), side(3), price(4), volume(5)
            
            // Try Format 1 first (import format)
            String code = getCellString(row.getCell(1));
            BigDecimal price = getCellBigDecimal(row.getCell(2));
            String side = getCellString(row.getCell(3));
            String dateStr = getCellString(row.getCell(4));
            String timeStr = getCellString(row.getCell(5));
            Long volume = getCellLong(row.getCell(6));
            
            // If Format 1 doesn't work, try Format 2 (export format)
            if (code == null || price == null || volume == null) {
                timeStr = getCellString(row.getCell(0));
                dateStr = getCellString(row.getCell(1));
                code = getCellString(row.getCell(2));
                side = getCellString(row.getCell(3));
                price = getCellBigDecimal(row.getCell(4));
                volume = getCellLong(row.getCell(5));
            }
            
            // Validation
            if (code == null || code.isBlank()) {
                return read(); // Skip invalid rows
            }
            if (price == null || volume == null) {
                return read(); // Skip invalid rows
            }
            
            // Defaults
            if (timeStr == null || timeStr.isBlank()) {
                timeStr = "00:00:00";
            }
            if (dateStr == null || dateStr.isBlank()) {
                dateStr = LocalDate.now().format(DATE_FORMATTER);
            }
            
            return TradeStaging.builder()
                    .code(code.trim().toUpperCase())
                    .side(side == null ? "other" : side.trim().toLowerCase())
                    .price(price)
                    .volume(volume)
                    .tradeTime(timeStr)
                    .tradeDate(dateStr)
                    .build();
                    
        } catch (Exception e) {
            log.warn("Error parsing row {}: {}", currentRowIndex - 1, e.getMessage());
            return read(); // Skip and continue
        }
    }
    
    private void close() {
        try {
            if (workbook != null) {
                workbook.close();
            }
        } catch (Exception e) {
            log.error("Error closing workbook", e);
        }
    }
    
    // Reuse cell reading methods from TradeExcelService
    private String getCellString(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(c)) {
                    try {
                        DataFormatter formatter = new DataFormatter();
                        String dateStr = formatter.formatCellValue(c);
                        if (dateStr.matches("\\d{1,2}/\\d{1,2}/\\d{4}")) {
                            yield dateStr;
                        }
                        // Try parsing different formats
                        String[] patterns = {"dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"};
                        for (String pattern : patterns) {
                            try {
                                DateTimeFormatter testFmt = DateTimeFormatter.ofPattern(pattern);
                                LocalDate parsed = LocalDate.parse(dateStr, testFmt);
                                yield parsed.format(DATE_FORMATTER);
                            } catch (Exception ignored) {}
                        }
                        // Fallback to timezone-aware conversion
                        Date excelDate = c.getDateCellValue();
                        LocalDate date = excelDate.toInstant()
                                .atZone(VIETNAM_ZONE)
                                .toLocalDate();
                        yield date.format(DATE_FORMATTER);
                    } catch (Exception e) {
                        Date excelDate = c.getDateCellValue();
                        LocalDate date = excelDate.toInstant()
                                .atZone(VIETNAM_ZONE)
                                .toLocalDate();
                        yield date.format(DATE_FORMATTER);
                    }
                } else {
                    yield String.valueOf(c.getNumericCellValue());
                }
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> c.getCellFormula();
            default -> null;
        };
    }
    
    private BigDecimal getCellBigDecimal(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case NUMERIC -> BigDecimal.valueOf(c.getNumericCellValue());
            case STRING -> {
                try { 
                    yield new BigDecimal(c.getStringCellValue().trim()); 
                } catch (Exception e) { 
                    yield null; 
                }
            }
            default -> null;
        };
    }
    
    private Long getCellLong(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case NUMERIC -> (long) c.getNumericCellValue();
            case STRING -> {
                try { 
                    yield Long.parseLong(c.getStringCellValue().trim().replace(",", "")); 
                } catch (Exception e) { 
                    yield null; 
                }
            }
            default -> null;
        };
    }
}

