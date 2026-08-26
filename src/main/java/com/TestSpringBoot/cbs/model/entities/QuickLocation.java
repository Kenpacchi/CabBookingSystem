package com.TestSpringBoot.cbs.model.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A saved "quick location" for a user (e.g. Home, Work, Hospital, etc.)
 * Stored as lat/lng + a display address string + a label.
 */
@Entity
@Table(name = "quick_locations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuickLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The user who owns this location (by phone number) */
    @Column(name = "user_phone", nullable = false)
    private String userPhone;

    /**
     * Label: HOME | WORK | GYM | SCHOOL | HOSPITAL | MARKET | OTHER
     * Used as a unique key per user — only one of each type.
     */
    @Column(nullable = false, length = 20)
    private String label;

    /** Human-readable address (reverse-geocoded or entered manually) */
    @Column(name = "address", length = 300)
    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;
}
