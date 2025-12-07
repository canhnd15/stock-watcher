package com.data.trade.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "price_alerts", 
    indexes = {
        @Index(name = "idx_price_alerts_user", columnList = "user_id"),
        @Index(name = "idx_price_alerts_code", columnList = "code"),
        @Index(name = "idx_price_alerts_active", columnList = "active")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false, length = 16)
    private String code;

    @Column(nullable = true, precision = 19, scale = 2)
    private BigDecimal reachPrice; // Alert when price reaches or exceeds this value

    @Column(nullable = true, precision = 19, scale = 2)
    private BigDecimal dropPrice; // Alert when price drops to or below this value

    @Column(nullable = true, precision = 19, scale = 0)
    private Long reachVolume; // Alert when volume reaches or exceeds this value

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}

