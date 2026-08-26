package com.TestSpringBoot.cbs.model.entities;

import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ride_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Rider
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_phone")
    private String userPhone;

    // Driver info (snapshot at time of ride)
    @Column(name = "driver_name")
    private String driverName;

    @Column(name = "driver_phone")
    private String driverPhone;

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type")
    private VehicleTypeEnum vehicleType;

    // Route
    @Column(name = "pickup_address")
    private String pickupAddress;

    @Column(name = "pickup_lat")
    private Double pickupLat;

    @Column(name = "pickup_lng")
    private Double pickupLng;

    @Column(name = "drop_address")
    private String dropAddress;

    @Column(name = "drop_lat")
    private Double dropLat;

    @Column(name = "drop_lng")
    private Double dropLng;

    // Fare & distance
    @Column(name = "distance_km")
    private Double distanceKm;

    @Column(name = "fare")
    private Double fare;

    @Column(name = "surge_multiplier")
    private Double surgeMultiplier;

    // Timing
    @Column(name = "booked_at")
    private LocalDateTime bookedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Status: COMPLETED / CANCELLED
    @Column(name = "status")
    private String status;

    @Column
    private Integer rating; // 1-5 stars

    @Column
    private Double tip; // tip amount

    @Column(name = "tip_paid")
    private Boolean tipPaid = false;

    @Column(name = "payment_id")
    private String paymentId; // Razorpay payment ID
}
