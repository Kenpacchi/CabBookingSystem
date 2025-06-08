package com.TestSpringBoot.TestSpringBoot.model.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cab_driver")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CabDriver {

    @Id
    private Long id;

    @Column(name = "cab_driver_name", nullable = false)
    private String cabDriverName;

    @Column(name = "cab_driver_number", nullable = false)
    private String cabDriverNumber;

    @Column(name = "is_available", nullable = false)
    private boolean isAvailable;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "x", column = @Column(name = "x_coordinate")),
            @AttributeOverride(name = "y", column = @Column(name = "y_coordinate"))
    })
    private Location cabDriverLocation;
}
