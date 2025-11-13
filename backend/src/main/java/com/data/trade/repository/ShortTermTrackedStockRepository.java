package com.data.trade.repository;

import com.data.trade.model.ShortTermTrackedStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShortTermTrackedStockRepository extends JpaRepository<ShortTermTrackedStock, Long> {
    List<ShortTermTrackedStock> findAllByActiveTrue();
    List<ShortTermTrackedStock> findAllByUserId(Long userId);
    List<ShortTermTrackedStock> findAllByUserIdAndActiveTrue(Long userId);
    Optional<ShortTermTrackedStock> findByUserIdAndCode(Long userId, String code);
    boolean existsByUserIdAndCode(Long userId, String code);
}

