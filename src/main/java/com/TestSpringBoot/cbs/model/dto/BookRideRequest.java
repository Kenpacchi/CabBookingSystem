package com.TestSpringBoot.cbs.model.dto;

import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import lombok.Data;

@Data
public class BookRideRequest {
    private String phoneNumber;
    private Location dropLocation;
    private VehicleTypeEnum vehicleType; // "CAB", "BIKE", "AUTO"
}