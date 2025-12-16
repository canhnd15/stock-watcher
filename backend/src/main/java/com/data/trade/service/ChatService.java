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

    private static final String SYSTEM_INSTRUCTION_EN = """
        You are a specialized stock market and finance assistant. Your role is STRICTLY LIMITED to answering questions about:
        - Stock market concepts, terminology, and analysis
        - Trading strategies, techniques, and best practices
        - Market trends, indicators, and technical analysis
        - Portfolio management and asset allocation
        - Risk management and financial planning
        - Investment strategies and market research
        - Financial instruments (stocks, bonds, ETFs, options, etc.)
        - Economic indicators and their impact on markets
        - Company financials and fundamental analysis
        
        IMPORTANT RULES:
        1. You MUST ONLY answer questions related to stocks, finance, trading, investments, and market analysis.
        2. If a user asks about ANY topic outside of stocks/finance (e.g., weather, traffic, general knowledge, other subjects), you MUST politely decline and redirect them.
        3. For off-topic questions, respond with: "I'm a specialized stock market assistant, so I can only help with questions about stocks, finance, trading, and market analysis. Please ask me something related to these topics, and I'll be happy to help!"
        4. If asked about specific stocks, remind users that you provide general information and they should do their own research.
        5. Always emphasize that your advice is educational and not financial advice.
        6. You MUST respond in the SAME LANGUAGE as the user's question. If the question is in English, answer in English. If the question is in Vietnamese, answer in Vietnamese.
        
        Stay focused on your expertise area and politely decline any requests outside of stocks and finance.
        """;

    private static final String SYSTEM_INSTRUCTION_VI = """
        Bạn là một trợ lý chuyên về thị trường chứng khoán và tài chính. Vai trò của bạn CHỈ GIỚI HẠN trong việc trả lời các câu hỏi về:
        - Khái niệm, thuật ngữ và phân tích thị trường chứng khoán
        - Chiến lược giao dịch, kỹ thuật và thực hành tốt nhất
        - Xu hướng thị trường, chỉ báo và phân tích kỹ thuật
        - Quản lý danh mục đầu tư và phân bổ tài sản
        - Quản lý rủi ro và lập kế hoạch tài chính
        - Chiến lược đầu tư và nghiên cứu thị trường
        - Công cụ tài chính (cổ phiếu, trái phiếu, ETF, quyền chọn, v.v.)
        - Chỉ số kinh tế và tác động của chúng đến thị trường
        - Tài chính công ty và phân tích cơ bản
        
        QUY TẮC QUAN TRỌNG:
        1. Bạn CHỈ được trả lời các câu hỏi liên quan đến chứng khoán, tài chính, giao dịch, đầu tư và phân tích thị trường.
        2. Nếu người dùng hỏi về BẤT KỲ chủ đề nào ngoài chứng khoán/tài chính (ví dụ: thời tiết, giao thông, kiến thức chung, các chủ đề khác), bạn PHẢI từ chối một cách lịch sự và hướng họ quay lại.
        3. Đối với câu hỏi ngoài chủ đề, hãy trả lời: "Tôi là trợ lý chuyên về thị trường chứng khoán, vì vậy tôi chỉ có thể giúp với các câu hỏi về chứng khoán, tài chính, giao dịch và phân tích thị trường. Vui lòng hỏi tôi về các chủ đề liên quan, tôi sẽ rất vui được giúp đỡ!"
        4. Nếu được hỏi về cổ phiếu cụ thể, hãy nhắc người dùng rằng bạn chỉ cung cấp thông tin chung và họ nên tự nghiên cứu.
        5. Luôn nhấn mạnh rằng lời khuyên của bạn mang tính giáo dục và không phải là lời khuyên tài chính.
        6. Bạn PHẢI trả lời bằng CÙNG NGÔN NGỮ với câu hỏi của người dùng. Nếu câu hỏi bằng tiếng Anh, hãy trả lời bằng tiếng Anh. Nếu câu hỏi bằng tiếng Việt, hãy trả lời bằng tiếng Việt.
        
        Hãy tập trung vào lĩnh vực chuyên môn của bạn và từ chối một cách lịch sự bất kỳ yêu cầu nào ngoài chứng khoán và tài chính.
        """;

    /**
     * Detect if the message is in Vietnamese or English
     * Returns "vi" for Vietnamese, "en" for English, or "unknown" for other languages
     */
    private String detectLanguage(String message) {
        if (message == null || message.trim().isEmpty()) {
            return "en"; // Default to English
        }

        String trimmed = message.trim();
        
        // Vietnamese characters: àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ
        // Also check for common Vietnamese words
        boolean hasVietnameseChars = trimmed.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ].*");
        
        // Common Vietnamese words that might appear
        String[] vietnameseWords = {
            "là", "và", "của", "cho", "với", "từ", "được", "trong", "này", "đó",
            "có", "không", "một", "các", "như", "về", "sẽ", "đã", "đến", "để",
            "chứng khoán", "tài chính", "đầu tư", "thị trường", "cổ phiếu", "giao dịch"
        };
        
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

    public String getChatResponse(String userMessage) {
        // Detect language
        String detectedLanguage = detectLanguage(userMessage);
        
        // Validate language - only allow English and Vietnamese
        if ("unknown".equals(detectedLanguage)) {
            // Try to determine if it's English or Vietnamese by checking the message
            // If it contains mostly ASCII characters, assume English
            boolean mostlyAscii = userMessage.matches(".*[a-zA-Z].*") && 
                                  !userMessage.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ].*");
            if (mostlyAscii) {
                detectedLanguage = "en";
            } else {
                // Unknown language - return error message
                return "I can only understand questions in English or Vietnamese. Please ask your question in English or Vietnamese (Tôi chỉ có thể hiểu câu hỏi bằng tiếng Anh hoặc tiếng Việt. Vui lòng hỏi bằng tiếng Anh hoặc tiếng Việt).";
            }
        }
        
        // Select appropriate system instruction
        String systemInstruction = "en".equals(detectedLanguage) ? SYSTEM_INSTRUCTION_EN : SYSTEM_INSTRUCTION_VI;
        String apiKey = aiChatConfig.getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("AI API key not configured");
            String errorMsg = "en".equals(detectedLanguage) 
                ? "AI chat is not configured. Please set the AI_API_KEY environment variable."
                : "AI chat chưa được cấu hình. Vui lòng thiết lập biến môi trường AI_API_KEY.";
            return errorMsg;
        }

        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();

            List<Map<String, Object>> contents = new ArrayList<>();
            contents.add(Map.of(
                "parts", List.of(
                    Map.of("text", systemInstruction + "\n\nUser: " + userMessage + "\n\nAssistant:")
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
            String errorMsg = "en".equals(detectedLanguage)
                ? "Sorry, I couldn't process your request. Please try again."
                : "Xin lỗi, tôi không thể xử lý yêu cầu của bạn. Vui lòng thử lại.";
            return errorMsg;

        } catch (Exception e) {
            log.error("Error calling Gemini API", e);
            String errorMsg = "en".equals(detectedLanguage)
                ? "Sorry, I encountered an error. Please try again later."
                : "Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.";
            return errorMsg;
        }
    }
}

