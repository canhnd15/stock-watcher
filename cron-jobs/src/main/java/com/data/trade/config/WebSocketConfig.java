package com.data.trade.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for cron-jobs service.
 * This service needs a message broker to send signals via SimpMessagingTemplate.
 * However, messages sent here won't reach backend clients (separate brokers).
 * 
 * Note: For production, use external message broker (Redis/RabbitMQ) or
 *       send signals via REST API to backend which then broadcasts via WebSocket.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple in-memory broker for SimpMessagingTemplate to work
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register a dummy endpoint (required by @EnableWebSocketMessageBroker)
        // Clients should connect to backend WebSocket, not this one
        registry.addEndpoint("/ws-internal")
                .setAllowedOrigins("*")
                .withSockJS();
    }
}

