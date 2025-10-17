package com.data.trade.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "trades", indexes = {
        @Index(name = "idx_trades_code_time", columnList = "code, tradeTime"),
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

    @Column(nullable = false)
    private OffsetDateTime tradeTime; // parsed from td+t in Asia/Ho_Chi_Minh
}
