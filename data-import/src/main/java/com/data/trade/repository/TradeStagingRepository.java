package com.data.trade.repository;

import com.data.trade.model.TradeStaging;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TradeStagingRepository extends JpaRepository<TradeStaging, Long> {
}

