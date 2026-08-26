package com.TestSpringBoot.cbs.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FareEstimateRequest {
    @NotNull(message = "Pickup location is required")
    private Location pickup;

    @NotNull(message = "Drop location is required")
    private Location drop;
}
