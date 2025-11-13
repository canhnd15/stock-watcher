package com.data.trade.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "short_term_tracked_stocks", 
    uniqueConstraints = @UniqueConstraint(name = "uk_user_code_short_term", columnNames = {"user_id", "code"}),
    indexes = {
        @Index(name = "idx_short_term_tracked_stocks_user", columnList = "user_id"),
        @Index(name = "idx_short_term_tracked_stocks_code", columnList = "code")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortTermTrackedStock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false, length = 16)
    private String code;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(nullable = true, precision = 19, scale = 2)
    private BigDecimal costBasis;

    @Column(nullable = true)
    private Long volume; // Volume for profit calculation

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}

