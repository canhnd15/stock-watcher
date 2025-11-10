package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.auth.UserResponse;
import com.data.trade.model.User;
import com.data.trade.model.UserRole;
import com.data.trade.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiEndpoints.API_ADMIN)
@RequiredArgsConstructor
@PreAuthorize(RoleConstants.HAS_ROLE_ADMIN)
public class AdminController {

    private final UserRepository userRepository;

    @GetMapping(ApiEndpoints.ADMIN_USERS_PATH)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @PutMapping(ApiEndpoints.ADMIN_USERS_ROLE_PATH)
    public ResponseEntity<?> updateUserRole(
            @PathVariable Long userId,
            @RequestBody UpdateRoleRequest request) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setRole(request.getRole());
        User updated = userRepository.save(user);

        return ResponseEntity.ok(mapToUserResponse(updated));
    }

    @PutMapping(ApiEndpoints.ADMIN_USERS_STATUS_PATH)
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setEnabled(!user.getEnabled());
        User updated = userRepository.save(user);

        return ResponseEntity.ok(mapToUserResponse(updated));
    }

    @DeleteMapping(ApiEndpoints.ADMIN_USERS_BY_ID_PATH)
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        if (!userRepository.existsById(userId)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(userId);
        return ResponseEntity.ok().build();
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .enabled(user.getEnabled())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    @Data
    static class UpdateRoleRequest {
        private UserRole role;
    }
}

