package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.dto.auth.LoginRequest;
import com.data.trade.dto.auth.LoginResponse;
import com.data.trade.dto.auth.RegisterRequest;
import com.data.trade.dto.auth.ResendVerificationRequest;
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

    @PostMapping(ApiEndpoints.AUTH_LOGIN_PATH)
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid username or password");
        }
    }

    @GetMapping(ApiEndpoints.AUTH_ME_PATH)
    public ResponseEntity<?> getCurrentUser() {
        try {
            UserResponse response = authService.getCurrentUser();
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    @GetMapping(ApiEndpoints.AUTH_VERIFY_EMAIL_PATH)
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        try {
            authService.verifyEmail(token);
            return ResponseEntity.ok("Email verified successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping(ApiEndpoints.AUTH_RESEND_VERIFICATION_PATH)
    public ResponseEntity<?> resendVerificationEmail(@Valid @RequestBody ResendVerificationRequest request) {
        try {
            authService.resendVerificationEmail(request.getEmail());
            return ResponseEntity.ok("Verification email sent successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

