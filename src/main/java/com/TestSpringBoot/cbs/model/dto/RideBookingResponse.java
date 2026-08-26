package com.TestSpringBoot.cbs.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class RideBookingResponse {
    private String message;
    private String driverName;
    private String driverMobileNumber;
    private String vehicleNumber;

    /** Total fare (same as cost, renamed for frontend clarity) */
    private long fare;

    /** Kept for backward compat */
    private long cost;

    private double distanceKm;
    private double surgeMultiplier;
    private String status;

    /** Ride ID for polling */
    private Long rideId;

    /** Driver location (approximate, for map) */
    private Double driverLatitude;
    private Double driverLongitude;

    // convenience setter so BookingService can set fare+cost together
    public void setFareAndCost(long amount) {
        this.fare = amount;
        this.cost = amount;
    }
}
