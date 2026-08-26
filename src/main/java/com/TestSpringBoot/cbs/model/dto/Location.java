package com.TestSpringBoot.cbs.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Location {
    // Human-readable address (display name)
    private String address;

    // Geographic coordinates
    private double latitude;
    private double longitude;
}
