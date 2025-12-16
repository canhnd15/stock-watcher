package com.data.trade.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
@Slf4j
public class AiChatConfig {

    @Value("${ai.api.key:}")
    private String apiKeyFromProperty;

    @Value("${ai.api.url:https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent}")
    private String apiUrl;

    @Value("${ai.model:gemini-2.5-flash}")
    private String model;

    private String apiKey;

    @PostConstruct
    public void init() {
        // Try property first, then environment variable, then empty string
        if (apiKeyFromProperty != null && !apiKeyFromProperty.isEmpty()) {
            apiKey = apiKeyFromProperty;
        } else {
            apiKey = System.getenv("AI_API_KEY");
            if (apiKey == null) {
                apiKey = "";
            }
        }
        log.info("AI Chat Config initialized. API Key configured: {}", apiKey != null && !apiKey.isEmpty());
    }
}

