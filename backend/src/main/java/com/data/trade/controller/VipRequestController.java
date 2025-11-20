package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.VipRequestDTO;
import com.data.trade.dto.VipRequestRequest;
import com.data.trade.dto.VipRequestActionRequest;
import com.data.trade.model.User;
import com.data.trade.service.VipRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiEndpoints.API_AUTH)
@RequiredArgsConstructor
public class VipRequestController {

    private final VipRequestService vipRequestService;

    @PostMapping("/vip-request")
    @PreAuthorize(RoleConstants.HAS_ANY_ROLE_ALL)
    public ResponseEntity<?> createVipRequest(@Valid @RequestBody VipRequestRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) authentication.getPrincipal();
            
            VipRequestDTO vipRequest = vipRequestService.createVipRequest(request, user);
            return ResponseEntity.ok(vipRequest);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/vip-request/my")
    @PreAuthorize(RoleConstants.HAS_ANY_ROLE_ALL)
    public ResponseEntity<List<VipRequestDTO>> getMyVipRequests() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) authentication.getPrincipal();
        
        List<VipRequestDTO> requests = vipRequestService.getUserVipRequests(user);
        return ResponseEntity.ok(requests);
    }
}

