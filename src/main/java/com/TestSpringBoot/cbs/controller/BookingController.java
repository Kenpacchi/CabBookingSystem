package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.dto.*;
import com.TestSpringBoot.cbs.model.entities.RideHistory;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.repository.RideHistoryRepository;
import com.TestSpringBoot.cbs.service.BookingService;
import com.TestSpringBoot.cbs.service.DriverService;
import com.TestSpringBoot.cbs.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * All endpoints here require a valid JWT (enforced by SecurityConfig).
 * The phone number is extracted from the JWT token — no need to pass it in the request body.
 */
@RestController
@RequestMapping("/api/ride")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class BookingController {

    @Autowired private BookingService bookingService;
    @Autowired private DriverService driverService;
    @Autowired private UserService userService;
    @Autowired private RideHistoryRepository rideHistoryRepo;

    /**
     * GET /api/ride/estimate?pickupLat=&pickupLng=&dropLat=&dropLng=
     * Returns fare estimates for all vehicle types (no booking).
     */
    @PostMapping("/estimate")
    public ResponseEntity<FareEstimateResponse> getFareEstimate(
            @Valid @RequestBody FareEstimateRequest request) {
        FareEstimateResponse estimate = bookingService.estimateFare(request.getPickup(), request.getDrop());
        return ResponseEntity.ok(estimate);
    }

    /**
     * POST /api/ride/book
     * Book a ride. JWT identifies the user.
     */
    @PostMapping("/book")
    public ResponseEntity<RideBookingResponse> bookRide(@Valid @RequestBody BookRideRequest request) {
        // Get phone from JWT
        String phoneNumber = getPhoneFromJwt();
        User user = userService.getUserByPhone(phoneNumber);

        if (user.getIsRiding() != null && user.getIsRiding() == FlagTypeEnum.Y) {
            RideBookingResponse resp = new RideBookingResponse();
            resp.setMessage("You already have an active ride!");
            return ResponseEntity.badRequest().body(resp);
        }

        // Use pickup from request; if not provided, use user's last known location
        Location pickup = request.getPickupLocation();
        if (pickup == null || (pickup.getLatitude() == 0 && pickup.getLongitude() == 0)) {
            pickup = new Location("Current Location", user.getLatitude(), user.getLongitude());
        }

        RideBookingResponse response = bookingService.bookRide(
                user, pickup, request.getDropLocation(), request.getVehicleType());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/ride/nearby/{vehicleType}
     * Show nearby available drivers of a given type.
     */
    @GetMapping("/nearby/{vehicleType}")
    public ResponseEntity<Object> showNearby(@PathVariable VehicleTypeEnum vehicleType) {
        String phoneNumber = getPhoneFromJwt();
        User user = userService.getUserByPhone(phoneNumber);

        Object result = switch (vehicleType) {
            case CAB  -> driverService.getNearbyCabs(user);
            case BIKE -> driverService.getNearbyBikes(user);
            case AUTO -> driverService.getNearbyAutos(user);
        };
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/ride/history
     * Get ride history for the authenticated user.
     */
    @GetMapping("/history")
    public ResponseEntity<List<RideHistory>> getRideHistory() {
        String phoneNumber = getPhoneFromJwt();
        User user = userService.getUserByPhone(phoneNumber);
        List<RideHistory> history = rideHistoryRepo.findByUserIdOrderByBookedAtDesc(user.getId());
        return ResponseEntity.ok(history);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    /**
     * Extract phone number (JWT subject) from Spring Security context.
     */
    private String getPhoneFromJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName(); // Spring Security sets name = JWT subject = phoneNumber
    }
}
