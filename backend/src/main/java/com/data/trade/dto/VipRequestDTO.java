package com.data.trade.dto;

import com.data.trade.model.VipRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VipRequestDTO {
    private Long id;
    private Long userId;
    private String username;
    private String email;
    private VipRequestStatus status;
    private String reason;
    private String adminNote;
    private OffsetDateTime requestedAt;
    private OffsetDateTime processedAt;
    private Long processedById;
    private String processedByUsername;
}

