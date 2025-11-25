package com.data.trade.service;

import com.data.trade.dto.VipRequestDTO;
import com.data.trade.dto.VipRequestRequest;
import com.data.trade.dto.VipRequestActionRequest;
import com.data.trade.model.User;
import com.data.trade.model.UserRole;
import com.data.trade.model.VipRequest;
import com.data.trade.model.VipRequestStatus;
import com.data.trade.repository.UserRepository;
import com.data.trade.repository.VipRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VipRequestService {

    private final VipRequestRepository vipRequestRepository;
    private final UserRepository userRepository;

    @Transactional
    public VipRequestDTO createVipRequest(VipRequestRequest request, User user) {
        // Check if user already has VIP role
        if (user.getRole() == UserRole.VIP || user.getRole() == UserRole.ADMIN) {
            throw new RuntimeException("User already has VIP or ADMIN role");
        }

        // Check if there's already a pending request
        boolean hasPendingRequest = vipRequestRepository.existsByUserAndStatusIn(
            user,
            List.of(VipRequestStatus.PENDING)
        );
        
        if (hasPendingRequest) {
            throw new RuntimeException("You already have a pending VIP request");
        }

        VipRequest vipRequest = VipRequest.builder()
                .user(user)
                .status(VipRequestStatus.PENDING)
                .reason(request.getReason())
                .requestedAt(OffsetDateTime.now())
                .build();

        vipRequest = vipRequestRepository.save(vipRequest);
        log.info("VIP request created for user: {}", user.getUsername());

        return mapToDTO(vipRequest);
    }

    public List<VipRequestDTO> getAllVipRequests() {
        return vipRequestRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<VipRequestDTO> getPendingVipRequests() {
        return vipRequestRepository.findByStatus(VipRequestStatus.PENDING).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<VipRequestDTO> getUserVipRequests(User user) {
        return vipRequestRepository.findByUser(user).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public VipRequestDTO approveVipRequest(Long requestId, VipRequestActionRequest actionRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User admin = (User) authentication.getPrincipal();

        VipRequest vipRequest = vipRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("VIP request not found"));

        if (vipRequest.getStatus() != VipRequestStatus.PENDING) {
            throw new RuntimeException("VIP request is not pending");
        }

        // Update user role to VIP
        User user = vipRequest.getUser();
        user.setRole(UserRole.VIP);
        userRepository.save(user);

        // Update request status
        vipRequest.setStatus(VipRequestStatus.APPROVED);
        vipRequest.setAdminNote(actionRequest.getAdminNote());
        vipRequest.setProcessedAt(OffsetDateTime.now());
        vipRequest.setProcessedBy(admin);
        vipRequest = vipRequestRepository.save(vipRequest);

        log.info("VIP request {} approved by admin {}", requestId, admin.getUsername());

        return mapToDTO(vipRequest);
    }

    @Transactional
    public VipRequestDTO rejectVipRequest(Long requestId, VipRequestActionRequest actionRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User admin = (User) authentication.getPrincipal();

        VipRequest vipRequest = vipRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("VIP request not found"));

        if (vipRequest.getStatus() != VipRequestStatus.PENDING) {
            throw new RuntimeException("VIP request is not pending");
        }

        // Update request status
        vipRequest.setStatus(VipRequestStatus.REJECTED);
        vipRequest.setAdminNote(actionRequest.getAdminNote());
        vipRequest.setProcessedAt(OffsetDateTime.now());
        vipRequest.setProcessedBy(admin);
        vipRequest = vipRequestRepository.save(vipRequest);

        log.info("VIP request {} rejected by admin {}", requestId, admin.getUsername());

        return mapToDTO(vipRequest);
    }

    private VipRequestDTO mapToDTO(VipRequest vipRequest) {
        return VipRequestDTO.builder()
                .id(vipRequest.getId())
                .userId(vipRequest.getUser().getId())
                .username(vipRequest.getUser().getUsername())
                .email(vipRequest.getUser().getEmail())
                .status(vipRequest.getStatus())
                .reason(vipRequest.getReason())
                .adminNote(vipRequest.getAdminNote())
                .requestedAt(vipRequest.getRequestedAt())
                .processedAt(vipRequest.getProcessedAt())
                .processedById(vipRequest.getProcessedBy() != null ? vipRequest.getProcessedBy().getId() : null)
                .processedByUsername(vipRequest.getProcessedBy() != null ? vipRequest.getProcessedBy().getUsername() : null)
                .build();
    }
}

