package com.TestSpringBoot.cbs.model.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * RideReport — stores a user's complaint/feedback about a completed ride.
 *
 * Categories:
 *   MISBEHAVIOUR        – Driver misbehaved / rude behaviour
 *   EXTRA_CHARGE        – Charged more than the estimated fare
 *   NO_HELMET           – Bike driver did not wear helmet
 *   LOST_ITEM           – User left something in the vehicle
 *   WRONG_DROP          – Dropped at wrong location
 *   OTHER               – Any other issue
 *
 * status:
 *   OPEN       – just submitted, not yet reviewed
 *   IN_REVIEW  – admin is looking into it
 *   RESOLVED   – resolved and reply sent
 */
@Entity
@Table(name = "ride_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Linked ride ──────────────────────────────────────────────────────────
    @Column(name = "ride_id", nullable = false)
    private Long rideId;

    // ── Reporter ─────────────────────────────────────────────────────────────
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_phone")
    private String userPhone;

    @Column(name = "user_name")
    private String userName;

    // ── Driver snapshot ──────────────────────────────────────────────────────
    @Column(name = "driver_name")
    private String driverName;

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    // ── Report content ───────────────────────────────────────────────────────
    /**
     * Issue category: MISBEHAVIOUR | EXTRA_CHARGE | NO_HELMET | LOST_ITEM | WRONG_DROP | OTHER
     */
    @Column(name = "category", nullable = false, length = 30)
    private String category;

    /** Short one-liner the user types (optional) */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // ── Auto-drafted reply (generated server-side) ───────────────────────────
    @Column(name = "drafted_reply", columnDefinition = "TEXT")
    private String draftedReply;

    // ── Admin response ───────────────────────────────────────────────────────
    @Column(name = "admin_reply", columnDefinition = "TEXT")
    private String adminReply;

    // ── Status ───────────────────────────────────────────────────────────────
    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "OPEN";

    // ── Timestamps ───────────────────────────────────────────────────────────
    @Column(name = "reported_at")
    private LocalDateTime reportedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
