package com.data.trade.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tracked_stocks", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tracked_code", columnNames = {"code"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackedStock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 16)
    private String code;

    @Column(nullable = false)
    private boolean active;
}
