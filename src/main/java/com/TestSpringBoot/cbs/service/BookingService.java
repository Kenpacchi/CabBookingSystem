package com.TestSpringBoot.cbs.service;

import com.TestSpringBoot.cbs.model.dto.FareEstimateResponse;
import com.TestSpringBoot.cbs.model.dto.Location;
import com.TestSpringBoot.cbs.model.dto.OtpVerificationRequest;
import com.TestSpringBoot.cbs.model.dto.RideBookingResponse;
import com.TestSpringBoot.cbs.model.entities.RideHistory;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.RideHistoryRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import com.TestSpringBoot.cbs.repository.UserRepository;
import com.TestSpringBoot.cbs.common.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    @Autowired private CabDriverRepository cabRepo;
    @Autowired private BikeDriverRepository bikeRepo;
    @Autowired private ThreeWheelerDriverRepository autoRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private RideHistoryRepository rideHistoryRepo;
    @Autowired private DistanceService distanceService;
    @Autowired private FareCalculatorService fareCalculator;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    // ──────────────────────────────────────────────────────────────────────────
    // Fare Estimate (no booking)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Estimate fare for all vehicle types given pickup + drop coordinates.
     */
    public FareEstimateResponse estimateFare(Location pickup, Location drop) {
        double distanceKm = distanceService.getDistanceKm(pickup, drop);

        FareCalculatorService.FareEstimate bikeEst = fareCalculator.estimateFare(VehicleTypeEnum.BIKE, distanceKm);
        FareCalculatorService.FareEstimate autoEst = fareCalculator.estimateFare(VehicleTypeEnum.AUTO, distanceKm);
        FareCalculatorService.FareEstimate cabEst  = fareCalculator.estimateFare(VehicleTypeEnum.CAB,  distanceKm);

        return FareEstimateResponse.builder()
                .distanceKm(Math.round(distanceKm * 10.0) / 10.0)
                .currentSurge(fareCalculator.getSurgeMultiplier())
                .bikeFare(bikeEst.normalFare())
                .bikeSurgeFare(bikeEst.surgeFare())
                .autoFare(autoEst.normalFare())
                .autoSurgeFare(autoEst.surgeFare())
                .cabFare(cabEst.normalFare())
                .cabSurgeFare(cabEst.surgeFare())
                .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Book Ride
    // ──────────────────────────────────────────────────────────────────────────

    public RideBookingResponse bookRide(User user, Location pickup, Location drop, VehicleTypeEnum vehicleType) {
        double distanceKm = distanceService.getDistanceKm(pickup, drop);
        double fare       = fareCalculator.calculateFare(vehicleType, distanceKm);
        double surge      = fareCalculator.getSurgeMultiplier();

        return switch (vehicleType) {
            case CAB   -> bookNearestCab(user, pickup, drop, distanceKm, fare, surge);
            case BIKE  -> bookNearestBike(user, pickup, drop, distanceKm, fare, surge);
            case AUTO  -> bookNearestAuto(user, pickup, drop, distanceKm, fare, surge);
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private booking helpers
    // ──────────────────────────────────────────────────────────────────────────

    private RideBookingResponse bookNearestCab(User user, Location pickup, Location drop,
                                               double distanceKm, double fare, double surge) {
        return cabRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept()))
                .min(Comparator.comparingDouble(d ->
                        distanceService.haversineDistance(user.getLatitude(), user.getLongitude(),
                                d.getLatitude(), d.getLongitude())))
                .map(d -> {
                    d.setUserOtp(user.getOtp());
                    d.setIsAvailable(FlagTypeEnum.N);
                    cabRepo.save(d);

                    if (!verifyOtp(d.getId(), d.getUserOtp(), VehicleTypeEnum.CAB)) {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        cabRepo.save(d);
                        return errorResponse("OTP Verification Unsuccessful. Ride is canceled.");
                    }

                    user.setIsRiding(FlagTypeEnum.Y);
                    userRepo.save(user);

                    RideHistory history = saveRideHistory(user, pickup, drop, distanceKm, fare, surge,
                            VehicleTypeEnum.CAB, d.getName(), d.getMobileNumber(),
                            d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A");

                    scheduleRideCompletion(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        d.setLatitude(drop.getLatitude());
                        d.setLongitude(drop.getLongitude());
                        cabRepo.save(d);

                        user.setIsRiding(FlagTypeEnum.N);
                        user.setLatitude(drop.getLatitude());
                        user.setLongitude(drop.getLongitude());
                        userRepo.save(user);

                        // Mark ride as completed
                        history.setStatus("COMPLETED");
                        history.setCompletedAt(LocalDateTime.now());
                        rideHistoryRepo.save(history);
                    });

                    return successResponse(d.getName(), d.getMobileNumber(),
                            d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A",
                            distanceKm, fare, surge);
                })
                .orElseGet(() -> errorResponse("No cab available nearby."));
    }

    private RideBookingResponse bookNearestBike(User user, Location pickup, Location drop,
                                                double distanceKm, double fare, double surge) {
        return bikeRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept()))
                .min(Comparator.comparingDouble(d ->
                        distanceService.haversineDistance(user.getLatitude(), user.getLongitude(),
                                d.getLatitude(), d.getLongitude())))
                .map(d -> {
                    d.setUserOtp(user.getOtp());
                    d.setIsAvailable(FlagTypeEnum.N);
                    bikeRepo.save(d);

                    if (!verifyOtp(d.getId(), d.getUserOtp(), VehicleTypeEnum.BIKE)) {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        bikeRepo.save(d);
                        return errorResponse("OTP Verification Unsuccessful. Ride is canceled.");
                    }

                    user.setIsRiding(FlagTypeEnum.Y);
                    userRepo.save(user);

                    RideHistory history = saveRideHistory(user, pickup, drop, distanceKm, fare, surge,
                            VehicleTypeEnum.BIKE, d.getName(), d.getMobileNumber(),
                            d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A");

                    scheduleRideCompletion(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        d.setLatitude(drop.getLatitude());
                        d.setLongitude(drop.getLongitude());
                        bikeRepo.save(d);

                        user.setIsRiding(FlagTypeEnum.N);
                        user.setLatitude(drop.getLatitude());
                        user.setLongitude(drop.getLongitude());
                        userRepo.save(user);

                        history.setStatus("COMPLETED");
                        history.setCompletedAt(LocalDateTime.now());
                        rideHistoryRepo.save(history);
                    });

                    return successResponse(d.getName(), d.getMobileNumber(),
                            d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A",
                            distanceKm, fare, surge);
                })
                .orElseGet(() -> errorResponse("No bike available nearby."));
    }

    private RideBookingResponse bookNearestAuto(User user, Location pickup, Location drop,
                                                double distanceKm, double fare, double surge) {
        return autoRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept()))
                .min(Comparator.comparingDouble(d ->
                        distanceService.haversineDistance(user.getLatitude(), user.getLongitude(),
                                d.getLatitude(), d.getLongitude())))
                .map(d -> {
                    d.setUserOtp(user.getOtp());
                    d.setIsAvailable(FlagTypeEnum.N);
                    autoRepo.save(d);

                    if (!verifyOtp(d.getId(), d.getUserOtp(), VehicleTypeEnum.AUTO)) {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        autoRepo.save(d);
                        return errorResponse("OTP Verification Unsuccessful. Ride is canceled.");
                    }

                    user.setIsRiding(FlagTypeEnum.Y);
                    userRepo.save(user);

                    RideHistory history = saveRideHistory(user, pickup, drop, distanceKm, fare, surge,
                            VehicleTypeEnum.AUTO, d.getName(), d.getMobileNumber(),
                            d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A");

                    scheduleRideCompletion(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        d.setLatitude(drop.getLatitude());
                        d.setLongitude(drop.getLongitude());
                        autoRepo.save(d);

                        user.setIsRiding(FlagTypeEnum.N);
                        user.setLatitude(drop.getLatitude());
                        user.setLongitude(drop.getLongitude());
                        userRepo.save(user);

                        history.setStatus("COMPLETED");
                        history.setCompletedAt(LocalDateTime.now());
                        rideHistoryRepo.save(history);
                    });

                    return successResponse(d.getName(), d.getMobileNumber(),
                            d.getVehicle() != null ? d.getVehicle().getVehicleNumber() : "N/A",
                            distanceKm, fare, surge);
                })
                .orElseGet(() -> errorResponse("No auto available nearby."));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // OTP Verification via internal API call
    // ──────────────────────────────────────────────────────────────────────────

    private boolean verifyOtp(Long driverId, Integer otp, VehicleTypeEnum vehicleType) {
        try {
            OtpVerificationRequest req = new OtpVerificationRequest();
            req.setDriverId(driverId);
            req.setOtp(otp);
            req.setVehicleType(vehicleType);

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<OtpVerificationRequest> entity = new HttpEntity<>(req, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    Constants.url, entity, String.class);

            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            log.error("OTP verification failed: {}", e.getMessage());
            // Fail gracefully — allow ride if OTP endpoint is down
            return true;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Ride History helpers
    // ──────────────────────────────────────────────────────────────────────────

    private RideHistory saveRideHistory(User user, Location pickup, Location drop,
                                        double distanceKm, double fare, double surge,
                                        VehicleTypeEnum vehicleType, String driverName,
                                        String driverPhone, String vehicleNumber) {
        RideHistory history = RideHistory.builder()
                .userId(user.getId())
                .userPhone(user.getPhoneNumber())
                .driverName(driverName)
                .driverPhone(driverPhone)
                .vehicleNumber(vehicleNumber)
                .vehicleType(vehicleType)
                .pickupAddress(pickup.getAddress())
                .pickupLat(pickup.getLatitude())
                .pickupLng(pickup.getLongitude())
                .dropAddress(drop.getAddress())
                .dropLat(drop.getLatitude())
                .dropLng(drop.getLongitude())
                .distanceKm(Math.round(distanceKm * 10.0) / 10.0)
                .fare(fare)
                .surgeMultiplier(surge)
                .bookedAt(LocalDateTime.now())
                .status("IN_PROGRESS")
                .build();

        return rideHistoryRepo.save(history);
    }

    private void scheduleRideCompletion(Runnable task) {
        scheduler.schedule(task, 30, TimeUnit.SECONDS);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Response builders
    // ──────────────────────────────────────────────────────────────────────────

    private RideBookingResponse successResponse(String driverName, String driverPhone,
                                                String vehicleNumber, double distanceKm,
                                                double fare, double surge) {
        RideBookingResponse r = new RideBookingResponse();
        r.setMessage("Ride booked successfully!");
        r.setDriverName(driverName);
        r.setDriverMobileNumber(driverPhone);
        r.setVehicleNumber(vehicleNumber);
        r.setDistanceKm(Math.round(distanceKm * 10.0) / 10.0);
        r.setFareAndCost((long) fare);
        r.setSurgeMultiplier(surge);
        r.setStatus("IN_PROGRESS");
        return r;
    }

    private RideBookingResponse errorResponse(String message) {
        RideBookingResponse r = new RideBookingResponse();
        r.setMessage(message);
        return r;
    }
}
