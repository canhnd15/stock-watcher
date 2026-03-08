package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.model.MarketCode;
import com.data.trade.service.MarketCodeService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiEndpoints.API_MARKET_CODES)
@RequiredArgsConstructor
public class MarketCodeController {

    private final MarketCodeService marketCodeService;

    @GetMapping
    public ResponseEntity<List<MarketCode>> getAllCodes() {
        return ResponseEntity.ok(marketCodeService.getAllCodes());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MarketCode> addCode(@RequestBody AddCodeRequest request) {
        MarketCode saved = marketCodeService.addCode(request.getCode());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{code}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCode(@PathVariable String code) {
        marketCodeService.deleteCode(code);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class AddCodeRequest {
        private String code;
    }
}
