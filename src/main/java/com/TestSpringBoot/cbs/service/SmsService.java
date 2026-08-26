package com.TestSpringBoot.cbs.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * SmsService — sends OTP SMS via Twilio.
 *
 * Behaviour:
 *  - twilio.enabled=true  → real SMS sent via Twilio API
 *  - twilio.enabled=false → OTP is only logged (dev / local mode)
 *
 * To enable:
 *  1. Sign up at https://www.twilio.com/try-twilio (free trial)
 *  2. Get Account SID, Auth Token, and a Twilio phone number
 *  3. Set the three values in application.properties
 *  4. Set twilio.enabled=true
 *  5. In trial mode, verify the recipient number first at
 *     https://console.twilio.com/us1/verify/phone-numbers
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${twilio.enabled:false}")
    private boolean twilioEnabled;

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:}")
    private String fromNumber;

    @PostConstruct
    public void init() {
        if (twilioEnabled) {
            if (accountSid.isBlank() || authToken.isBlank() || fromNumber.isBlank()) {
                log.error("Twilio is enabled but credentials are missing in application.properties! " +
                          "SMS will NOT be sent. Set twilio.account-sid, twilio.auth-token, twilio.from-number.");
                twilioEnabled = false;
                return;
            }
            Twilio.init(accountSid, authToken);
            log.info("Twilio SMS service initialized. From number: {}", fromNumber);
        } else {
            log.info("Twilio SMS disabled (twilio.enabled=false). OTPs will be logged only.");
        }
    }

    /**
     * Send an OTP SMS to the given phone number.
     *
     * @param toPhone the recipient's phone number in E.164 format e.g. +919876543210
     * @param otp     the 6-digit OTP to include in the message
     * @return true if SMS was sent (or logged in dev mode), false on error
     */
    public boolean sendOtp(String toPhone, int otp) {
        String message = String.format(
            "Your CABkaro OTP is: %d\nValid for 10 minutes. Do not share this with anyone.", otp
        );

        if (!twilioEnabled) {
            // Dev mode — just log it
            log.info("📱 [DEV MODE] OTP for {}: {}", toPhone, otp);
            return true;
        }

        try {
            // Normalize phone number to E.164 (+91XXXXXXXXXX for India)
            String normalized = normalizePhone(toPhone);

            Message msg = Message.creator(
                new PhoneNumber(normalized),
                new PhoneNumber(fromNumber),
                message
            ).create();

            log.info("SMS sent to {} | SID: {} | Status: {}", toPhone, msg.getSid(), msg.getStatus());
            return true;

        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", toPhone, e.getMessage());
            return false;
        }
    }

    /**
     * Normalize an Indian phone number to E.164 format.
     * Handles: 9876543210, 09876543210, +919876543210
     */
    private String normalizePhone(String phone) {
        if (phone == null) return phone;
        String digits = phone.replaceAll("[^\\d+]", "");

        // Already E.164
        if (digits.startsWith("+")) return digits;

        // Strip leading 0
        if (digits.startsWith("0")) digits = digits.substring(1);

        // 10-digit Indian number → prepend +91
        if (digits.length() == 10) return "+91" + digits;

        // Already has country code (12 digits starting with 91)
        if (digits.length() == 12 && digits.startsWith("91")) return "+" + digits;

        // Return as-is and let Twilio handle the error
        return "+" + digits;
    }
}
