package com.data.trade.service;

import com.data.trade.config.AiChatConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {

    private final AiChatConfig aiChatConfig;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${rag.embedding.model:text-embedding-004}")
    private String embeddingModel;

    @Value("${rag.embedding.api-url:https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent}")
    private String embeddingApiUrl;

    private static final int MAX_RETRIES = 3;
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    /**
     * Generate embedding for the given text using Google Gemini embedding API
     * 
     * @param text The text to generate embedding for
     * @return float array representing the embedding vector (1536 dimensions)
     * @throws RuntimeException if embedding generation fails after retries
     */
    public float[] generateEmbedding(String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Text cannot be null or empty");
        }

        String apiKey = aiChatConfig.getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("AI API key not configured. Please set the AI_API_KEY environment variable.");
        }

        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(TIMEOUT)
                    .build();

                Map<String, Object> requestBody = Map.of(
                    "model", "models/" + embeddingModel,
                    "content", Map.of(
                        "parts", List.of(
                            Map.of("text", text)
                        )
                    )
                );

                String requestBodyJson = objectMapper.writeValueAsString(requestBody);
                String fullUrl = embeddingApiUrl + "?key=" + apiKey;

                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                    .timeout(TIMEOUT)
                    .build();

                HttpResponse<String> response = client.send(request, 
                    HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 200) {
                    Map<String, Object> responseMap = objectMapper.readValue(
                        response.body(), 
                        Map.class
                    );
                    
                    @SuppressWarnings("unchecked")
                    Map<String, Object> embeddingData = 
                        (Map<String, Object>) responseMap.get("embedding");
                    
                    if (embeddingData != null) {
                        @SuppressWarnings("unchecked")
                        List<Double> values = (List<Double>) embeddingData.get("values");
                        
                        if (values != null && !values.isEmpty()) {
                            float[] embedding = new float[values.size()];
                            for (int i = 0; i < values.size(); i++) {
                                embedding[i] = values.get(i).floatValue();
                            }
                            log.debug("Generated embedding of dimension {}", embedding.length);
                            return embedding;
                        }
                    }
                    
                    log.error("Embedding response missing values: {}", response.body());
                    throw new RuntimeException("Invalid embedding response format");
                } else {
                    log.warn("Embedding API returned status: {} - {}", response.statusCode(), response.body());
                    if (response.statusCode() >= 500 && attempt < MAX_RETRIES) {
                        // Retry on server errors
                        Thread.sleep(1000 * attempt); // Exponential backoff
                        continue;
                    }
                    throw new RuntimeException("Embedding API returned status: " + response.statusCode());
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Embedding generation interrupted", e);
            } catch (Exception e) {
                lastException = e;
                log.warn("Embedding generation attempt {} failed: {}", attempt, e.getMessage());
                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(1000 * attempt); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Embedding generation interrupted", ie);
                    }
                }
            }
        }

        log.error("Failed to generate embedding after {} attempts", MAX_RETRIES);
        throw new RuntimeException("Failed to generate embedding after " + MAX_RETRIES + " attempts", lastException);
    }
}

