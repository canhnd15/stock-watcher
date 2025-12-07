package com.data.trade.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * Service to communicate with backend API for triggering signal calculations
 * This ensures signals are sent via backend's WebSocket that clients are connected to
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BackendApiClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${app.backend.base-url:http://localhost:8899}")
    private String backendBaseUrl;

    /**
     * Trigger signal calculation on backend service
     * This will broadcast signals via backend's WebSocket to all connected clients
     */
    public void triggerSignalCalculation() {
        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(backendBaseUrl)
                    .build();

            log.info("Calling backend API to trigger signal calculation: {}/api/internal/signals/refresh", backendBaseUrl);
            
            webClient.post()
                    .uri("/api/internal/signals/refresh")
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.fixedDelay(2, Duration.ofSeconds(1))
                            .filter(throwable -> {
                                log.warn("Retrying backend API call after error: {}", throwable.getMessage());
                                return true;
                            }))
                    .doOnSuccess(response -> log.info("Backend signal calculation triggered successfully"))
                    .doOnError(error -> log.error("Failed to trigger signal calculation on backend: {}", error.getMessage(), error))
                    .block(Duration.ofSeconds(5));
                    
        } catch (Exception e) {
            log.error("Error calling backend API for signal calculation: {}", e.getMessage(), e);
            // Don't throw - allow cron job to continue even if this fails
        }
    }

    /**
     * Trigger tracked stock notifications check on backend service
     */
    public void triggerTrackedStockNotificationsCheck() {
        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(backendBaseUrl)
                    .build();

            log.info("Calling backend API to trigger tracked stock notifications: {}/api/internal/signals/check-tracked", backendBaseUrl);
            
            webClient.post()
                    .uri("/api/internal/signals/check-tracked")
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.fixedDelay(2, Duration.ofSeconds(1))
                            .filter(throwable -> {
                                log.warn("Retrying backend API call after error: {}", throwable.getMessage());
                                return true;
                            }))
                    .doOnSuccess(response -> log.info("Backend tracked stock notifications triggered successfully"))
                    .doOnError(error -> log.error("Failed to trigger tracked stock notifications on backend: {}", error.getMessage(), error))
                    .block(Duration.ofSeconds(5));
                    
        } catch (Exception e) {
            log.error("Error calling backend API for tracked stock notifications: {}", e.getMessage(), e);
            // Don't throw - allow cron job to continue even if this fails
        }
    }

    /**
     * Trigger price alerts check on backend service
     * This will check all active price alerts and send notifications via backend's WebSocket
     */
    public void triggerPriceAlertsCheck() {
        try {
            WebClient webClient = webClientBuilder
                    .baseUrl(backendBaseUrl)
                    .build();

            log.info("Calling backend API to trigger price alerts check: {}/api/internal/price-alerts/check", backendBaseUrl);
            
            webClient.post()
                    .uri("/api/internal/price-alerts/check")
                    .retrieve()
                    .bodyToMono(String.class)
                    .retryWhen(Retry.fixedDelay(2, Duration.ofSeconds(1))
                            .filter(throwable -> {
                                log.warn("Retrying backend API call after error: {}", throwable.getMessage());
                                return true;
                            }))
                    .doOnSuccess(response -> log.info("Backend price alerts check triggered successfully"))
                    .doOnError(error -> log.error("Failed to trigger price alerts check on backend: {}", error.getMessage(), error))
                    .block(Duration.ofSeconds(5));
                    
        } catch (Exception e) {
            log.error("Error calling backend API for price alerts check: {}", e.getMessage(), e);
            // Don't throw - allow cron job to continue even if this fails
        }
    }
}


