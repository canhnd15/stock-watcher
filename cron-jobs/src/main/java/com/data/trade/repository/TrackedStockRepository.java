package com.data.trade.repository;

import com.data.trade.model.TrackedStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TrackedStockRepository extends JpaRepository<TrackedStock, Long> {
    List<TrackedStock> findAllByActiveTrue();
    List<TrackedStock> findAllByUserId(Long userId);
    List<TrackedStock> findAllByUserIdAndActiveTrue(Long userId);
    Optional<TrackedStock> findByUserIdAndCode(Long userId, String code);
    boolean existsByUserIdAndCode(Long userId, String code);
}
