package com.data.trade.repository;

import com.data.trade.model.UserWatchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserWatchlistRepository extends JpaRepository<UserWatchlist, Long> {

    List<UserWatchlist> findAllByUserIdOrderByCodeAsc(Long userId);

    Optional<UserWatchlist> findByUserIdAndCode(Long userId, String code);

    boolean existsByUserIdAndCode(Long userId, String code);

    boolean existsByUserId(Long userId);

    void deleteByUserIdAndCode(Long userId, String code);

    long countByUserId(Long userId);
}
