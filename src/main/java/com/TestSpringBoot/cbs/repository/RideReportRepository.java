package com.TestSpringBoot.cbs.repository;

import com.TestSpringBoot.cbs.model.entities.RideReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideReportRepository extends JpaRepository<RideReport, Long> {

    /** All reports submitted by a specific user */
    List<RideReport> findByUserIdOrderByReportedAtDesc(Long userId);

    /** All reports for a specific ride */
    List<RideReport> findByRideId(Long rideId);

    /** All open reports (admin dashboard) */
    List<RideReport> findByStatusOrderByReportedAtDesc(String status);

    /** Check whether a user already reported a specific ride */
    Optional<RideReport> findByRideIdAndUserId(Long rideId, Long userId);
}
