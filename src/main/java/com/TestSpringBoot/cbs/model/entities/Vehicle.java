package com.TestSpringBoot.cbs.model.entities;

import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "vehicles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false)
    private VehicleTypeEnum vehicleType;

    @Column(name = "vehicle_number", nullable = false, unique = true)
    private String vehicleNumber;
}

