package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.IntradayPriceBatchRequest;
import com.data.trade.dto.IntradayPriceBatchResponse;
import com.data.trade.dto.IntradayPriceDTO;
import com.data.trade.dto.RoombarResponse;
import com.data.trade.service.FinpathClient;
import com.data.trade.service.StockRoombarService;
import com.data.trade.service.TradeService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.API_STOCKS)
@RequiredArgsConstructor
@Slf4j
public class StockController {
    
    private final StockRoombarService stockRoombarService;
    private final TradeService tradeService;
    private final FinpathClient finpathClient;
    
    @GetMapping(ApiEndpoints.STOCKS_ROOMBARS_CODE_PATH)
    @PreAuthorize(RoleConstants.HAS_ANY_ROLE_ALL)
    public ResponseEntity<RoombarResponse> getRoombars(
            @PathVariable String code,
            @RequestParam(defaultValue = "10day") String type) {
        RoombarResponse response = stockRoombarService.getRoombars(code.toUpperCase(), type);
        return ResponseEntity.ok(response);
    }

    @GetMapping(ApiEndpoints.STOCKS_INTRADAY_PRICE_CODE_PATH)
    @PreAuthorize(RoleConstants.HAS_ANY_ROLE_ALL)
    public ResponseEntity<List<IntradayPriceDTO>> getIntradayPrice(
            @PathVariable String code,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<IntradayPriceDTO> data = tradeService.getIntradayPriceData(code.toUpperCase(), date);
        return ResponseEntity.ok(data);
    }

    @PostMapping(ApiEndpoints.STOCKS_INTRADAY_PRICE_BATCH_PATH)
    @PreAuthorize(RoleConstants.HAS_ANY_ROLE_ALL)
    public ResponseEntity<IntradayPriceBatchResponse> getIntradayPriceBatch(
            @Valid @RequestBody IntradayPriceBatchRequest request) {
        Map<String, List<IntradayPriceDTO>> data = tradeService.getIntradayPriceDataBatch(
                request.getCodes(), 
                request.getDate()
        );
        
        IntradayPriceBatchResponse response = IntradayPriceBatchResponse.builder()
                .data(data)
                .build();
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get current market price for a stock code
     */
    @GetMapping("/market-price/{code:.+}")
    @PreAuthorize(RoleConstants.HAS_ANY_ROLE_ALL)
    public ResponseEntity<MarketPriceResponse> getMarketPrice(@PathVariable String code) {
        try {
            // Decode URL-encoded code (handles dots and special characters)
            String decodedCode = java.net.URLDecoder.decode(code, java.nio.charset.StandardCharsets.UTF_8);
            String normalizedCode = decodedCode.toUpperCase();
            
            var response = finpathClient.fetchTradingViewBars(normalizedCode);
            if (response != null) {
                Double price = response.getMarketPrice();
                if (price != null) {
                    return ResponseEntity.ok(new MarketPriceResponse(normalizedCode, price));
                }
            }
            return ResponseEntity.ok(new MarketPriceResponse(normalizedCode, null));
        } catch (Exception e) {
            log.debug("Failed to fetch market price for {}: {}", code, e.getMessage());
            // Try to decode and normalize even on error
            try {
                String decodedCode = java.net.URLDecoder.decode(code, java.nio.charset.StandardCharsets.UTF_8);
                return ResponseEntity.ok(new MarketPriceResponse(decodedCode.toUpperCase(), null));
            } catch (Exception decodeError) {
                return ResponseEntity.ok(new MarketPriceResponse(code.toUpperCase(), null));
            }
        }
    }

    @Data
    static class MarketPriceResponse {
        private String code;
        private Double marketPrice;

        public MarketPriceResponse(String code, Double marketPrice) {
            this.code = code;
            this.marketPrice = marketPrice;
        }
    }
}

