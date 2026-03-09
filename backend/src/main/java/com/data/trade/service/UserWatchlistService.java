package com.data.trade.service;

import com.data.trade.model.User;
import com.data.trade.model.UserWatchlist;
import com.data.trade.repository.UserWatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserWatchlistService {

    private final UserWatchlistRepository userWatchlistRepository;
    private final MarketCodeService marketCodeService;

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

    @Transactional
    public UserWatchlist addCode(User user, String code) {
        String normalized = code.trim().toUpperCase();
        if (userWatchlistRepository.existsByUserIdAndCode(user.getId(), normalized)) {
            return userWatchlistRepository.findByUserIdAndCode(user.getId(), normalized)
                    .orElseThrow();
        }
        UserWatchlist entry = UserWatchlist.builder()
                .user(user)
                .code(normalized)
                .build();
        return userWatchlistRepository.save(entry);
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

    private void initializeFromGlobal(User user) {
        List<String> globalCodes = marketCodeService.getActiveCodes();
        List<UserWatchlist> entries = globalCodes.stream()
                .map(code -> UserWatchlist.builder()
                        .user(user)
                        .code(code)
                        .build())
                .collect(Collectors.toList());
        userWatchlistRepository.saveAll(entries);
    }
}
