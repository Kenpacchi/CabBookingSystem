package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.dto.AuthResponse;
import com.TestSpringBoot.cbs.model.dto.LoginRequest;
import com.TestSpringBoot.cbs.model.dto.SignupRequest;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.security.JwtUtil;
import com.TestSpringBoot.cbs.service.SmsService;
import com.TestSpringBoot.cbs.service.UserService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private SmsService smsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * POST /api/auth/signup
     * Register a new user and return JWT token.
     */
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        try {
            AuthResponse response = userService.signup(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            AuthResponse errorResp = new AuthResponse();
            errorResp.setMessage(e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResp);
        }
    }

    /**
     * POST /api/auth/login
     * Authenticate user and return JWT token.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = userService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            AuthResponse errorResp = new AuthResponse();
            errorResp.setMessage(e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResp);
        }
    }

    /**
     * POST /api/auth/verify-signup-otp
     * Body: { phoneNumber, otp }
     * Called after normal form signup to confirm the phone number.
     * Validates the OTP, marks the phone as verified, clears the OTP, and
     * returns a real long-lived JWT so the user is logged in immediately.
     */
    @PostMapping("/verify-signup-otp")
    public ResponseEntity<AuthResponse> verifySignupOtp(@RequestBody Map<String, Object> body) {
        String phone = (String) body.get("phoneNumber");
        int otp;
        try {
            otp = Integer.parseInt(body.get("otp").toString());
        } catch (Exception e) {
            AuthResponse err = new AuthResponse();
            err.setMessage("Invalid OTP format");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        try {
            AuthResponse response = userService.verifySignupOtp(phone, otp);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            AuthResponse err = new AuthResponse();
            err.setMessage(e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }
    }

    /**
     * POST /api/auth/send-otp
     * Body: { phoneNumber }
     * Generates a 6-digit OTP, stores it on the user with a 10-minute expiry,
     * and returns it in the response (dev mode — remove otp field in production).
     */
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, String> body) {
        String phone = body.get("phoneNumber");
        User user;
        try {
            user = userService.getUserByPhone(phone);
        } catch (RuntimeException ex) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", false);
            resp.put("message", "User not found. Please signup first.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(resp);
        }

        int otp = (int) (Math.random() * 900000) + 100000;
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        userService.save(user);

        // Send OTP via SMS (Twilio when enabled, log-only in dev mode)
        smsService.sendOtp(phone, otp);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "OTP sent to " + phone);
        resp.put("otp", otp); // REMOVE this field in production
        return ResponseEntity.ok(resp);
    }

    /**
     * POST /api/auth/verify-otp
     * Body: { phoneNumber, otp }
     * Validates the OTP, marks phone as verified, clears OTP, and returns a JWT.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, Object> body) {
        String phone = (String) body.get("phoneNumber");
        int otp = Integer.parseInt(body.get("otp").toString());

        User user;
        try {
            user = userService.getUserByPhone(phone);
        } catch (RuntimeException ex) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "User not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
        }

        if (user.getOtp() == null || !user.getOtp().equals(otp)) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Invalid OTP");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        if (user.getOtpExpiry() != null && user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "OTP expired");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setPhoneVerified(true);
        userService.save(user);

        UserDetails userDetails = userDetailsService.loadUserByUsername(phone);
        String token = jwtUtil.generateToken(userDetails);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("token", token);
        resp.put("name", user.getName());
        resp.put("phoneNumber", phone);
        resp.put("email", user.getEmail());
        resp.put("userId", user.getId());
        return ResponseEntity.ok(resp);
    }

    /**
     * POST /api/auth/google-callback
     * Body: { googleId, name, email, picture }
     * - Returning user (has a real phone already) → return JWT immediately
     * - New / phone-less user → return { needsPhone:true, tempToken } so the
     *   frontend can show the phone-collection screen and call /save-phone
     */
    @PostMapping("/google-callback")
    public ResponseEntity<Map<String, Object>> googleCallback(@RequestBody Map<String, String> body) {
        String googleId = body.get("googleId");
        String email    = body.get("email");
        String name     = body.get("name");

        Map<String, Object> resp = new HashMap<>();

        // Find existing user by googleId, then by email
        User user = userService.findByGoogleId(googleId)
                .or(() -> userService.findByEmail(email))
                .orElse(null);

        if (user == null) {
            // Brand-new Google user — create account with placeholder phone
            user = new User();
            user.setName(name != null ? name : "User");
            user.setEmail(email);
            user.setGoogleId(googleId);
            user.setPassword(passwordEncoder.encode(googleId + "_google_oauth"));
            user.setPhoneNumber("g_" + googleId); // placeholder, replaced by /save-phone
            user.setPhoneVerified(false);
            user.setIsRiding(com.TestSpringBoot.cbs.model.enums.FlagTypeEnum.N);
            user = userService.save(user);
        } else {
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                user = userService.save(user);
            }
        }

        // If the phone is still a placeholder → ask frontend to collect a real number
        boolean needsPhone = user.getPhoneNumber() == null
                || user.getPhoneNumber().startsWith("g_");

        if (needsPhone) {
            String tempToken = jwtUtil.generateToken(
                    userDetailsService.loadUserByUsername(user.getPhoneNumber()));
            resp.put("needsPhone", true);
            resp.put("tempToken", tempToken);
            resp.put("name", user.getName());
            resp.put("email", user.getEmail());
            resp.put("userId", user.getId());
            return ResponseEntity.ok(resp);
        }

        // Fully set up — return real JWT
        String token = userService.generateTokenForUser(user);
        resp.put("needsPhone", false);
        resp.put("token", token);
        resp.put("name", user.getName());
        resp.put("phoneNumber", user.getPhoneNumber());
        resp.put("email", user.getEmail());
        resp.put("userId", user.getId());
        return ResponseEntity.ok(resp);
    }

    /**
     * POST /api/auth/save-phone
     * Body: { phoneNumber }
     * Called after Google OAuth to attach a real phone number to the account.
     * No OTP — phone is saved directly. Phone must be unique across all users.
     * Requires the tempToken (from /google-callback) as Bearer token.
     */
    @PostMapping("/save-phone")
    public ResponseEntity<Map<String, Object>> savePhone(@RequestBody Map<String, String> body) {
        String phone = body.get("phoneNumber");

        if (phone == null || phone.trim().length() < 10) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Enter a valid 10-digit phone number"));
        }
        phone = phone.trim();

        // Identify the current user from the JWT subject (= placeholder phone "g_<googleId>")
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName(); // "g_<googleId>"

        User user = userService.findByPhone(currentUsername).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "Session expired. Please try Google sign-up again."));
        }

        // Make sure phone is not already taken by another account
        final User self = user;
        if (userService.findByPhone(phone).filter(u -> !u.getId().equals(self.getId())).isPresent()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "This phone number is already registered. Please log in instead."));
        }

        // Save the real phone number
        user.setPhoneNumber(phone);
        user.setPhoneVerified(false); // not OTP-verified, but stored
        userService.save(user);

        // Issue a real JWT using the new phone as subject
        String token = userService.generateTokenForUser(user);

        return ResponseEntity.ok(Map.of(
                "success",     true,
                "token",       token,
                "name",        user.getName(),
                "email",       user.getEmail(),
                "phoneNumber", phone,
                "userId",      user.getId()
        ));
    }

    /**
     * POST /api/auth/link-phone
     * Body: { phoneNumber }
     * Called after Google OAuth when user still needs to provide their phone.
     * Links phone to Google account and sends OTP.
     * Requires JWT (the tempToken from /google-callback).
     */
    @PostMapping("/link-phone")
    public ResponseEntity<Map<String, Object>> linkPhone(@RequestBody Map<String, String> body) {
        String phone = body.get("phoneNumber");

        // Get current user from JWT
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth.getName();

        User user;
        try {
            user = userService.getUserByPhone(currentUsername);
        } catch (RuntimeException ex) {
            // JWT subject may be a GOOGLE_<id> placeholder phone — look up by that phone string
            user = userService.findByPhone(currentUsername).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "message", "Session expired. Please try again."));
            }
        }

        // Check if this phone is already taken by another user (use final ref for lambda)
        final User finalUser = user;
        if (userService.findByPhone(phone).filter(u -> !u.getId().equals(finalUser.getId())).isPresent()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "Phone number already registered"));
        }

        // Link phone and send OTP
        user.setPhoneNumber(phone);
        int otp = (int) (Math.random() * 900000) + 100000;
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        userService.save(user);

        // Send OTP via SMS (Twilio when enabled, log-only in dev mode)
        smsService.sendOtp(phone, otp);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "OTP sent to " + phone);
        resp.put("otp", otp); // REMOVE in production
        return ResponseEntity.ok(resp);
    }
}
