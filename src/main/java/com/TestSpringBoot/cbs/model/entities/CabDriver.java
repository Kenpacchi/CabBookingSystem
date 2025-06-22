package com.TestSpringBoot.cbs.model.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cab_drivers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CabDriver {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String mobileNumber;
    private Long vehicleId;
    private Boolean isAvailable;
    private Boolean accept;

    private Integer x;
    private Integer y;
}
