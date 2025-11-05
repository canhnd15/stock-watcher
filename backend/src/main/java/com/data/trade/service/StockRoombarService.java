package com.data.trade.service;

import com.data.trade.dto.RoombarResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockRoombarService {
    
    private final FinpathClient finpathClient;
    
    public RoombarResponse getRoombars(String code, String type) {
        try {
            return finpathClient.fetchRoombars(code, type);
        } catch (Exception e) {
            log.error("Failed to fetch roombars for stock {}: {}", code, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch roombars data", e);
        }
    }
}

