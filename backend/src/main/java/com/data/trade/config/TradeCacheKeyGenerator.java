package com.data.trade.config;

import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.StringJoiner;

@Component("tradeCacheKeyGenerator")
public class TradeCacheKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        // Generate cache key based on all filter parameters
        StringJoiner key = new StringJoiner(":");
        key.add("trades");
        
        // Extract parameters (matching TradeService.findTradesWithFilters signature)
        String code = getParam(params, 0, String.class, "");
        String type = getParam(params, 1, String.class, "");
        Long minVolume = getParam(params, 2, Long.class, null);
        Long maxVolume = getParam(params, 3, Long.class, null);
        BigDecimal minPrice = getParam(params, 4, BigDecimal.class, null);
        BigDecimal maxPrice = getParam(params, 5, BigDecimal.class, null);
        Integer highVolume = getParam(params, 6, Integer.class, null);
        LocalDate fromDate = getParam(params, 7, LocalDate.class, null);
        LocalDate toDate = getParam(params, 8, LocalDate.class, null);
        Integer page = getParam(params, 9, Integer.class, 0);
        Integer size = getParam(params, 10, Integer.class, 10);
        String sort = getParam(params, 11, String.class, "");
        String direction = getParam(params, 12, String.class, "");
        
        // Build cache key from all filter parameters
        key.add(code != null && !code.isBlank() ? code.toUpperCase() : "ALL");
        key.add(type != null && !type.isBlank() ? type.toUpperCase() : "ALL");
        key.add(minVolume != null ? String.valueOf(minVolume) : "NONE");
        key.add(maxVolume != null ? String.valueOf(maxVolume) : "NONE");
        key.add(minPrice != null ? minPrice.toString() : "NONE");
        key.add(maxPrice != null ? maxPrice.toString() : "NONE");
        key.add(highVolume != null ? String.valueOf(highVolume) : "NONE");
        key.add(fromDate != null ? fromDate.toString() : "NONE");
        key.add(toDate != null ? toDate.toString() : "NONE");
        key.add(String.valueOf(page));
        key.add(String.valueOf(size));
        key.add(sort != null && !sort.isBlank() ? sort : "NONE");
        key.add(direction != null && !direction.isBlank() ? direction.toUpperCase() : "NONE");
        
        return key.toString();
    }

    @SuppressWarnings("unchecked")
    private <T> T getParam(Object[] params, int index, Class<T> type, T defaultValue) {
        if (params == null || index >= params.length || params[index] == null) {
            return defaultValue;
        }
        try {
            return (T) params[index];
        } catch (ClassCastException e) {
            return defaultValue;
        }
    }
}

