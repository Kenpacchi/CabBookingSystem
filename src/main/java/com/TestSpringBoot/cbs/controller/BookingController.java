package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.dto.BookRideRequest;
import com.TestSpringBoot.cbs.model.dto.RideBookingResponse;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.service.BookingService;
import com.TestSpringBoot.cbs.service.DriverService;
import com.TestSpringBoot.cbs.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ride")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private DriverService driverService;

    @Autowired
    private UserService userService;

    @PostMapping("/book")
    public RideBookingResponse bookRide(@RequestBody BookRideRequest request) {
        User user = userService.getUserByPhone(request.getPhoneNumber());
        return bookingService.bookRide(user, request.getDropLocation(), request.getVehicleType());
    }

    @GetMapping("/show/{vehicleType}")
    public Object showNearby(@PathVariable VehicleTypeEnum vehicleType, @RequestParam String phoneNumber) {
        User user = userService.getUserByPhone(phoneNumber);

        return switch (vehicleType) {
            case CAB -> driverService.getNearbyCabs(user);
            case BIKE -> driverService.getNearbyBikes(user);
            case AUTO -> driverService.getNearbyAutos(user);
            default -> "Invalid vehicle type";
        };
    }
}
