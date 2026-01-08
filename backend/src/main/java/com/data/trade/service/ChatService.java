package com.data.trade.service;

import com.data.trade.dto.ChatRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.data.trade.config.AiChatConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
    private final RagService ragService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Value("${ai.language.detection.vietnamese-words:}")
    private String vietnameseWordsConfig;
    
    @Value("${ai.language.detection.vietnamese-regex:.*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ].*}")
    private String vietnameseRegexPattern;
    
    private String systemInstructionEn;
    private String systemInstructionVi;
    private String[] vietnameseWords;

    /**
     * Load system instructions from template files and initialize Vietnamese words
     */
    @jakarta.annotation.PostConstruct
    public void init() {
        try {
            // Load English system instruction
            ClassPathResource enResource = new ClassPathResource("templates/system-instruction-en.txt");
            try (InputStream inputStream = enResource.getInputStream()) {
                systemInstructionEn = StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
            }
            
            // Load Vietnamese system instruction
            ClassPathResource viResource = new ClassPathResource("templates/system-instruction-vi.txt");
            try (InputStream inputStream = viResource.getInputStream()) {
                systemInstructionVi = StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
            }
            
            // Load Vietnamese words from configuration
            if (vietnameseWordsConfig != null && !vietnameseWordsConfig.trim().isEmpty()) {
                vietnameseWords = vietnameseWordsConfig.split(",");
                // Trim whitespace from each word
                for (int i = 0; i < vietnameseWords.length; i++) {
                    vietnameseWords[i] = vietnameseWords[i].trim();
                }
            } else {
                // Fallback to default words if not configured
                vietnameseWords = new String[]{
                    "là", "và", "của", "cho", "với", "từ", "được", "trong", "này", "đó",
                    "có", "không", "một", "các", "như", "về", "sẽ", "đã", "đến", "để",
                    "chứng khoán", "tài chính", "đầu tư", "thị trường", "cổ phiếu", "giao dịch"
                };
            }
            
            log.info("ChatService initialized successfully. System instructions loaded from templates.");
        } catch (IOException e) {
            log.error("Failed to load system instruction templates", e);
            // Fallback to empty strings if templates can't be loaded
            systemInstructionEn = "";
            systemInstructionVi = "";
            vietnameseWords = new String[0];
        }
    }

    /**
     * Detect if the message is in Vietnamese or English
     * Returns "vi" for Vietnamese, "en" for English, or "unknown" for other languages
     */
    private String detectLanguage(String message) {
        if (message == null || message.trim().isEmpty()) {
            return "en"; // Default to English
        }

        String trimmed = message.trim();
        
        // Check for Vietnamese characters using regex from configuration
        boolean hasVietnameseChars = trimmed.matches(vietnameseRegexPattern);
        
        // Check for common Vietnamese words from configuration
        boolean hasVietnameseWords = false;
        String lowerMessage = trimmed.toLowerCase();
        for (String word : vietnameseWords) {
            if (lowerMessage.contains(word)) {
                hasVietnameseWords = true;
                break;
            }
        }
        
        // If message has Vietnamese characters or Vietnamese words, it's Vietnamese
        if (hasVietnameseChars || hasVietnameseWords) {
            return "vi";
        }
        
        // Check for common non-English characters (Chinese, Japanese, Korean, Arabic, etc.)
        boolean hasNonLatinChars = trimmed.matches(".*[\\u4e00-\\u9fff\\u3040-\\u309f\\u30a0-\\u30ff\\uac00-\\ud7af\\u0600-\\u06ff].*");
        
        if (hasNonLatinChars) {
            return "unknown";
        }
        
        // Default to English if it looks like English (Latin characters, common English words)
        return "en";
    }

    public String getChatResponse(String userMessage, List<com.data.trade.dto.ChatRequest.ChatMessage> conversationHistory) {
        String detectedLanguage = detectLanguage(userMessage);
        
        // Validate language - only allow English and Vietnamese
        if ("unknown".equals(detectedLanguage)) {
            // Try to determine if it's English or Vietnamese by checking the message
            // If it contains mostly ASCII characters, assume English
            boolean mostlyAscii = userMessage.matches(".*[a-zA-Z].*") &&
                                  !userMessage.matches(vietnameseRegexPattern);
            if (mostlyAscii) {
                detectedLanguage = "en";
            } else {
                // Unknown language - return error message
                return "I can only understand questions in English or Vietnamese. Please ask your question in English or Vietnamese (Tôi chỉ có thể hiểu câu hỏi bằng tiếng Anh hoặc tiếng Việt. Vui lòng hỏi bằng tiếng Anh hoặc tiếng Việt).";
            }
        }
        
        // Select appropriate system instruction
        String systemInstruction = "en".equals(detectedLanguage) ? systemInstructionEn : systemInstructionVi;
        String apiKey = aiChatConfig.getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("AI API key not configured");
            String errorMsg = "en".equals(detectedLanguage) 
                ? "AI chat is not configured. Please set the AI_API_KEY environment variable."
                : "AI chat chưa được cấu hình. Vui lòng thiết lập biến môi trường AI_API_KEY.";
            return errorMsg;
        }

        // Build conversation context for RAG if history exists
        String conversationContext = "";
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            StringBuilder contextBuilder = new StringBuilder();
            contextBuilder.append("Previous conversation:\n");
            for (ChatRequest.ChatMessage msg : conversationHistory) {
                contextBuilder.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
            }
            conversationContext = contextBuilder.toString();
            log.debug("Including {} messages from conversation history", conversationHistory.size());
        }

        // RAG: Intent detection and context retrieval
        String context = "";
        try {
            boolean needsData = ragService.detectIntent(userMessage);
            if (needsData) {
                log.debug("Question detected as needing data, retrieving context via RAG");
                // Enhance RAG query with conversation context if available
                String enhancedQuery = conversationContext.isEmpty() 
                    ? userMessage 
                    : conversationContext + "\n\nCurrent question: " + userMessage;
                List<String> chunks = ragService.retrieveContext(enhancedQuery, 5);
                context = ragService.formatContext(chunks);
            }
        } catch (Exception e) {
            log.warn("Error during RAG context retrieval, continuing without context: {}", e.getMessage());
            // Continue without context if RAG fails
        }

        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();

            // Build conversation for LLM with history
            List<Map<String, Object>> contents = new ArrayList<>();
            
            // Build conversation history string for context
            StringBuilder conversationBuilder = new StringBuilder();
            if (conversationHistory != null && !conversationHistory.isEmpty()) {
                conversationBuilder.append("Previous conversation:\n");
                for (ChatRequest.ChatMessage msg : conversationHistory) {
                    conversationBuilder.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
                }
                conversationBuilder.append("\n");
            }
            
            // Build the current message with RAG context if available
            String enhancedMessage = context.isEmpty() 
                ? userMessage 
                : context + "\n\nUser question: " + userMessage;
            
            // Combine system instruction, conversation history, and current message
            // This maintains compatibility with the original single-message format
            String fullMessage = systemInstruction + "\n\n";
            if (conversationBuilder.length() > 0) {
                fullMessage += conversationBuilder.toString();
            }
            fullMessage += "User: " + enhancedMessage + "\n\nAssistant:";
            
            // Add as single user message (maintains backward compatibility)
            contents.add(Map.of(
                "parts", List.of(Map.of("text", fullMessage))
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

            // Handle error responses - extract actual error message from API
            log.error("Gemini API returned status: {} - {}", response.statusCode(), response.body());
            String errorMsg = extractErrorMessage(response.body(), detectedLanguage);
            return errorMsg;

        } catch (Exception e) {
            log.error("Error calling Gemini API", e);
            String errorMsg = "en".equals(detectedLanguage)
                ? "Sorry, I encountered an error. Please try again later."
                : "Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.";
            return errorMsg;
        }
    }

    /**
     * Extract error message from Gemini API error response
     * Tries to parse the JSON error response and extract the actual error message
     * 
     * @param responseBody The error response body from API
     * @param detectedLanguage The detected language of the user
     * @return The extracted error message or a fallback message
     */
    private String extractErrorMessage(String responseBody, String detectedLanguage) {
        if (responseBody == null || responseBody.trim().isEmpty()) {
            return "en".equals(detectedLanguage)
                ? "Sorry, I couldn't process your request. Please try again."
                : "Xin lỗi, tôi không thể xử lý yêu cầu của bạn. Vui lòng thử lại.";
        }

        try {
            // Try to parse the error response JSON
            Map<String, Object> errorResponse = objectMapper.readValue(responseBody, Map.class);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> error = (Map<String, Object>) errorResponse.get("error");
            
            if (error != null) {
                String message = (String) error.get("message");
                if (message != null && !message.trim().isEmpty()) {
                    // Return the exact error message from API
                    log.debug("Extracted error message from API: {}", message);
                    return message;
                }
                
                // Try alternative error message fields
                String status = (String) error.get("status");
                if (status != null && !status.trim().isEmpty()) {
                    return status;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to parse error response JSON: {}", e.getMessage());
            // Fall through to default error message
        }

        // Fallback to default error message if parsing fails
        return "en".equals(detectedLanguage)
            ? "Sorry, I couldn't process your request. Please try again."
            : "Xin lỗi, tôi không thể xử lý yêu cầu của bạn. Vui lòng thử lại.";
    }
}

