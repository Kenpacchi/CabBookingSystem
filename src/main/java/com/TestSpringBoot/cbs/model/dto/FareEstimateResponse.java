package com.TestSpringBoot.cbs.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FareEstimateResponse {
    private double distanceKm;
    private double currentSurge;

    // Bike fares
    private double bikeFare;
    private double bikeSurgeFare;

    // Auto fares
    private double autoFare;
    private double autoSurgeFare;

    // Cab fares
    private double cabFare;
    private double cabSurgeFare;
}
