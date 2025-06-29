package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.dto.OtpVerificationRequest;
import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import com.TestSpringBoot.cbs.repository.BikeDriverRepository;
import com.TestSpringBoot.cbs.repository.CabDriverRepository;
import com.TestSpringBoot.cbs.repository.ThreeWheelerDriverRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Driver;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/otp")
public class OtpVerificationController {

    @Autowired
    private CabDriverRepository carRepo;

    @Autowired
    private BikeDriverRepository bikeRepo;

    @Autowired
    private ThreeWheelerDriverRepository autoRepo;

    @PostMapping("/verify-otp")
    public ResponseEntity<String> verifyOtp(@RequestBody OtpVerificationRequest req) {
        if (req.getOtp() == null || req.getDriverId() == null || req.getVehicleType() == null) {
            return ResponseEntity.badRequest().body("OTP, Driver ID, and Vehicle Type are required.");
        }

        return switch (req.getVehicleType()) {
            case AUTO -> verifyDriverOtp(req, autoRepo);
            case BIKE -> verifyDriverOtp(req, bikeRepo);
            case CAB  -> verifyDriverOtp(req, carRepo);
        };
    }

    private ResponseEntity<String> verifyDriverOtp(OtpVerificationRequest req, JpaRepository<?, Long> repo) {
        return repo.findById(req.getDriverId())
                .map(driver -> {
                    try {
                        Integer userOtp = (Integer) driver.getClass().getMethod("getUserOtp").invoke(driver);

                        if (Objects.equals(userOtp, req.getOtp())) {
                            return ResponseEntity.ok("OTP Verified");
                        } else {
                            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid OTP");
                        }
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error accessing OTP: " + e.getMessage());
                    }
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body("Driver not found"));
    }
}
