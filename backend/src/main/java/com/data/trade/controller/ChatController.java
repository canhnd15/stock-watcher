package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.dto.ChatRequest;
import com.data.trade.dto.ChatResponse;
import com.data.trade.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiEndpoints.API_CHAT)
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('NORMAL', 'VIP', 'ADMIN')")
@Slf4j
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        try {
            String response = chatService.getChatResponse(
                request.getMessage(), 
                request.getConversationHistory()
            );
            return ResponseEntity.ok(new ChatResponse(response));
        } catch (Exception e) {
            log.error("Error processing chat request", e);
            return ResponseEntity.status(500)
                .body(new ChatResponse("Sorry, I encountered an error. Please try again."));
        }
    }
}

