package com.TestSpringBoot.cbs.service;

import com.TestSpringBoot.cbs.model.enums.VehicleTypeEnum;
import org.springframework.stereotype.Service;

import java.time.LocalTime;

/**
 * Rapido-like fare calculation.
 *
 * Pricing model:
 *  Total Fare = (baseFare + distanceKm × perKmRate) × surgeMultiplier
 *
 * Vehicle rates (approx. Indian market prices, in INR):
 *  BIKE  : base ₹20 + ₹9/km
 *  AUTO  : base ₹30 + ₹13/km
 *  CAB   : base ₹50 + ₹18/km
 *
 * Surge multiplier (demand-based):
 *  - Peak hours  (8–10 AM, 5–9 PM) → 1.5×
 *  - Late night  (11 PM – 5 AM)    → 1.3×
 *  - Otherwise                     → 1.0×
 */
@Service
public class FareCalculatorService {

    // ── Per-vehicle base fares (INR) ──────────────────────────────────────────
    private static final double BIKE_BASE_FARE  = 20.0;
    private static final double AUTO_BASE_FARE  = 30.0;
    private static final double CAB_BASE_FARE   = 50.0;

    // ── Per-km rates (INR/km) ─────────────────────────────────────────────────
    private static final double BIKE_PER_KM  = 9.0;
    private static final double AUTO_PER_KM  = 13.0;
    private static final double CAB_PER_KM   = 18.0;

    // ── Minimum fare ─────────────────────────────────────────────────────────
    private static final double BIKE_MIN_FARE = 30.0;
    private static final double AUTO_MIN_FARE = 40.0;
    private static final double CAB_MIN_FARE  = 70.0;

    /**
     * Calculate the fare for a ride.
     *
     * @param vehicleType  CAB / BIKE / AUTO
     * @param distanceKm   Distance of the trip in kilometres
     * @return             Rounded fare in INR
     */
    public double calculateFare(VehicleTypeEnum vehicleType, double distanceKm) {
        double baseFare  = getBaseFare(vehicleType);
        double perKmRate = getPerKmRate(vehicleType);
        double minFare   = getMinFare(vehicleType);
        double surge     = getSurgeMultiplier();

        double rawFare = (baseFare + distanceKm * perKmRate) * surge;
        double finalFare = Math.max(rawFare, minFare);

        // Round to nearest rupee
        return Math.round(finalFare);
    }

    /**
     * Get surge multiplier based on time of day.
     */
    public double getSurgeMultiplier() {
        LocalTime now = LocalTime.now();
        int hour = now.getHour();

        // Morning peak: 8 AM – 10 AM
        if (hour >= 8 && hour < 10) return 1.5;
        // Evening peak: 5 PM – 9 PM
        if (hour >= 17 && hour < 21) return 1.5;
        // Late night: 11 PM – 5 AM
        if (hour >= 23 || hour < 5) return 1.3;

        return 1.0;
    }

    /**
     * Returns estimated fare range (min, max) for display before booking.
     */
    public FareEstimate estimateFare(VehicleTypeEnum vehicleType, double distanceKm) {
        double baseFare  = getBaseFare(vehicleType);
        double perKmRate = getPerKmRate(vehicleType);
        double minFare   = getMinFare(vehicleType);

        double normalFare = Math.max(baseFare + distanceKm * perKmRate, minFare);
        double surgeFare  = Math.round(normalFare * 1.5);
        normalFare = Math.round(normalFare);

        return new FareEstimate(normalFare, surgeFare, getSurgeMultiplier());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private double getBaseFare(VehicleTypeEnum type) {
        return switch (type) {
            case BIKE -> BIKE_BASE_FARE;
            case AUTO -> AUTO_BASE_FARE;
            case CAB  -> CAB_BASE_FARE;
        };
    }

    private double getPerKmRate(VehicleTypeEnum type) {
        return switch (type) {
            case BIKE -> BIKE_PER_KM;
            case AUTO -> AUTO_PER_KM;
            case CAB  -> CAB_PER_KM;
        };
    }

    private double getMinFare(VehicleTypeEnum type) {
        return switch (type) {
            case BIKE -> BIKE_MIN_FARE;
            case AUTO -> AUTO_MIN_FARE;
            case CAB  -> CAB_MIN_FARE;
        };
    }

    /**
     * Immutable value object for fare estimate response.
     */
    public record FareEstimate(double normalFare, double surgeFare, double currentSurge) {}
}
