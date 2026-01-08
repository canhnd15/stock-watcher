package com.data.trade.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class ChatRequest {
    @NotBlank(message = "Message cannot be blank")
    private String message;
    
    // Optional conversation history for context
    private List<ChatMessage> conversationHistory;
    
    @Data
    public static class ChatMessage {
        private String role; // "user" or "assistant"
        private String content;
    }
}

