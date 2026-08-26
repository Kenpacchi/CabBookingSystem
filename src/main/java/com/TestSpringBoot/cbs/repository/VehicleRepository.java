package com.TestSpringBoot.cbs.repository;

import com.TestSpringBoot.cbs.model.entities.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {}
