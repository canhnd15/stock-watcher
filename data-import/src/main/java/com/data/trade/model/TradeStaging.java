package com.data.trade.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "trades_staging", indexes = {
    @Index(name = "idx_trades_staging_code_date_time", columnList = "code, tradeDate, tradeTime"),
    @Index(name = "idx_trades_staging_volume", columnList = "volume"),
    @Index(name = "idx_trades_staging_price", columnList = "price")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TradeStaging {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 16)
    private String code;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private Long volume;

    @Column(nullable = false, length = 8)
    private String side;

    @Column(nullable = false, length = 10, name = "trade_date")
    private String tradeDate;

    @Column(nullable = false, length = 8, name = "trade_time")
    private String tradeTime;
}

