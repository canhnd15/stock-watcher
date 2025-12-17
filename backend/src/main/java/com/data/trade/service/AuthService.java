package com.data.trade.service;

import com.data.trade.dto.auth.RegisterRequest;
import com.data.trade.dto.auth.UserResponse;
import com.data.trade.model.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final KeycloakAdminService keycloakAdminService;

    public UserResponse register(RegisterRequest request) {
        // Check if user already exists in Keycloak
        if (keycloakAdminService.findUserByUsername(request.getUsername()) != null) {
            throw new RuntimeException("Username already exists");
        }

        // Create user in Keycloak
        String userId = keycloakAdminService.createUser(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                false // emailVerified - false by default
        );

        // Assign default NORMAL role
        keycloakAdminService.assignRole(userId, "NORMAL");

        log.info("User {} registered successfully in Keycloak with ID: {}", request.getUsername(), userId);

        // Return user response (user will need to login via Keycloak to get token)
        return UserResponse.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .role(UserRole.NORMAL)
                .enabled(true)
                .emailVerified(false)
                .createdAt(OffsetDateTime.now())
                .build();
    }

    public UserResponse getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() 
            || !(authentication instanceof JwtAuthenticationToken)) {
            throw new RuntimeException("User not authenticated");
        }

        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        Jwt jwt = jwtAuth.getToken();

        // Extract user information from JWT claims
        String username = jwt.getClaimAsString("preferred_username");
        String email = jwt.getClaimAsString("email");
        
        // Extract roles from authorities
        UserRole role = UserRole.NORMAL; // Default role
        List<String> authorities = jwtAuth.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .toList();
        
        if (authorities.contains("ROLE_ADMIN")) {
            role = UserRole.ADMIN;
        } else if (authorities.contains("ROLE_VIP")) {
            role = UserRole.VIP;
        }

        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        if (emailVerified == null) {
            emailVerified = false;
        }

        return UserResponse.builder()
                .username(username)
                .email(email)
                .role(role)
                .enabled(true) // Assuming enabled if token is valid
                .emailVerified(emailVerified)
                .build();
    }
}

