package com.data.trade.service;

import com.data.trade.dto.FinpathResponse;
import com.data.trade.model.Trade;
import com.data.trade.model.TrackedStock;
import com.data.trade.repository.TradeRepository;
import com.data.trade.repository.TrackedStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TradeIngestionService {

    private final TrackedStockRepository trackedStockRepository;
    private final TradeRepository tradeRepository;
    private final FinpathClient finpathClient;

    @Value("${app.timezone:Asia/Ho_Chi_Minh}")
    private String appTz;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm:ss");

    private final List<String> vn30 = List.of(
            "ACB", "BCM", "BID", "BVH", "CTG", "DGC", "FPT", "GAS",
            "HDB", "HDG", "HPG", "KDH", "MBB", "MSN", "MWG", "NVL",
            "PDR", "PGD", "PLX", "PNJ", "REE", "SBT", "SSI", "STB",
            "TCB", "TPB", "VCB", "VJC", "VIC", "VHM", "VNM", "VPB", "VRE"
    );

    @Transactional
    public void ingestForCode(String code) {
        FinpathResponse response = finpathClient.fetchTrades(code, 1, 10000);
        if (response == null || response.getData() == null || response.getData().getTrades() == null) {
            log.error("error");
            return;
        }

        ZoneId zone = ZoneId.of(appTz);

        List<Trade> trades = response.getData().getTrades().stream()
                .map(t -> {
                    LocalDate date = LocalDate.parse(t.getDate(), DATE_FMT);
                    LocalTime time = LocalTime.parse(t.getTime(), TIME_FMT);
                    // Combine date and time, then apply the timezone for the actual trade date/time
                    LocalDateTime localDateTime = LocalDateTime.of(date, time);
                    OffsetDateTime tradeTime = localDateTime.atZone(zone).toOffsetDateTime();

                    return Trade.builder()
                            .code(t.getCode())
                            .price(t.getPrice())
                            .volume(t.getVolume())
                            .side(t.getSide())
                            .tradeTime(tradeTime)
                            .build();
                })
                .collect(Collectors.toList());

        try {
            tradeRepository.saveAll(trades);
        } catch (Exception ex) {
            log.error("Failed to save trades: {}", ex.getMessage(), ex);
        }
    }
}
