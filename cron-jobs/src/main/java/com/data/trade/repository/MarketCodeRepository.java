package com.data.trade.repository;

import com.data.trade.model.MarketCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketCodeRepository extends JpaRepository<MarketCode, Long> {

    List<MarketCode> findAllByActiveTrueOrderByCodeAsc();
}
