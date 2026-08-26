package com.TestSpringBoot.cbs.model.dto;

import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BookRideRequest {
    // JWT provides user identity — phone number no longer needed in body
    // but kept for backward compatibility / driver OTP lookup
    private String phoneNumber;

    @NotNull(message = "Pickup location is required")
    private Location pickupLocation;

    @NotNull(message = "Drop location is required")
    private Location dropLocation;

    @NotNull(message = "Vehicle type is required")
    private VehicleTypeEnum vehicleType; // CAB, BIKE, AUTO
}
