package com.data.trade.service;

import com.data.trade.repository.DocumentChunkRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagService {

    private final EmbeddingService embeddingService;
    private final DocumentChunkRepository documentChunkRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${rag.enabled:true}")
    private boolean ragEnabled;

    @Value("${rag.top-k-results:5}")
    private int topKResults;

    @Value("${rag.similarity-threshold:0.7}")
    private double similarityThreshold;

    // Keywords that indicate the question needs data
    private static final Pattern DATA_KEYWORDS = Pattern.compile(
        "\\b(stock|stocks|code|price|volume|trade|trades|signal|signals|tracked|my stocks|portfolio|ohlc|open|high|low|close|buy|sell|block|blocks)\\b",
        Pattern.CASE_INSENSITIVE
    );

    // Pattern to match stock codes (3-4 uppercase letters)
    private static final Pattern STOCK_CODE_PATTERN = Pattern.compile("\\b[A-Z]{3,4}\\b");

    // Pattern to match dates
    private static final Pattern DATE_PATTERN = Pattern.compile("\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\b");

    /**
     * Detect if the user's question needs data from the database
     * Uses keyword matching for fast detection
     * 
     * @param userMessage User's question
     * @return true if question likely needs data, false otherwise
     */
    public boolean detectIntent(String userMessage) {
        if (!ragEnabled) {
            return false;
        }

        if (userMessage == null || userMessage.trim().isEmpty()) {
            return false;
        }

        String message = userMessage.trim();

        // Check for stock codes
        if (STOCK_CODE_PATTERN.matcher(message).find()) {
            return true;
        }

        // Check for dates
        if (DATE_PATTERN.matcher(message).find()) {
            return true;
        }

        // Check for data-related keywords
        if (DATA_KEYWORDS.matcher(message).find()) {
            return true;
        }

        // Check for specific phrases
        String lowerMessage = message.toLowerCase();
        if (lowerMessage.contains("what is") || 
            lowerMessage.contains("show me") || 
            lowerMessage.contains("tell me about") ||
            lowerMessage.contains("how much") ||
            lowerMessage.contains("how many") ||
            lowerMessage.contains("when did") ||
            lowerMessage.contains("what happened")) {
            return true;
        }

        return false;
    }

    /**
     * Retrieve relevant context chunks for the user's question
     * 
     * @param userMessage User's question
     * @param topK Number of top results to return
     * @return List of relevant chunk contents
     */
    public List<String> retrieveContext(String userMessage, int topK) {
        if (!ragEnabled) {
            return Collections.emptyList();
        }

        try {
            // Generate embedding for user question
            float[] queryEmbedding = embeddingService.generateEmbedding(userMessage);
            
            // Convert embedding array to PostgreSQL vector format string
            String embeddingVector = convertEmbeddingToVectorString(queryEmbedding);
            
            // Search for similar chunks
            List<Object[]> results = documentChunkRepository.findSimilarChunksNative(
                embeddingVector,
                topK,
                similarityThreshold
            );
            
            // Extract content from results
            // Result format: [id, content, metadata, embedding, created_at]
            List<String> chunks = new ArrayList<>();
            for (Object[] result : results) {
                if (result.length > 1 && result[1] != null) {
                    String content = result[1].toString();
                    // Also include metadata for context if available
                    if (result.length > 2 && result[2] != null) {
                        chunks.add(content); // Just content for now, metadata can be added later if needed
                    } else {
                        chunks.add(content);
                    }
                }
            }
            
            log.debug("Retrieved {} relevant chunks for query", chunks.size());
            return chunks;
            
        } catch (Exception e) {
            log.error("Error retrieving context for RAG", e);
            return Collections.emptyList();
        }
    }

    /**
     * Format retrieved chunks into readable context for the LLM
     * 
     * @param chunks List of chunk contents
     * @return Formatted context string
     */
    public String formatContext(List<String> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return "";
        }

        StringBuilder context = new StringBuilder();
        context.append("Relevant data from the database:\n\n");
        
        for (int i = 0; i < chunks.size(); i++) {
            context.append(i + 1).append(". ").append(chunks.get(i)).append("\n");
        }
        
        context.append("\nUse the above data to answer the user's question accurately. ");
        context.append("If the data doesn't contain relevant information, say so and provide general guidance.");
        
        return context.toString();
    }

    /**
     * Convert float array embedding to PostgreSQL vector format string
     * Format: "[0.1,0.2,0.3,...]"
     */
    private String convertEmbeddingToVectorString(float[] embedding) {
        if (embedding == null || embedding.length == 0) {
            throw new IllegalArgumentException("Embedding cannot be null or empty");
        }
        
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) {
                sb.append(",");
            }
            sb.append(embedding[i]);
        }
        sb.append("]");
        return sb.toString();
    }
}

