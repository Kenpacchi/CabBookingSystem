package com.TestSpringBoot.cbs.service;

import com.TestSpringBoot.cbs.model.dto.Location;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * Calculates distance between two lat/lng coordinates.
 *
 * Strategy:
 *  1. If google.maps.api.key is configured → call Google Maps Distance Matrix API.
 *  2. Fallback → Haversine formula (great-circle distance).
 */
@Service
public class DistanceService {

    private static final Logger log = LoggerFactory.getLogger(DistanceService.class);

    /** Earth radius in kilometers */
    private static final double EARTH_RADIUS_KM = 6371.0;

    @Value("${google.maps.api.key:}")
    private String googleMapsApiKey;

    private final WebClient webClient;

    public DistanceService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("https://maps.googleapis.com")
                .build();
    }

    /**
     * Returns driving distance in kilometres between pickup and drop.
     * Uses Google Maps API when a key is available, else falls back to Haversine.
     */
    public double getDistanceKm(Location pickup, Location drop) {
        if (googleMapsApiKey != null && !googleMapsApiKey.isBlank()) {
            try {
                return getGoogleMapsDistance(pickup, drop);
            } catch (Exception e) {
                log.warn("Google Maps API call failed, using Haversine fallback: {}", e.getMessage());
            }
        }
        return haversineDistance(pickup, drop);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Google Maps Distance Matrix API
    // ──────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private double getGoogleMapsDistance(Location pickup, Location drop) {
        String origins = pickup.getLatitude() + "," + pickup.getLongitude();
        String destinations = drop.getLatitude() + "," + drop.getLongitude();

        String uri = UriComponentsBuilder
                .fromPath("/maps/api/distancematrix/json")
                .queryParam("origins", origins)
                .queryParam("destinations", destinations)
                .queryParam("mode", "driving")
                .queryParam("units", "metric")
                .queryParam("key", googleMapsApiKey)
                .build()
                .toUriString();

        Map<String, Object> response = webClient.get()
                .uri(uri)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) throw new RuntimeException("Empty response from Google Maps");

        String status = (String) response.get("status");
        if (!"OK".equals(status)) throw new RuntimeException("Google Maps API status: " + status);

        // Parse: rows[0].elements[0].distance.value (metres)
        java.util.List<Map<String, Object>> rows =
                (java.util.List<Map<String, Object>>) response.get("rows");
        java.util.List<Map<String, Object>> elements =
                (java.util.List<Map<String, Object>>) rows.get(0).get("elements");
        Map<String, Object> element = elements.get(0);

        String elemStatus = (String) element.get("status");
        if (!"OK".equals(elemStatus)) throw new RuntimeException("Element status: " + elemStatus);

        Map<String, Object> distance = (Map<String, Object>) element.get("distance");
        int metres = ((Number) distance.get("value")).intValue();

        return metres / 1000.0; // convert to km
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Haversine Formula (straight-line great-circle distance)
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Computes the great-circle distance between two points (in km).
     * Slightly inflated by 1.3× to approximate road distance.
     */
    public double haversineDistance(Location a, Location b) {
        double dLat = Math.toRadians(b.getLatitude() - a.getLatitude());
        double dLon = Math.toRadians(b.getLongitude() - a.getLongitude());

        double sinLat = Math.sin(dLat / 2);
        double sinLon = Math.sin(dLon / 2);

        double h = sinLat * sinLat
                + Math.cos(Math.toRadians(a.getLatitude()))
                * Math.cos(Math.toRadians(b.getLatitude()))
                * sinLon * sinLon;

        double straightLineKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));

        // Road-distance approximation factor (~1.3 for urban areas)
        return straightLineKm * 1.3;
    }

    /**
     * Compute Haversine distance directly from entity lat/lng values.
     */
    public double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        Location a = new Location(null, lat1, lon1);
        Location b = new Location(null, lat2, lon2);
        return haversineDistance(a, b);
    }
}
