package com.TestSpringBoot.cbs.repository;


import com.TestSpringBoot.cbs.model.entities.ThreeWheelerDriver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ThreeWheelerDriverRepository extends JpaRepository<ThreeWheelerDriver, Long> {
}
