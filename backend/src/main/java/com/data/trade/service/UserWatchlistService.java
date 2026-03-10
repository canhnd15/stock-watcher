package com.data.trade.service;

import com.data.trade.model.User;
import com.data.trade.model.UserWatchlist;
import com.data.trade.repository.UserWatchlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserWatchlistService {

    private final UserWatchlistRepository userWatchlistRepository;
    private final MarketCodeService marketCodeService;
    private final FinpathClient finpathClient;

    /** Default VN30 codes from application.properties — used to seed new users' watchlists. */
    @Value("${market.vn30.codes}")
    private List<String> defaultVn30Codes;

    /**
     * Get all watchlist codes for a user.
     * If the user has no watchlist yet, initialize it from the global market codes.
     */
    @Transactional
    public List<String> getWatchlistCodes(User user) {
        if (!userWatchlistRepository.existsByUserId(user.getId())) {
            initializeFromGlobal(user);
        }
        return userWatchlistRepository.findAllByUserIdOrderByCodeAsc(user.getId()).stream()
                .map(UserWatchlist::getCode)
                .collect(Collectors.toList());
    }

    /**
     * Get all watchlist entries for a user (with full entity details).
     * If the user has no watchlist yet, initialize it from the global market codes.
     */
    @Transactional
    public List<UserWatchlist> getWatchlistEntries(User user) {
        if (!userWatchlistRepository.existsByUserId(user.getId())) {
            initializeFromGlobal(user);
        }
        return userWatchlistRepository.findAllByUserIdOrderByCodeAsc(user.getId());
    }

    /**
     * Add a stock code to the user's watchlist.
     * Validates that the stock code exists by checking the market price API.
     * Also adds the code to the global market_codes table so cron jobs can ingest data for it.
     */
    @Transactional
    public UserWatchlist addCode(User user, String code) {
        String normalized = code.trim().toUpperCase();

        // Return existing entry if already in watchlist
        if (userWatchlistRepository.existsByUserIdAndCode(user.getId(), normalized)) {
            return userWatchlistRepository.findByUserIdAndCode(user.getId(), normalized)
                    .orElseThrow();
        }

        // Validate stock code exists by fetching market price
        validateStockCodeExists(normalized);

        // Add to user's watchlist
        UserWatchlist entry = UserWatchlist.builder()
                .user(user)
                .code(normalized)
                .build();
        UserWatchlist saved = userWatchlistRepository.save(entry);

        // Also add to global market_codes so cron jobs will ingest data for this code
        marketCodeService.addCode(normalized);

        return saved;
    }

    @Transactional
    public void deleteCode(User user, String code) {
        String normalized = code.trim().toUpperCase();
        userWatchlistRepository.deleteByUserIdAndCode(user.getId(), normalized);
    }

    @Transactional
    public void resetToDefault(User user) {
        // Delete all existing entries
        List<UserWatchlist> existing = userWatchlistRepository.findAllByUserIdOrderByCodeAsc(user.getId());
        userWatchlistRepository.deleteAll(existing);
        // Re-initialize from global
        initializeFromGlobal(user);
    }

    /**
     * Validate that a stock code exists by checking the Finpath/TradingView API.
     * Throws IllegalArgumentException if the stock code is invalid.
     */
    private void validateStockCodeExists(String code) {
        try {
            var response = finpathClient.fetchTradingViewBars(code);
            if (response != null) {
                Double price = response.getMarketPrice();
                if (price != null) {
                    return; // Valid stock code
                }
            }
        } catch (Exception e) {
            log.debug("Stock code validation failed for {}: {}", code, e.getMessage());
        }
        throw new IllegalArgumentException("Invalid stock code: " + code + ". Stock not found on the market.");
    }

    /**
     * Seeds a brand-new user's watchlist from the VN30 defaults defined in application.properties.
     * Deliberately does NOT read from market_codes, so codes added by other users never
     * appear in an unrelated user's watchlist automatically.
     */
    private void initializeFromGlobal(User user) {
        List<UserWatchlist> entries = defaultVn30Codes.stream()
                .map(code -> UserWatchlist.builder()
                        .user(user)
                        .code(code.trim().toUpperCase())
                        .build())
                .collect(Collectors.toList());
        userWatchlistRepository.saveAll(entries);
    }
}
