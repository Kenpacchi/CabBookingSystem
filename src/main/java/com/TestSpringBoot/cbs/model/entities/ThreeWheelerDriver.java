package com.TestSpringBoot.cbs.model.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "three_wheeler_drivers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThreeWheelerDriver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(name = "mobile_number", nullable = false, unique = true)
    private String mobileNumber;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Column(name = "is_available")
    private Boolean isAvailable;

    @Column
    private Boolean accept;

    @Column
    private Integer x;

    @Column
    private Integer y;
}
