package com.TestSpringBoot.cbs.model.entities;

import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "phone_number", nullable = false, unique = true)
    private String phoneNumber;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    // Geographic coordinates
    @Column
    private Double latitude;

    @Column
    private Double longitude;

    // OTP login
    @Column
    private Integer otp;

    @Column(name = "otp_expiry")
    private LocalDateTime otpExpiry;

    @Column(name = "phone_verified")
    private Boolean phoneVerified = false;

    // Google OAuth
    @Column(name = "google_id")
    private String googleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "is_riding")
    private FlagTypeEnum isRiding = FlagTypeEnum.N;
}
