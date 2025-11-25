package com.data.trade.repository;

import com.data.trade.model.User;
import com.data.trade.model.VipRequest;
import com.data.trade.model.VipRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VipRequestRepository extends JpaRepository<VipRequest, Long> {
    List<VipRequest> findByStatus(VipRequestStatus status);
    List<VipRequest> findByUser(User user);
    Optional<VipRequest> findByUserAndStatus(User user, VipRequestStatus status);
    boolean existsByUserAndStatusIn(User user, List<VipRequestStatus> statuses);
}

