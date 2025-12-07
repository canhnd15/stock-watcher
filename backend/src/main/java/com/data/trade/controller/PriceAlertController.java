package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.constants.RoleConstants;
import com.data.trade.dto.CreatePriceAlertRequest;
import com.data.trade.dto.PriceAlertDTO;
import com.data.trade.dto.UpdatePriceAlertRequest;
import com.data.trade.model.User;
import com.data.trade.service.PriceAlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiEndpoints.API_PRICE_ALERTS)
@RequiredArgsConstructor
@PreAuthorize(RoleConstants.HAS_ANY_ROLE_VIP_ADMIN)
@Slf4j
public class PriceAlertController {

    private final PriceAlertService priceAlertService;

    @GetMapping
    public List<PriceAlertDTO> getAllPriceAlerts(@AuthenticationPrincipal User currentUser) {
        return priceAlertService.getAllPriceAlertsForUser(currentUser.getId());
    }

    @PostMapping
    public ResponseEntity<?> createPriceAlert(
            @Valid @RequestBody CreatePriceAlertRequest request,
            @AuthenticationPrincipal User currentUser) {
        try {
            PriceAlertDTO alert = priceAlertService.createPriceAlert(currentUser, request);
            return ResponseEntity.ok(alert);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to create price alert", e);
            return ResponseEntity.status(500).body("Failed to create price alert: " + e.getMessage());
        }
    }

    @PutMapping(ApiEndpoints.PRICE_ALERTS_BY_ID_PATH)
    public ResponseEntity<?> updatePriceAlert(
            @PathVariable Long id,
            @RequestBody UpdatePriceAlertRequest request,
            @AuthenticationPrincipal User currentUser) {
        try {
            PriceAlertDTO alert = priceAlertService.updatePriceAlert(id, currentUser, request);
            return ResponseEntity.ok(alert);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to update price alert", e);
            return ResponseEntity.status(500).body("Failed to update price alert: " + e.getMessage());
        }
    }

    @DeleteMapping(ApiEndpoints.PRICE_ALERTS_BY_ID_PATH)
    public ResponseEntity<?> deletePriceAlert(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        try {
            priceAlertService.deletePriceAlert(id, currentUser);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to delete price alert", e);
            return ResponseEntity.status(500).body("Failed to delete price alert: " + e.getMessage());
        }
    }

    @PutMapping(ApiEndpoints.PRICE_ALERTS_TOGGLE_PATH)
    public ResponseEntity<?> togglePriceAlert(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        try {
            PriceAlertDTO alert = priceAlertService.togglePriceAlert(id, currentUser);
            return ResponseEntity.ok(alert);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Failed to toggle price alert", e);
            return ResponseEntity.status(500).body("Failed to toggle price alert: " + e.getMessage());
        }
    }

    @PostMapping(ApiEndpoints.PRICE_ALERTS_REFRESH_PATH)
    public ResponseEntity<?> refreshPriceAlerts(@AuthenticationPrincipal User currentUser) {
        try {
            List<PriceAlertDTO> alerts = priceAlertService.getAllPriceAlertsForUser(currentUser.getId());
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("Failed to refresh price alerts", e);
            return ResponseEntity.status(500).body("Failed to refresh price alerts: " + e.getMessage());
        }
    }
}

