package com.data.trade.dto.auth;

import com.data.trade.model.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private UserRole role;
    private Boolean enabled;
    private Boolean emailVerified;
    private OffsetDateTime createdAt;
    private OffsetDateTime lastLoginAt;
}

