package com.TestSpringBoot.cbs.repository;
import com.TestSpringBoot.cbs.model.entities.BikeDriver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BikeDriverRepository extends JpaRepository<BikeDriver, Long> {
}