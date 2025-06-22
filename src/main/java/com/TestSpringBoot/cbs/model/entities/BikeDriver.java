package com.TestSpringBoot.cbs.model.entities;

import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bike_drivers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BikeDriver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "mobile_number", nullable = false, unique = true)
    private String mobileNumber;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "is_available")
    private FlagTypeEnum isAvailable;

    @Column
    private Boolean accept;

    @Column
    private Integer x;

    @Column
    private Integer y;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", insertable = false, updatable = false)
    @JsonIgnore
    private Vehicle vehicle;
}

