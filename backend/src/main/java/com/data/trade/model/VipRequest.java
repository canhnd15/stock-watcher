package com.data.trade.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vip_requests", indexes = {
    @Index(name = "idx_vip_requests_user_id", columnList = "user_id"),
    @Index(name = "idx_vip_requests_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VipRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private VipRequestStatus status = VipRequestStatus.PENDING;

    @Column(length = 500)
    private String reason; // Optional reason for requesting VIP

    @Column
    private String adminNote; // Admin's note when approving/rejecting

    @Column(nullable = false)
    private OffsetDateTime requestedAt;

    @Column
    private OffsetDateTime processedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_id")
    private User processedBy; // Admin who processed the request

    @PrePersist
    protected void onCreate() {
        if (requestedAt == null) {
            requestedAt = OffsetDateTime.now();
        }
    }
}

