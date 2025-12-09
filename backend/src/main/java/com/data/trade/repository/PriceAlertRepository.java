package com.data.trade.repository;

import com.data.trade.model.PriceAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PriceAlertRepository extends JpaRepository<PriceAlert, Long> {
    Page<PriceAlert> findAllByUserId(Long userId, Pageable pageable);
    Page<PriceAlert> findAllByUserIdAndActive(Long userId, Boolean active, Pageable pageable);
    List<PriceAlert> findAllByActiveTrue();
    boolean existsByUserIdAndCode(Long userId, String code);
    
    // Count methods for statistics
    long countByUserId(Long userId);
    long countByUserIdAndActive(Long userId, Boolean active);

    @Query("SELECT pa FROM PriceAlert pa JOIN FETCH pa.user WHERE pa.active = true")
    List<PriceAlert> findAllByActiveTrueWithUser();
}

