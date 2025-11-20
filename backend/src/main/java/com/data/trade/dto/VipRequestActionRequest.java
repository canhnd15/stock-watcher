package com.data.trade.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class VipRequestActionRequest {
    @Size(max = 500, message = "Admin note must not exceed 500 characters")
    private String adminNote;
}

