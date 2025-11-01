package com.data.trade.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "trades", indexes = {
        @Index(name = "idx_trades_code_date_time", columnList = "code, tradeDate, tradeTime"),
        @Index(name = "idx_trades_volume", columnList = "volume"),
        @Index(name = "idx_trades_price", columnList = "price")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trade {
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
    private String side; // buy|sell|other

    @Column(nullable = false, length = 10)
    private String tradeDate; // Format: "DD/MM/YYYY" as received from API (e.g., "24/10/2025")

    @Column(nullable = false, length = 8)
    private String tradeTime; // Format: "HH:mm:ss" as received from API (e.g., "14:45:00")
}
