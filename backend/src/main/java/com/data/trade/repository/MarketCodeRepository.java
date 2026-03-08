package com.data.trade.repository;

import com.data.trade.model.MarketCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketCodeRepository extends JpaRepository<MarketCode, Long> {

    List<MarketCode> findAllByActiveTrueOrderByCodeAsc();

    List<MarketCode> findAllByOrderByCodeAsc();

    Optional<MarketCode> findByCode(String code);

    boolean existsByCode(String code);
}
