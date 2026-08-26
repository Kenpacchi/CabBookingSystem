package com.TestSpringBoot.cbs.repository;

import com.TestSpringBoot.cbs.model.entities.RideHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RideHistoryRepository extends JpaRepository<RideHistory, Long> {

    List<RideHistory> findByUserIdOrderByBookedAtDesc(Long userId);

    List<RideHistory> findByUserPhoneOrderByBookedAtDesc(String userPhone);
}
