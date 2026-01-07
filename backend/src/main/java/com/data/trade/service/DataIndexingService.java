package com.data.trade.service;

import com.data.trade.dto.SignalNotification;
import com.data.trade.model.TrackedStock;
import com.data.trade.model.Trade;
import com.data.trade.repository.DocumentChunkRepository;
import com.data.trade.repository.TradeRepository;
import com.data.trade.repository.TrackedStockRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataIndexingService {

    private final EmbeddingService embeddingService;
    private final DataChunkingService chunkingService;
    private final DocumentChunkRepository documentChunkRepository;
    private final TradeRepository tradeRepository;
    private final TrackedStockRepository trackedStockRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${rag.initial-indexing.max-days:180}")
    private int maxDays;

    @Value("${rag.initial-indexing.batch-size:30}")
    private int batchSize;

    /**
     * Index trade data for a specific date (incremental indexing)
     * Called automatically after each cron job ingestion
     * 
     * @param tradeDate Trade date in DD/MM/YYYY format
     * @return Number of chunks indexed
     */
    @Transactional
    public int indexTradesForDate(String tradeDate) {
        log.info("Starting incremental indexing for trade date: {}", tradeDate);
        
        try {
            // Get distinct stock codes for this date
            List<String> codes = tradeRepository.findDistinctCodesByTradeDate(tradeDate);
            int indexedCount = 0;
            
            for (String code : codes) {
                try {
                    // Check if there are trades for this code on this date
                    List<Trade> trades = tradeRepository.findByCodeAndTradeDate(code, tradeDate);
                    if (trades.isEmpty()) {
                        continue; // No trades for this code on this date
                    }
                    
                    // Calculate daily aggregates for this code and date
                    Long buyVolume = trades.stream()
                        .filter(t -> "buy".equalsIgnoreCase(t.getSide()))
                        .mapToLong(Trade::getVolume)
                        .sum();
                    
                    Long sellVolume = trades.stream()
                        .filter(t -> "sell".equalsIgnoreCase(t.getSide()))
                        .mapToLong(Trade::getVolume)
                        .sum();
                    
                    BigDecimal lowPrice = trades.stream()
                        .map(Trade::getPrice)
                        .min(BigDecimal::compareTo)
                        .orElse(BigDecimal.ZERO);
                    
                    BigDecimal highPrice = trades.stream()
                        .map(Trade::getPrice)
                        .max(BigDecimal::compareTo)
                        .orElse(BigDecimal.ZERO);
                    
                    // Get first and last prices for open/close
                    BigDecimal openPrice = trades.stream()
                        .min((t1, t2) -> {
                            int dateCompare = t1.getTradeDate().compareTo(t2.getTradeDate());
                            if (dateCompare != 0) return dateCompare;
                            return t1.getTradeTime().compareTo(t2.getTradeTime());
                        })
                        .map(Trade::getPrice)
                        .orElse(BigDecimal.ZERO);
                    
                    BigDecimal closePrice = trades.stream()
                        .max((t1, t2) -> {
                            int dateCompare = t1.getTradeDate().compareTo(t2.getTradeDate());
                            if (dateCompare != 0) return dateCompare;
                            return t1.getTradeTime().compareTo(t2.getTradeTime());
                        })
                        .map(Trade::getPrice)
                        .orElse(BigDecimal.ZERO);
                    
                    // Count large and medium blocks
                    Long largeBuyBlocks = trades.stream()
                        .filter(t -> "buy".equalsIgnoreCase(t.getSide()) && t.getVolume() >= 400000)
                        .count();
                    
                    Long largeSellBlocks = trades.stream()
                        .filter(t -> "sell".equalsIgnoreCase(t.getSide()) && t.getVolume() >= 400000)
                        .count();
                    
                    Long mediumBuyBlocks = trades.stream()
                        .filter(t -> "buy".equalsIgnoreCase(t.getSide()) && t.getVolume() >= 100000 && t.getVolume() < 400000)
                        .count();
                    
                    Long mediumSellBlocks = trades.stream()
                        .filter(t -> "sell".equalsIgnoreCase(t.getSide()) && t.getVolume() >= 100000 && t.getVolume() < 400000)
                        .count();
                    
                    // Create chunk
                    String chunkContent = chunkingService.createTradeChunk(
                        code, tradeDate, buyVolume, sellVolume,
                        lowPrice, highPrice, openPrice, closePrice,
                        largeBuyBlocks, largeSellBlocks, mediumBuyBlocks, mediumSellBlocks
                    );
                    
                    // Create metadata
                    Map<String, Object> metadata = chunkingService.createTradeMetadata(code, tradeDate);
                    
                    // Upsert: Delete existing chunks for this date/code
                    String metadataFilter = objectMapper.writeValueAsString(metadata);
                    documentChunkRepository.deleteByMetadata(metadataFilter);
                    
                    // Generate embedding and save
                    float[] embedding = embeddingService.generateEmbedding(chunkContent);
                    saveDocumentChunk(chunkContent, metadata, embedding);
                    
                    indexedCount++;
                } catch (Exception e) {
                    log.error("Error indexing trades for code {} on date {}: {}", code, tradeDate, e.getMessage());
                }
            }
            
            log.info("Completed incremental indexing for date {}. Indexed {} chunks.", tradeDate, indexedCount);
            return indexedCount;
            
        } catch (Exception e) {
            log.error("Error during incremental indexing for date {}: {}", tradeDate, e.getMessage(), e);
            throw new RuntimeException("Failed to index trades for date: " + tradeDate, e);
        }
    }

    /**
     * Index trades for a date range (bulk indexing)
     * 
     * @param fromDate Start date in DD/MM/YYYY format
     * @param toDate End date in DD/MM/YYYY format
     * @param batchSize Number of dates to process per batch
     * @return Progress information
     */
    @Transactional
    public Map<String, Object> indexTradesForDateRange(String fromDate, String toDate, int batchSize) {
        log.info("Starting bulk indexing for date range: {} to {}", fromDate, toDate);
        
        // Convert dates to numeric format for querying
        String fromDateStr = convertDateToNumeric(fromDate);
        String toDateStr = convertDateToNumeric(toDate);
        
        // Get distinct dates in range
        List<String> dates = tradeRepository.findDistinctTradeDatesInRange(fromDateStr, toDateStr, 10000);
        
        int totalDates = dates.size();
        int processedDates = 0;
        int totalChunks = 0;
        
        // Process in batches
        for (int i = 0; i < dates.size(); i += batchSize) {
            List<String> batch = dates.subList(i, Math.min(i + batchSize, dates.size()));
            
            for (String date : batch) {
                try {
                    int chunks = indexTradesForDate(date);
                    totalChunks += chunks;
                    processedDates++;
                    
                    if (processedDates % 10 == 0) {
                        log.info("Progress: {}/{} dates processed, {} chunks indexed", 
                            processedDates, totalDates, totalChunks);
                    }
                } catch (Exception e) {
                    log.error("Error processing date {}: {}", date, e.getMessage());
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("status", "completed");
        result.put("processed", processedDates);
        result.put("total", totalDates);
        result.put("chunksIndexed", totalChunks);
        
        log.info("Completed bulk indexing. Processed {}/{} dates, indexed {} chunks", 
            processedDates, totalDates, totalChunks);
        
        return result;
    }

    /**
     * Index all historical trades (prioritizes recent data)
     * 
     * @param maxDays Maximum number of days to index (0 = all)
     * @param batchSize Number of dates per batch
     * @return Progress information
     */
    @Transactional
    public Map<String, Object> indexAllHistoricalTrades(int maxDays, int batchSize) {
        log.info("Starting historical indexing. Max days: {}, Batch size: {}", maxDays, batchSize);
        
        List<String> allDates = tradeRepository.findDistinctTradeDates();
        
        // Limit to maxDays if specified
        List<String> datesToProcess = maxDays > 0 && maxDays < allDates.size()
            ? allDates.subList(0, maxDays)
            : allDates;
        
        int totalDates = datesToProcess.size();
        int processedDates = 0;
        int totalChunks = 0;
        
        // Process in batches
        for (int i = 0; i < datesToProcess.size(); i += batchSize) {
            List<String> batch = datesToProcess.subList(i, Math.min(i + batchSize, datesToProcess.size()));
            
            for (String date : batch) {
                try {
                    int chunks = indexTradesForDate(date);
                    totalChunks += chunks;
                    processedDates++;
                    
                    if (processedDates % 10 == 0) {
                        log.info("Progress: {}/{} dates processed, {} chunks indexed", 
                            processedDates, totalDates, totalChunks);
                    }
                } catch (Exception e) {
                    log.error("Error processing date {}: {}", date, e.getMessage());
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("status", "completed");
        result.put("processed", processedDates);
        result.put("total", totalDates);
        result.put("chunksIndexed", totalChunks);
        
        return result;
    }

    /**
     * Index all tracked stocks
     */
    @Transactional
    public int indexTrackedStocks() {
        log.info("Starting indexing of tracked stocks");
        
        List<TrackedStock> trackedStocks = trackedStockRepository.findAll();
        int indexedCount = 0;
        
        for (TrackedStock trackedStock : trackedStocks) {
            try {
                String chunkContent = chunkingService.createTrackedStockChunk(trackedStock);
                Map<String, Object> metadata = chunkingService.createTrackedStockMetadata(trackedStock);
                
                // Upsert: Delete existing chunks for this tracked stock
                String metadataFilter = objectMapper.writeValueAsString(metadata);
                documentChunkRepository.deleteByMetadata(metadataFilter);
                
                // Generate embedding and save
                float[] embedding = embeddingService.generateEmbedding(chunkContent);
                saveDocumentChunk(chunkContent, metadata, embedding);
                
                indexedCount++;
            } catch (Exception e) {
                log.error("Error indexing tracked stock {}: {}", trackedStock.getCode(), e.getMessage());
            }
        }
        
        log.info("Completed indexing of tracked stocks. Indexed {} chunks.", indexedCount);
        return indexedCount;
    }

    /**
     * Index signals (called after signal calculation)
     */
    @Transactional
    public int indexSignals(List<SignalNotification> signals) {
        if (signals == null || signals.isEmpty()) {
            return 0;
        }
        
        log.info("Starting indexing of {} signals", signals.size());
        int indexedCount = 0;
        
        for (SignalNotification signal : signals) {
            try {
                String chunkContent = chunkingService.createSignalChunk(signal);
                Map<String, Object> metadata = chunkingService.createSignalMetadata(signal);
                
                // Generate embedding and save
                float[] embedding = embeddingService.generateEmbedding(chunkContent);
                saveDocumentChunk(chunkContent, metadata, embedding);
                
                indexedCount++;
            } catch (Exception e) {
                log.error("Error indexing signal for {}: {}", signal.getCode(), e.getMessage());
            }
        }
        
        log.info("Completed indexing of signals. Indexed {} chunks.", indexedCount);
        return indexedCount;
    }

    /**
     * Index OHLC statistics for a stock
     */
    @Transactional
    public int indexOHLCStats(String code) {
        try {
            List<Object[]> stats = tradeRepository.findLast10DaysStats(code);
            
            if (stats.isEmpty()) {
                return 0;
            }
            
            String chunkContent = chunkingService.createOHLCChunk(code, stats);
            Map<String, Object> metadata = chunkingService.createOHLCMetadata(code);
            
            // Upsert: Delete existing OHLC chunks for this stock
            String metadataFilter = objectMapper.writeValueAsString(metadata);
            documentChunkRepository.deleteByMetadata(metadataFilter);
            
            // Generate embedding and save
            float[] embedding = embeddingService.generateEmbedding(chunkContent);
            saveDocumentChunk(chunkContent, metadata, embedding);
            
            return 1;
        } catch (Exception e) {
            log.error("Error indexing OHLC stats for {}: {}", code, e.getMessage());
            return 0;
        }
    }

    /**
     * Save document chunk using native SQL (to handle vector type)
     */
    private void saveDocumentChunk(String content, Map<String, Object> metadata, float[] embedding) {
        try {
            String metadataJson = objectMapper.writeValueAsString(metadata);
            String embeddingVector = convertEmbeddingToVectorString(embedding);
            
            String sql = """
                INSERT INTO trade_data_chunks (content, metadata, embedding, created_at)
                VALUES (:content, CAST(:metadata AS jsonb), CAST(:embedding AS vector), CURRENT_TIMESTAMP)
                """;
            
            entityManager.createNativeQuery(sql)
                .setParameter("content", content)
                .setParameter("metadata", metadataJson)
                .setParameter("embedding", embeddingVector)
                .executeUpdate();
                
        } catch (Exception e) {
            log.error("Error saving document chunk: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save document chunk", e);
        }
    }

    private String convertEmbeddingToVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        sb.append("]");
        return sb.toString();
    }

    private String convertDateToNumeric(String date) {
        // Convert DD/MM/YYYY to YYYYMMDD
        String[] parts = date.split("/");
        if (parts.length == 3) {
            return parts[2] + parts[1] + parts[0];
        }
        return date.replace("/", "");
    }

    private BigDecimal getBigDecimal(Object[] array, int index) {
        if (array == null || index >= array.length || array[index] == null) {
            return null;
        }
        Object value = array[index];
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue());
        return null;
    }

    private Long getLong(Object[] array, int index) {
        if (array == null || index >= array.length || array[index] == null) {
            return null;
        }
        Object value = array[index];
        if (value instanceof Long) return (Long) value;
        if (value instanceof Number) return ((Number) value).longValue();
        return null;
    }
}

