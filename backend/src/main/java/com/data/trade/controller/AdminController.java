package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.VipRequestDTO;
import com.data.trade.dto.VipRequestActionRequest;
import com.data.trade.dto.auth.UserResponse;
import com.data.trade.model.User;
import com.data.trade.model.UserRole;
import com.data.trade.repository.UserRepository;
import com.data.trade.service.VipRequestService;
import jakarta.validation.Valid;
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
    private final VipRequestService vipRequestService;

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
                .emailVerified(user.getEmailVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    @GetMapping(ApiEndpoints.ADMIN_VIP_REQUESTS_PATH)
    public List<VipRequestDTO> getAllVipRequests() {
        return vipRequestService.getAllVipRequests();
    }

    @GetMapping(ApiEndpoints.ADMIN_VIP_REQUESTS_PATH + "/pending")
    public List<VipRequestDTO> getPendingVipRequests() {
        return vipRequestService.getPendingVipRequests();
    }

    @PostMapping(ApiEndpoints.ADMIN_VIP_REQUESTS_APPROVE_PATH)
    public ResponseEntity<?> approveVipRequest(
            @PathVariable Long requestId,
            @Valid @RequestBody(required = false) VipRequestActionRequest request) {
        try {
            VipRequestActionRequest actionRequest = request != null ? request : new VipRequestActionRequest();
            VipRequestDTO vipRequest = vipRequestService.approveVipRequest(requestId, actionRequest);
            return ResponseEntity.ok(vipRequest);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping(ApiEndpoints.ADMIN_VIP_REQUESTS_REJECT_PATH)
    public ResponseEntity<?> rejectVipRequest(
            @PathVariable Long requestId,
            @Valid @RequestBody(required = false) VipRequestActionRequest request) {
        try {
            VipRequestActionRequest actionRequest = request != null ? request : new VipRequestActionRequest();
            VipRequestDTO vipRequest = vipRequestService.rejectVipRequest(requestId, actionRequest);
            return ResponseEntity.ok(vipRequest);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Data
    static class UpdateRoleRequest {
        private UserRole role;
    }
}

