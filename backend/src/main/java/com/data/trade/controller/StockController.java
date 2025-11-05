package com.data.trade.controller;

import com.data.trade.dto.RoombarResponse;
import com.data.trade.service.StockRoombarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:8089", "http://localhost:4200"})
public class StockController {
    
    private final StockRoombarService stockRoombarService;
    
    @GetMapping("/roombars/{code}")
    @PreAuthorize("hasAnyRole('NORMAL', 'VIP', 'ADMIN')")
    public ResponseEntity<RoombarResponse> getRoombars(
            @PathVariable String code,
            @RequestParam(defaultValue = "10day") String type) {
        RoombarResponse response = stockRoombarService.getRoombars(code.toUpperCase(), type);
        return ResponseEntity.ok(response);
    }
}

