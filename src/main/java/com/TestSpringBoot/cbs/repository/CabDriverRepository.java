package com.TestSpringBoot.cbs.repository;

import com.TestSpringBoot.cbs.model.entities.CabDriver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CabDriverRepository extends JpaRepository<CabDriver, Long> {
}
