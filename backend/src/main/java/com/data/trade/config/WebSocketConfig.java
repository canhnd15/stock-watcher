package com.data.trade.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple in-memory broker for sending messages to clients
        config.enableSimpleBroker("/topic");
        // Prefix for messages FROM clients to server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register STOMP endpoint
        // Allow all origins when using Nginx reverse proxy (Nginx handles security)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")  // Allow all origins (Nginx handles security)
                .withSockJS(); // Enable SockJS fallback for browsers without WebSocket support
    }
}

