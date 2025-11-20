package com.data.trade.service;

import com.data.trade.dto.DailyOHLCDTO;
import com.data.trade.dto.DailyTradeStatsDTO;
import com.data.trade.dto.IntradayPriceDTO;
import com.data.trade.dto.TradePageResponse;
import com.data.trade.model.Trade;
import com.data.trade.repository.TradeRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TradeService {

    private final TradeRepository tradeRepository;
    private final TradeIngestionService ingestionService;

    @Value("${market.vn30.codes}")
    private List<String> vn30;
    
    private static final DateTimeFormatter DD_MM_YYYY_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter YYYYMMDD_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");
    
    /**
     * Converts DD/MM/YYYY format date string to YYYYMMDD format for lexicographic comparison.
     * This is a helper method to build a sortable date expression from the tradeDate field.
     */
    private Expression<String> buildSortableDateExpression(
            Root<Trade> root,
            CriteriaBuilder cb) {
        // Extract parts: "DD/MM/YYYY" -> YYYYMMDD
        // Position 1-2: Day, Position 4-5: Month, Position 7-10: Year
        Expression<String> year = cb.function(
            "SUBSTRING", String.class, root.get("tradeDate"), cb.literal(7), cb.literal(4)
        );
        Expression<String> month = cb.function(
            "SUBSTRING", String.class, root.get("tradeDate"), cb.literal(4), cb.literal(2)
        );
        Expression<String> day = cb.function(
            "SUBSTRING", String.class, root.get("tradeDate"), cb.literal(1), cb.literal(2)
        );
        return cb.concat(year, cb.concat(month, day));
    }

    public TradePageResponse findTrades(Specification<Trade> spec, Pageable pageable) {
        // Get paginated results
        Page<Trade> tradesPage = tradeRepository.findAll(spec, pageable);
        
        // Calculate volume statistics from all matching records (not just the current page)
        List<Trade> allMatchingTrades = tradeRepository.findAll(spec);
        
        long totalVolume = allMatchingTrades.stream()
                .mapToLong(Trade::getVolume)
                .sum();
        
        long buyVolume = allMatchingTrades.stream()
                .filter(t -> "buy".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();
        
        long sellVolume = allMatchingTrades.stream()
                .filter(t -> "sell".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();
        
        long unknownVolume = allMatchingTrades.stream()
                .filter(t -> !"buy".equalsIgnoreCase(t.getSide()) && !"sell".equalsIgnoreCase(t.getSide()))
                .mapToLong(Trade::getVolume)
                .sum();

        long buyCount = allMatchingTrades.stream()
                .filter(t -> "buy".equalsIgnoreCase(t.getSide()))
                .count();
        
        long sellCount = allMatchingTrades.stream()
                .filter(t -> "sell".equalsIgnoreCase(t.getSide()))
                .count();
        
        long unknownCount = allMatchingTrades.stream()
                .filter(t -> !"buy".equalsIgnoreCase(t.getSide()) && !"sell".equalsIgnoreCase(t.getSide()))
                .count();
        
        return TradePageResponse.builder()
                .trades(tradesPage)
                .totalVolume(totalVolume)
                .buyVolume(buyVolume)
                .sellVolume(sellVolume)
                .unknownVolume(unknownVolume)
                .totalRecords(allMatchingTrades.size())
                .buyCount(buyCount)
                .sellCount(sellCount)
                .unknownCount(unknownCount)
                .build();
    }

    public TradePageResponse findTradesWithFilters(
            String code,
            String type,
            Long minVolume,
            Long maxVolume,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Integer highVolume,
            LocalDate fromDate,
            LocalDate toDate,
            int page,
            int size,
            String sort,
            String direction
    ) {
        // Create Pageable with sorting if sort parameter is provided
        Pageable pageable;
        if (sort != null && !sort.isBlank()) {
            Sort.Direction sortDirection = 
                "desc".equalsIgnoreCase(direction) ? 
                Sort.Direction.DESC : 
                Sort.Direction.ASC;
            pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));
        } else {
            pageable = PageRequest.of(page, size);
        }
        
        // Build specifications for filtering
        List<Specification<Trade>> specs = new ArrayList<>();
        if (code != null && !code.isBlank()) {
            specs.add((root, q, cb) -> cb.equal(cb.upper(root.get("code")), code.toUpperCase()));
        }
        if (type != null && !type.isBlank()) {
            // Use case-insensitive comparison for side filter
            specs.add((root, q, cb) -> cb.equal(cb.lower(root.get("side")), type.toLowerCase()));
        }
        if (minVolume != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), minVolume));
        }
        if (maxVolume != null) {
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("volume"), maxVolume));
        }
        if (minPrice != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice));
        }
        if (maxPrice != null) {
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice));
        }
        if (highVolume != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), highVolume));
        }
        
        // Date range filtering on tradeDate (string in DD/MM/YYYY format)
        // Convert DD/MM/YYYY to YYYYMMDD format for lexicographic comparison
        if (fromDate != null && toDate != null) {
            String fromDateSortable = fromDate.format(YYYYMMDD_FORMATTER);
            String toDateSortable = toDate.format(YYYYMMDD_FORMATTER);
            specs.add((root, q, cb) -> {
                jakarta.persistence.criteria.Expression<String> tradeDateSortable = buildSortableDateExpression(root, cb);
                return cb.and(
                    cb.greaterThanOrEqualTo(tradeDateSortable, cb.literal(fromDateSortable)),
                    cb.lessThanOrEqualTo(tradeDateSortable, cb.literal(toDateSortable))
                );
            });
        } else if (fromDate != null) {
            String fromDateSortable = fromDate.format(YYYYMMDD_FORMATTER);
            specs.add((root, q, cb) -> {
                jakarta.persistence.criteria.Expression<String> tradeDateSortable = buildSortableDateExpression(root, cb);
                return cb.greaterThanOrEqualTo(tradeDateSortable, cb.literal(fromDateSortable));
            });
        } else if (toDate != null) {
            String toDateSortable = toDate.format(YYYYMMDD_FORMATTER);
            specs.add((root, q, cb) -> {
                jakarta.persistence.criteria.Expression<String> tradeDateSortable = buildSortableDateExpression(root, cb);
                return cb.lessThanOrEqualTo(tradeDateSortable, cb.literal(toDateSortable));
            });
        }
        
        Specification<Trade> spec = Specification.allOf(specs);
        
        return findTrades(spec, pageable);
    }

    public Specification<Trade> buildTradeSpecification(
            String code,
            String type,
            Long minVolume,
            Long maxVolume,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Integer highVolume,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        // Build specifications for filtering
        List<Specification<Trade>> specs = new ArrayList<>();
        if (code != null && !code.isBlank()) {
            specs.add((root, q, cb) -> cb.equal(cb.upper(root.get("code")), code.toUpperCase()));
        }
        if (type != null && !type.isBlank()) {
            // Use case-insensitive comparison for side filter
            specs.add((root, q, cb) -> cb.equal(cb.lower(root.get("side")), type.toLowerCase()));
        }
        if (minVolume != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), minVolume));
        }
        if (maxVolume != null) {
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("volume"), maxVolume));
        }
        if (minPrice != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice));
        }
        if (maxPrice != null) {
            specs.add((root, q, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice));
        }
        if (highVolume != null) {
            specs.add((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("volume"), highVolume));
        }
        
        // Date range filtering on tradeDate (string in DD/MM/YYYY format)
        // Convert DD/MM/YYYY to YYYYMMDD format for lexicographic comparison
        if (fromDate != null && toDate != null) {
            String fromDateSortable = fromDate.format(YYYYMMDD_FORMATTER);
            String toDateSortable = toDate.format(YYYYMMDD_FORMATTER);
            specs.add((root, q, cb) -> {
                jakarta.persistence.criteria.Expression<String> tradeDateSortable = buildSortableDateExpression(root, cb);
                return cb.and(
                    cb.greaterThanOrEqualTo(tradeDateSortable, cb.literal(fromDateSortable)),
                    cb.lessThanOrEqualTo(tradeDateSortable, cb.literal(toDateSortable))
                );
            });
        } else if (fromDate != null) {
            String fromDateSortable = fromDate.format(YYYYMMDD_FORMATTER);
            specs.add((root, q, cb) -> {
                jakarta.persistence.criteria.Expression<String> tradeDateSortable = buildSortableDateExpression(root, cb);
                return cb.greaterThanOrEqualTo(tradeDateSortable, cb.literal(fromDateSortable));
            });
        } else if (toDate != null) {
            String toDateSortable = toDate.format(YYYYMMDD_FORMATTER);
            specs.add((root, q, cb) -> {
                jakarta.persistence.criteria.Expression<String> tradeDateSortable = buildSortableDateExpression(root, cb);
                return cb.lessThanOrEqualTo(tradeDateSortable, cb.literal(toDateSortable));
            });
        }
        
        return Specification.allOf(specs);
    }

    public void ingestForCode(String code) {
        String normalized = code.trim().toUpperCase();
        ingestionService.ingestForCode(normalized);
    }

    public void ingestAllVn30() {
        for (String stockCode : vn30) {
            ingestionService.ingestForCode(stockCode);
        }
    }

    public String getRecommendation(String code, LocalDate date) {
        String normalized = code.trim().toUpperCase();
        LocalDate tradeDate = (date == null) ? LocalDate.now() : date;
        String tradeDateStr = tradeDate.format(DD_MM_YYYY_FORMATTER);
        String rec = tradeRepository.recommendationFor(normalized, tradeDateStr);
        return (rec == null) ? "Neutral — hold" : rec;
    }

    public void reingestForCode(String code) {
        String normalized = code.trim().toUpperCase();
        LocalDate today = LocalDate.now();
        String todayStr = today.format(DD_MM_YYYY_FORMATTER);
        tradeRepository.deleteForCodeOnDate(normalized, todayStr);
        ingestionService.ingestForCode(normalized);
    }

    public List<Trade> findAllTrades(Specification<Trade> spec) {
        return tradeRepository.findAll(spec);
    }

    public List<DailyTradeStatsDTO> getDailyStats(String code, LocalDate fromDate, LocalDate toDate) {
        // Convert LocalDate to YYYYMMDD string format for comparison
        String fromDateStr = (fromDate != null) ? fromDate.format(YYYYMMDD_FORMATTER) : null;
        String toDateStr = (toDate != null) ? toDate.format(YYYYMMDD_FORMATTER) : null;
        
        // Normalize code
        String normalizedCode = (code != null && !code.isBlank()) ? code.trim().toUpperCase() : null;
        
        // Get aggregated data from repository
        List<Object[]> results = tradeRepository.findDailyStats(normalizedCode, fromDateStr, toDateStr);
        
        // Transform to DTOs
        return results.stream()
                .map(row -> {
                    String date = (String) row[0]; // trade_date (DD/MM/YYYY)
                    BigDecimal latestPrice = row[1] != null ? 
                        ((BigDecimal) row[1]).setScale(2, RoundingMode.HALF_UP) : null;
                    BigDecimal minPrice = row[2] != null ? 
                        ((BigDecimal) row[2]).setScale(2, RoundingMode.HALF_UP) : null;
                    BigDecimal maxPrice = row[3] != null ? 
                        ((BigDecimal) row[3]).setScale(2, RoundingMode.HALF_UP) : null;
                    Long totalVolume = row[4] != null ? ((Number) row[4]).longValue() : 0L;
                    
                    return DailyTradeStatsDTO.builder()
                            .date(date)
                            .latestPrice(latestPrice)
                            .minPrice(minPrice)
                            .maxPrice(maxPrice)
                            .totalVolume(totalVolume)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<DailyOHLCDTO> getDailyOHLC(String code, LocalDate fromDate, LocalDate toDate) {
        // Convert LocalDate to YYYYMMDD string format for comparison
        String fromDateStr = (fromDate != null) ? fromDate.format(YYYYMMDD_FORMATTER) : null;
        String toDateStr = (toDate != null) ? toDate.format(YYYYMMDD_FORMATTER) : null;
        
        // Normalize code
        String normalizedCode = (code != null && !code.isBlank()) ? code.trim().toUpperCase() : null;
        
        if (normalizedCode == null) {
            return new ArrayList<>();
        }
        
        // Get OHLC data from repository
        List<Object[]> results = tradeRepository.findDailyOHLC(normalizedCode, fromDateStr, toDateStr);
        
        // Transform to DTOs
        // Query returns: code, trade_date, open_price, high_price, low_price, close_price
        return results.stream()
                .map(row -> {
                    String stockCode = (String) row[0]; // code
                    String date = (String) row[1]; // trade_date (DD/MM/YYYY)
                    BigDecimal openPrice = row[2] != null ? 
                        ((BigDecimal) row[2]).setScale(2, RoundingMode.HALF_UP) : null;
                    BigDecimal highPrice = row[3] != null ? 
                        ((BigDecimal) row[3]).setScale(2, RoundingMode.HALF_UP) : null;
                    BigDecimal lowPrice = row[4] != null ? 
                        ((BigDecimal) row[4]).setScale(2, RoundingMode.HALF_UP) : null;
                    BigDecimal closePrice = row[5] != null ? 
                        ((BigDecimal) row[5]).setScale(2, RoundingMode.HALF_UP) : null;
                    
                    return DailyOHLCDTO.builder()
                            .code(stockCode)
                            .date(date)
                            .openPrice(openPrice)
                            .highPrice(highPrice)
                            .lowPrice(lowPrice)
                            .closePrice(closePrice)
                            .build();
                })
                .collect(Collectors.toList());
    }

    public List<IntradayPriceDTO> getIntradayPriceData(String code, LocalDate tradeDate) {
        // Normalize code
        String normalizedCode = (code != null && !code.isBlank()) ? code.trim().toUpperCase() : null;
        
        if (normalizedCode == null) {
            return new ArrayList<>();
        }
        
        // Use today's date if not provided
        LocalDate targetDate = (tradeDate != null) ? tradeDate : LocalDate.now();
        String tradeDateStr = targetDate.format(DD_MM_YYYY_FORMATTER);
        
        // Get intraday price data from repository
        List<Object[]> results = tradeRepository.findIntradayPriceData(normalizedCode, tradeDateStr);
        
        // Transform to DTOs
        // Query returns: time_interval (HH:mm), avg_price, min_price, max_price, total_volume
        return results.stream()
                .map(row -> {
                    String timeInterval = (String) row[0]; // time_interval (HH:mm)
                    BigDecimal avgPrice = row[1] != null ? 
                        ((BigDecimal) row[1]).setScale(2, RoundingMode.HALF_UP) : null;
                    BigDecimal minPrice = row[2] != null ? 
                        ((BigDecimal) row[2]).setScale(2, RoundingMode.HALF_UP) : null;
                    BigDecimal maxPrice = row[3] != null ? 
                        ((BigDecimal) row[3]).setScale(2, RoundingMode.HALF_UP) : null;
                    Long totalVolume = row[4] != null ? ((Number) row[4]).longValue() : 0L;
                    
                    return IntradayPriceDTO.builder()
                            .time(timeInterval)
                            .averagePrice(avgPrice)
                            .highestPrice(maxPrice)
                            .lowestPrice(minPrice)
                            .totalVolume(totalVolume)
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Get intraday price data for multiple stock codes in batch
     * @param codes List of stock codes
     * @param tradeDate Optional trade date (if null, uses current date)
     * @return Map of stock code to list of intraday price data
     */
    public Map<String, List<IntradayPriceDTO>> getIntradayPriceDataBatch(
            List<String> codes, 
            LocalDate tradeDate) {
        if (codes == null || codes.isEmpty()) {
            return new HashMap<>();
        }
        
        // Use today's date if not provided
        LocalDate targetDate = (tradeDate != null) ? tradeDate : LocalDate.now();
        String tradeDateStr = targetDate.format(DD_MM_YYYY_FORMATTER);
        
        // Normalize codes and filter out null/blank codes
        List<String> normalizedCodes = codes.stream()
                .filter(code -> code != null && !code.isBlank())
                .map(code -> code.trim().toUpperCase())
                .distinct()
                .collect(Collectors.toList());
        
        if (normalizedCodes.isEmpty()) {
            return new HashMap<>();
        }
        
        // Get intraday price data for all codes
        Map<String, List<IntradayPriceDTO>> resultMap = new HashMap<>();
        
        for (String code : normalizedCodes) {
            try {
                List<Object[]> results = tradeRepository.findIntradayPriceData(code, tradeDateStr);
                
                // Transform to DTOs
                List<IntradayPriceDTO> priceData = results.stream()
                        .map(row -> {
                            String timeInterval = (String) row[0]; // time_interval (HH:mm)
                            BigDecimal avgPrice = row[1] != null ? 
                                ((BigDecimal) row[1]).setScale(2, RoundingMode.HALF_UP) : null;
                            BigDecimal minPrice = row[2] != null ? 
                                ((BigDecimal) row[2]).setScale(2, RoundingMode.HALF_UP) : null;
                            BigDecimal maxPrice = row[3] != null ? 
                                ((BigDecimal) row[3]).setScale(2, RoundingMode.HALF_UP) : null;
                            Long totalVolume = row[4] != null ? ((Number) row[4]).longValue() : 0L;
                            
                            return IntradayPriceDTO.builder()
                                    .time(timeInterval)
                                    .averagePrice(avgPrice)
                                    .highestPrice(maxPrice)
                                    .lowestPrice(minPrice)
                                    .totalVolume(totalVolume)
                                    .build();
                        })
                        .collect(Collectors.toList());
                
                resultMap.put(code, priceData);
            } catch (Exception e) {
                // Log error but continue with other codes
                // Return empty list for this code
                resultMap.put(code, new ArrayList<>());
            }
        }
        
        return resultMap;
    }
}

