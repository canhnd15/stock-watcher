package com.data.trade.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VipRequestRequest {
    @Size(max = 500, message = "Reason must not exceed 500 characters")
    private String reason;
}

