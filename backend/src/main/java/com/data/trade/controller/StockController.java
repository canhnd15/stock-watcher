package com.data.trade.controller;

import com.data.trade.dto.IntradayPriceDTO;
import com.data.trade.dto.RoombarResponse;
import com.data.trade.service.StockRoombarService;
import com.data.trade.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8089", "http://localhost:4200"})
public class StockController {
    
    private final StockRoombarService stockRoombarService;
    private final TradeService tradeService;
    
    @GetMapping("/roombars/{code}")
    @PreAuthorize("hasAnyRole('NORMAL', 'VIP', 'ADMIN')")
    public ResponseEntity<RoombarResponse> getRoombars(
            @PathVariable String code,
            @RequestParam(defaultValue = "10day") String type) {
        RoombarResponse response = stockRoombarService.getRoombars(code.toUpperCase(), type);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/intraday-price/{code}")
    @PreAuthorize("hasAnyRole('NORMAL', 'VIP', 'ADMIN')")
    public ResponseEntity<List<IntradayPriceDTO>> getIntradayPrice(
            @PathVariable String code,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<IntradayPriceDTO> data = tradeService.getIntradayPriceData(code.toUpperCase(), date);
        return ResponseEntity.ok(data);
    }
}

