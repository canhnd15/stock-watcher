package com.data.trade.service;

import com.data.trade.model.Trade;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeExportService {
    
    public byte[] exportTradesToXlsx(List<Trade> trades) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("trades");
            int r = 0;
            Row header = sheet.createRow(r++);
            String[] cols = new String[]{"time", "date", "code", "side", "price", "volume"};
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            
            for (Trade t : trades) {
                Row row = sheet.createRow(r++);
                row.createCell(0).setCellValue(nullToEmpty(t.getTradeTime()));
                row.createCell(1).setCellValue(nullToEmpty(t.getTradeDate()));
                row.createCell(2).setCellValue(nullToEmpty(t.getCode()));
                row.createCell(3).setCellValue(nullToEmpty(t.getSide()));
                row.createCell(4).setCellValue(t.getPrice() == null ? 0 : t.getPrice().doubleValue());
                row.createCell(5).setCellValue(t.getVolume() == null ? 0 : t.getVolume());
            }
            
            for (int i = 0; i < cols.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            log.error("Failed to export trades to XLSX", e);
            throw new RuntimeException("Failed to export trades to XLSX", e);
        }
    }
    
    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}


