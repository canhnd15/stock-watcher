package com.data.trade.repository;

import com.data.trade.model.PriceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PriceAlertRepository extends JpaRepository<PriceAlert, Long> {
    List<PriceAlert> findAllByUserId(Long userId);
    List<PriceAlert> findAllByUserIdAndActiveTrue(Long userId);
    List<PriceAlert> findAllByActiveTrue();
    
    @Query("SELECT pa FROM PriceAlert pa JOIN FETCH pa.user WHERE pa.active = true")
    List<PriceAlert> findAllByActiveTrueWithUser();
    
    Optional<PriceAlert> findByUserIdAndCode(Long userId, String code);
    boolean existsByUserIdAndCode(Long userId, String code);
}

