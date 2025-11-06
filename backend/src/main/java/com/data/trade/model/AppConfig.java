package com.data.trade.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_config")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String configKey;

    @Column(nullable = false, length = 500)
    private String configValue;

    @Column(length = 255)
    private String description;
}

