package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.dto.auth.RegisterRequest;
import com.data.trade.dto.auth.UserResponse;
import com.data.trade.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiEndpoints.API_AUTH)
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping(ApiEndpoints.AUTH_REGISTER_PATH)
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            UserResponse response = authService.register(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Login endpoint removed - authentication is now handled by Keycloak
    // Users should login via Keycloak's login page

    @GetMapping(ApiEndpoints.AUTH_ME_PATH)
    public ResponseEntity<?> getCurrentUser() {
        try {
            UserResponse response = authService.getCurrentUser();
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    // Email verification endpoint removed - handled by Keycloak
    // @GetMapping(ApiEndpoints.AUTH_VERIFY_EMAIL_PATH)
}

