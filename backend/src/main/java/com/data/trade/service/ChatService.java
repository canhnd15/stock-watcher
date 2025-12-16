package com.data.trade.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.data.trade.config.AiChatConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final AiChatConfig aiChatConfig;
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String SYSTEM_INSTRUCTION = """
        You are a helpful stock market assistant. You help users understand:
        - Stock market concepts and terminology
        - Trading strategies and analysis
        - Market trends and indicators
        - Portfolio management
        - Risk management
        
        Provide clear, accurate, and helpful responses. If asked about specific stocks,
        remind users that you provide general information and they should do their own research.
        Always emphasize that your advice is educational and not financial advice.
        """;

    public String getChatResponse(String userMessage) {
        String apiKey = aiChatConfig.getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("AI API key not configured");
            return "AI chat is not configured. Please set the AI_API_KEY environment variable.";
        }

        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();

            List<Map<String, Object>> contents = new ArrayList<>();
            contents.add(Map.of(
                "parts", List.of(
                    Map.of("text", SYSTEM_INSTRUCTION + "\n\nUser: " + userMessage + "\n\nAssistant:")
                )
            ));

            Map<String, Object> requestBody = Map.of(
                "contents", contents,
                "generationConfig", Map.of(
                    "temperature", 0.7,
                    "maxOutputTokens", 1000
                )
            );

            String requestBodyJson = objectMapper.writeValueAsString(requestBody);

            String apiUrl = aiChatConfig.getApiUrl();
            String fullUrl = apiUrl + "?key=" + apiKey;

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(fullUrl))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                .timeout(Duration.ofSeconds(60))
                .build();

            HttpResponse<String> response = client.send(request, 
                HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<String, Object> responseMap = objectMapper.readValue(
                    response.body(), 
                    Map.class
                );
                
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> candidates = 
                    (List<Map<String, Object>>) responseMap.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> candidate = candidates.get(0);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> content = 
                        (Map<String, Object>) candidate.get("content");
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> parts = 
                        (List<Map<String, Object>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }

            log.error("Gemini API returned status: {} - {}", response.statusCode(), response.body());
            return "Sorry, I couldn't process your request. Please try again.";

        } catch (Exception e) {
            log.error("Error calling Gemini API", e);
            return "Sorry, I encountered an error. Please try again later.";
        }
    }
}

