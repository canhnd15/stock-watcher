package com.data.trade.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Cache configuration using Caffeine for in-memory caching
 * Provides fast access to calculated suggestions and recommendations
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Value("${cache.suggestions.ttl-minutes:5}")
    private int cacheTtlMinutes;

    @Value("${cache.suggestions.max-size:1000}")
    private int cacheMaxSize;

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                "recommendations",      // Cache for individual stock recommendations
                "allSuggestions"        // Cache for all suggestions list
        );
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(cacheMaxSize)
                .expireAfterWrite(cacheTtlMinutes, TimeUnit.MINUTES)
                .recordStats()  // Enable cache statistics for monitoring
        );
        return cacheManager;
    }
}
