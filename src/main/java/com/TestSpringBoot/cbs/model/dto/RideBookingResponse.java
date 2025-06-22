package com.TestSpringBoot.cbs.model.dto;


import lombok.Data;

@Data
public class RideBookingResponse {
    String message;
    String driverName;
    String driverMobileNumber;
    String vehicleNumber;
    long cost;
}
