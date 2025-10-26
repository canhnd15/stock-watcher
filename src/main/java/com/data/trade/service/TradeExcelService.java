package com.data.trade.service;

import com.data.trade.model.Trade;
import com.data.trade.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TradeExcelService {
    private final TradeRepository tradeRepository;

    public byte[] exportToXlsx(List<Trade> trades) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("trades");
            int r = 0;
            // header
            Row header = sheet.createRow(r++);
            String[] cols = new String[]{"time", "date", "code", "side", "price", "volume"};
            for (int i = 0; i < cols.length; i++) header.createCell(i).setCellValue(cols[i]);

            for (Trade t : trades) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(nullToEmpty(t.getTradeTime())); // HH:mm:ss
                row.createCell(1).setCellValue(nullToEmpty(t.getTradeDate())); // DD/MM/YYYY
                row.createCell(2).setCellValue(nullToEmpty(t.getCode()));
                row.createCell(3).setCellValue(nullToEmpty(t.getSide()));
                row.createCell(4).setCellValue(t.getPrice() == null ? 0 : t.getPrice().doubleValue());
                row.createCell(5).setCellValue(t.getVolume() == null ? 0 : t.getVolume());
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to export trades to XLSX", e);
        }
    }

    public int importFromXlsx(MultipartFile file) {
        try (InputStream in = file.getInputStream(); Workbook wb = new XSSFWorkbook(in)) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null) return 0;
            int rows = sheet.getPhysicalNumberOfRows();
            if (rows <= 1) return 0; // header only

            List<Trade> toSave = new ArrayList<>();

            for (int i = 1; i < rows; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String timeStr = getCellString(row.getCell(0)); // HH:mm:ss
                String dateStr = getCellString(row.getCell(1)); // DD/MM/YYYY
                String code = getCellString(row.getCell(2));
                String side = getCellString(row.getCell(3));
                BigDecimal price = getCellBigDecimal(row.getCell(4));
                Long volume = getCellLong(row.getCell(5));

                if (code == null || code.isBlank()) continue;
                if (price == null || volume == null) continue;
                if (timeStr == null || timeStr.isBlank()) timeStr = "00:00:00";
                if (dateStr == null || dateStr.isBlank()) {
                    // Use current date in DD/MM/YYYY format
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                    dateStr = LocalDate.now().format(fmt);
                }

                Trade t = Trade.builder()
                        .code(code.trim().toUpperCase())
                        .side(side == null ? "other" : side.trim().toLowerCase())
                        .price(price)
                        .volume(volume)
                        .tradeTime(timeStr)
                        .tradeDate(dateStr)
                        .build();
                toSave.add(t);
            }
            if (!toSave.isEmpty()) tradeRepository.saveAll(toSave);
            return toSave.size();
        } catch (IOException e) {
            throw new RuntimeException("Failed to import trades from XLSX", e);
        }
    }

    private static String nullToEmpty(String s) { return s == null ? "" : s; }

    private static String getCellString(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(c)) {
                    // Return date formatted as DD/MM/YYYY
                    DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                    yield LocalDate.ofInstant(c.getDateCellValue().toInstant(), java.time.ZoneId.systemDefault()).format(fmt);
                } else {
                    yield String.valueOf(c.getNumericCellValue());
                }
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> c.getCellFormula();
            default -> null;
        };
    }

    private static BigDecimal getCellBigDecimal(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case NUMERIC -> BigDecimal.valueOf(c.getNumericCellValue());
            case STRING -> {
                try { yield new BigDecimal(c.getStringCellValue().trim()); }
                catch (Exception e) { yield null; }
            }
            default -> null;
        };
    }

    private static Long getCellLong(Cell c) {
        if (c == null) return null;
        return switch (c.getCellType()) {
            case NUMERIC -> (long) c.getNumericCellValue();
            case STRING -> {
                try { yield Long.parseLong(c.getStringCellValue().trim().replace(",", "")); }
                catch (Exception e) { yield null; }
            }
            default -> null;
        };
    }
}
