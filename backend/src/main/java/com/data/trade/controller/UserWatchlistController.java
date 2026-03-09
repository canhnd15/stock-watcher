package com.data.trade.controller;

import com.data.trade.constants.ApiEndpoints;
import com.data.trade.model.User;
import com.data.trade.model.UserWatchlist;
import com.data.trade.service.UserWatchlistService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiEndpoints.API_USER_WATCHLIST)
@RequiredArgsConstructor
public class UserWatchlistController {

    private final UserWatchlistService userWatchlistService;

    @GetMapping
    public ResponseEntity<List<WatchlistCodeResponse>> getWatchlist(
            @AuthenticationPrincipal User currentUser) {
        List<UserWatchlist> entries = userWatchlistService.getWatchlistEntries(currentUser);
        List<WatchlistCodeResponse> response = entries.stream()
                .map(e -> new WatchlistCodeResponse(e.getId(), e.getCode()))
                .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<WatchlistCodeResponse> addCode(
            @AuthenticationPrincipal User currentUser,
            @RequestBody AddWatchlistCodeRequest request) {
        UserWatchlist saved = userWatchlistService.addCode(currentUser, request.getCode());
        return ResponseEntity.ok(new WatchlistCodeResponse(saved.getId(), saved.getCode()));
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<Void> deleteCode(
            @AuthenticationPrincipal User currentUser,
            @PathVariable String code) {
        userWatchlistService.deleteCode(currentUser, code);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset")
    public ResponseEntity<List<WatchlistCodeResponse>> resetToDefault(
            @AuthenticationPrincipal User currentUser) {
        userWatchlistService.resetToDefault(currentUser);
        List<UserWatchlist> entries = userWatchlistService.getWatchlistEntries(currentUser);
        List<WatchlistCodeResponse> response = entries.stream()
                .map(e -> new WatchlistCodeResponse(e.getId(), e.getCode()))
                .toList();
        return ResponseEntity.ok(response);
    }

    @Data
    public static class AddWatchlistCodeRequest {
        private String code;
    }

    @Data
    public static class WatchlistCodeResponse {
        private final Long id;
        private final String code;
    }
}
