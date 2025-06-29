package com.TestSpringBoot.cbs.service;
import com.TestSpringBoot.cbs.common.Constants;
import com.TestSpringBoot.cbs.model.dto.Location;
import com.TestSpringBoot.cbs.model.dto.OtpVerificationRequest;
import com.TestSpringBoot.cbs.model.dto.RideBookingResponse;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import com.TestSpringBoot.cbs.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Comparator;
import java.util.InputMismatchException;
import java.util.Scanner;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class BookingService {

    @Autowired
    private CabDriverRepository cabRepo;
    @Autowired
    private BikeDriverRepository bikeRepo;
    @Autowired
    private ThreeWheelerDriverRepository autoRepo;
    @Autowired
    private UserRepository userRepo;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    public RideBookingResponse bookRide(User user, Location drop, VehicleTypeEnum vehicleType) {
        long cost = (Math.abs(user.getX() - drop.getX()) + Math.abs(user.getY() - drop.getY())) * 10L;
        RideBookingResponse bookingResponse;

        return switch (vehicleType) {
            case CAB -> bookNearestCab(user, cost, drop);
            case BIKE -> bookNearestBike(user, cost, drop);
            case AUTO -> bookNearestAuto(user, cost, drop);
            default -> {
                bookingResponse = new RideBookingResponse();
                bookingResponse.setMessage("Invalid vehicle type");
                yield bookingResponse;
            }
        };
    }

    private RideBookingResponse bookNearestCab(User user, long cost, Location drop) {
        long cabCost = 3 * cost;
        return cabRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setUserOtp(user.getOtp());
                    d.setIsAvailable(FlagTypeEnum.N);
                    cabRepo.save(d);

                    OtpVerificationRequest otpVerificationRequest = new OtpVerificationRequest();

                    otpVerificationRequest.setDriverId(d.getId());
                    otpVerificationRequest.setOtp(d.getUserOtp());
                    otpVerificationRequest.setVehicleType(VehicleTypeEnum.CAB);

                    RestTemplate restTemplate = new RestTemplate();
                    String url = Constants.url;

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);

                    HttpEntity<OtpVerificationRequest> requestEntity = new HttpEntity<>(otpVerificationRequest, headers);

                    ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

                    if (response.getStatusCode() != HttpStatus.OK) {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        cabRepo.save(d);

                        RideBookingResponse bookingResponse = new RideBookingResponse();
                        bookingResponse.setMessage("OTP Verification Unsuccessful. Ride is canceled.");
                        return bookingResponse;
                    }

                    user.setIsRiding(FlagTypeEnum.Y);
                    userRepo.save(user);

                    scheduleDriverAvailable(() -> {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        d.setX(drop.getX());
                        d.setY(drop.getY());
                        cabRepo.save(d);
                        user.setIsRiding(FlagTypeEnum.N);
                        user.setX(drop.getX());
                        user.setY(drop.getY());
                        userRepo.save(user);
                    });

                    RideBookingResponse successResponse = new RideBookingResponse();
                    successResponse.setCost(cabCost);
                    successResponse.setDriverName(d.getName());
                    successResponse.setDriverMobileNumber(d.getMobileNumber());
                    successResponse.setVehicleNumber(d.getVehicle().getVehicleNumber());
                    successResponse.setMessage("SUCCESS!!");
                    return successResponse;
                })
                .orElseGet(() -> {
                    RideBookingResponse response = new RideBookingResponse();
                    response.setMessage("No driver available.");
                    return response;
                });
    }

    private RideBookingResponse bookNearestBike(User user, long cost, Location drop) {
        return bikeRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept())).min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setUserOtp(user.getOtp());
                    d.setIsAvailable(FlagTypeEnum.N);
                    bikeRepo.save(d);

                    OtpVerificationRequest otpVerificationRequest = new OtpVerificationRequest();

                    otpVerificationRequest.setDriverId(d.getId());
                    otpVerificationRequest.setOtp(d.getUserOtp());
                    otpVerificationRequest.setVehicleType(VehicleTypeEnum.BIKE);

                    RestTemplate restTemplate = new RestTemplate();
                    String url = Constants.url;

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);

                    HttpEntity<OtpVerificationRequest> requestEntity = new HttpEntity<>(otpVerificationRequest, headers);

                    ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

                    if (response.getStatusCode() != HttpStatus.OK) {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        bikeRepo.save(d);

                        RideBookingResponse bookingResponse = new RideBookingResponse();
                        bookingResponse.setMessage("OTP Verification Unsuccessful. Ride is canceled.");
                        return bookingResponse;
                    }

                    user.setIsRiding(FlagTypeEnum.Y);
                    userRepo.save(user);

                    scheduleDriverAvailable(() -> {
                        user.setIsRiding(FlagTypeEnum.N);
                        user.setX(drop.getX());
                        user.setY(drop.getY());
                        userRepo.save(user);
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        d.setX(drop.getX());
                        d.setY(drop.getY());
                        bikeRepo.save(d);
                    });

                    RideBookingResponse successResponse = new RideBookingResponse();
                    successResponse.setCost(cost);
                    successResponse.setDriverName(d.getName());
                    successResponse.setDriverMobileNumber(d.getMobileNumber());
                    successResponse.setVehicleNumber(d.getVehicle().getVehicleNumber());
                    successResponse.setMessage("SUCCESS!!");
                    return successResponse;
                })
                .orElseGet(() -> {
                    RideBookingResponse response = new RideBookingResponse();
                    response.setMessage("No driver available.");
                    return response;
                });
    }

    private RideBookingResponse bookNearestAuto(User user, long cost, Location drop) {
        long autoCost = cost * 2;

        return autoRepo.findAll().stream()
                .filter(d -> d.getIsAvailable() == FlagTypeEnum.Y && Boolean.TRUE.equals(d.getAccept()))
                .min(Comparator.comparingInt(d -> manhattan(user.getX(), user.getY(), d.getX(), d.getY())))
                .map(d -> {
                    d.setUserOtp(user.getOtp());
                    d.setIsAvailable(FlagTypeEnum.N);
                    autoRepo.save(d);

                    OtpVerificationRequest otpVerificationRequest = new OtpVerificationRequest();

                    otpVerificationRequest.setDriverId(d.getId());
                    otpVerificationRequest.setOtp(d.getUserOtp());
                    otpVerificationRequest.setVehicleType(VehicleTypeEnum.AUTO);

                    RestTemplate restTemplate = new RestTemplate();
                    String url = Constants.url;

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);

                    HttpEntity<OtpVerificationRequest> requestEntity = new HttpEntity<>(otpVerificationRequest, headers);

                    ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

                    if (response.getStatusCode() != HttpStatus.OK) {
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        autoRepo.save(d);

                        RideBookingResponse bookingResponse = new RideBookingResponse();
                        bookingResponse.setMessage("OTP Verification Unsuccessful. Ride is canceled.");
                        return bookingResponse;
                    }

                    user.setIsRiding(FlagTypeEnum.Y);
                    userRepo.save(user);

                    scheduleDriverAvailable(() -> {
                        user.setIsRiding(FlagTypeEnum.N);
                        user.setX(drop.getX());
                        user.setY(drop.getY());
                        userRepo.save(user);
                        d.setIsAvailable(FlagTypeEnum.Y);
                        d.setUserOtp(null);
                        d.setX(drop.getX());
                        d.setY(drop.getY());
                        autoRepo.save(d);
                    });

                    RideBookingResponse successResponse = new RideBookingResponse();
                    successResponse.setCost(autoCost);
                    successResponse.setDriverName(d.getName());
                    successResponse.setDriverMobileNumber(d.getMobileNumber());
                    successResponse.setVehicleNumber(d.getVehicle().getVehicleNumber());
                    successResponse.setMessage("SUCCESS!!");
                    return successResponse;
                })
                .orElseGet(() -> {
            RideBookingResponse response = new RideBookingResponse();
            response.setMessage("No driver available.");
            return response;
        });
    }

    private int manhattan(int ux, int uy, int dx, int dy) {
        return Math.abs(ux - dx) + Math.abs(uy - dy);
    }

    private void scheduleDriverAvailable(Runnable task) {
        scheduler.schedule(task, 30, TimeUnit.SECONDS); // or desired delay
    }
}
