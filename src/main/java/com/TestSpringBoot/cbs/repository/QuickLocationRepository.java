package com.TestSpringBoot.cbs.repository;

import com.TestSpringBoot.cbs.model.entities.QuickLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuickLocationRepository extends JpaRepository<QuickLocation, Long> {

    /** All saved quick locations for a user */
    List<QuickLocation> findByUserPhone(String userPhone);

    /** Find a specific label for a user (e.g. HOME) */
    Optional<QuickLocation> findByUserPhoneAndLabel(String userPhone, String label);

    /** Delete a specific label for a user */
    void deleteByUserPhoneAndLabel(String userPhone, String label);
}
