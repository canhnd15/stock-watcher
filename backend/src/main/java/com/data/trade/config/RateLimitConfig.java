package com.data.trade.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import com.data.trade.model.User;
import com.data.trade.model.UserRole;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class RateLimitConfig {
    
    // Store buckets per user ID
    private final Map<Long, Bucket> userBuckets = new ConcurrentHashMap<>();
    
    /**
     * Get or create a rate limit bucket for a user
     * Different limits based on user role:
     * - NORMAL: 10 requests per minute
     * - VIP: 50 requests per minute
     * - ADMIN: 100 requests per minute
     */
    public Bucket resolveBucket(User user) {
        return userBuckets.computeIfAbsent(user.getId(), userId -> {
            Bandwidth limit = getBandwidthForRole(user.getRole());
            return Bucket.builder()
                    .addLimit(limit)
                    .build();
        });
    }
    
    private Bandwidth getBandwidthForRole(UserRole role) {
        return switch (role) {
            case ADMIN -> Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1)));
            case VIP -> Bandwidth.classic(30, Refill.intervally(20, Duration.ofMinutes(1)));
            case NORMAL -> Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)));
        };
    }

}

