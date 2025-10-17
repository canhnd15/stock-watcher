package com.data.trade.repository;

import com.data.trade.model.TrackedStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrackedStockRepository extends JpaRepository<TrackedStock, Long> {
    List<TrackedStock> findAllByActiveTrue();
}
