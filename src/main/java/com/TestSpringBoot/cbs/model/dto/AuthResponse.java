package com.TestSpringBoot.cbs.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;

    @Builder.Default
    private String tokenType = "Bearer";

    private Long userId;
    private String name;
    private String phoneNumber;
    private String email;
    private String message;

    /**
     * Set to true after normal signup to indicate the user must verify their phone
     * number with the OTP that was sent.  The 'token' field in this case is a
     * short-lived temp token used only for the /verify-signup-otp call.
     */
    @Builder.Default
    private boolean needsPhoneVerification = false;

    /**
     * Set to true when an OTP has been dispatched to the user's phone.
     */
    @Builder.Default
    private boolean otpSent = false;

    /**
     * Dev-mode only: the raw OTP value so the frontend can display it.
     * Remove this field (or always leave null) in production.
     */
    private Integer otp;
}
