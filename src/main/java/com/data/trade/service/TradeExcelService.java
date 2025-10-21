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
import java.time.*;
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
            String[] cols = new String[]{"time", "code", "side", "price", "volume"};
            for (int i = 0; i < cols.length; i++) header.createCell(i).setCellValue(cols[i]);

            DateTimeFormatter fmt = DateTimeFormatter.ISO_OFFSET_DATE_TIME;
            for (Trade t : trades) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(t.getTradeTime() == null ? "" : fmt.format(t.getTradeTime()));
                row.createCell(1).setCellValue(nullToEmpty(t.getCode()));
                row.createCell(2).setCellValue(nullToEmpty(t.getSide()));
                row.createCell(3).setCellValue(t.getPrice() == null ? 0 : t.getPrice().doubleValue());
                row.createCell(4).setCellValue(t.getVolume() == null ? 0 : t.getVolume());
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
            ZoneId vnZone = ZoneId.of("Asia/Ho_Chi_Minh");

            for (int i = 1; i < rows; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String timeStr = getCellString(row.getCell(0));
                String code = getCellString(row.getCell(1));
                String side = getCellString(row.getCell(2));
                BigDecimal price = getCellBigDecimal(row.getCell(3));
                Long volume = getCellLong(row.getCell(4));

                if (code == null || code.isBlank()) continue;
                if (price == null || volume == null) continue;
                OffsetDateTime tradeTime = parseTime(timeStr, vnZone);

                Trade t = Trade.builder()
                        .code(code.trim().toUpperCase())
                        .side(side == null ? "other" : side.trim().toLowerCase())
                        .price(price)
                        .volume(volume)
                        .tradeTime(tradeTime == null ? OffsetDateTime.now(vnZone) : tradeTime)
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
                    Instant inst = c.getDateCellValue().toInstant();
                    yield OffsetDateTime.ofInstant(inst, ZoneId.systemDefault()).toString();
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

    private static OffsetDateTime parseTime(String s, ZoneId defaultZone) {
        if (s == null || s.isBlank()) return null;
        try {
            return OffsetDateTime.parse(s.trim());
        } catch (Exception ignored) {}
        try {
            LocalDateTime ldt = LocalDateTime.parse(s.trim());
            return ldt.atZone(defaultZone).toOffsetDateTime();
        } catch (Exception ignored) {}
        try {
            Instant inst = Instant.parse(s.trim());
            return OffsetDateTime.ofInstant(inst, defaultZone);
        } catch (Exception ignored) {}
        return null;
    }
}
