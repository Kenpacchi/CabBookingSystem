package com.TestSpringBoot.cbs.common;

public interface Constants {
    // OTP verify endpoint — uses env var on Railway, falls back to localhost for dev
    String url = System.getenv("RAILWAY_PUBLIC_DOMAIN") != null
            ? "https://" + System.getenv("RAILWAY_PUBLIC_DOMAIN") + "/otp/verify-otp"
            : "http://localhost:8080/otp/verify-otp";
}
