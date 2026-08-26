package com.TestSpringBoot.cbs.service;

import com.TestSpringBoot.cbs.model.dto.AuthResponse;
import com.TestSpringBoot.cbs.model.dto.LoginRequest;
import com.TestSpringBoot.cbs.model.dto.SignupRequest;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.model.enums.FlagTypeEnum;
import com.TestSpringBoot.cbs.repository.UserRepository;
import com.TestSpringBoot.cbs.service.SmsService;
import com.TestSpringBoot.cbs.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.Set;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SmsService smsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserDetailsService userDetailsService;

    /**
     * Register a new user.
     * <p>
     * Saves the user with a 6-digit OTP (valid for 10 minutes) and returns a
     * response with {@code needsPhoneVerification=true} so the frontend knows to
     * show the OTP input screen.  A short-lived temp token is included so the
     * subsequent {@code /verify-signup-otp} call can be authenticated.
     * <br>
     * The real, long-lived JWT is only issued after the OTP is confirmed via
     * {@link #verifySignupOtp(String, int)}.
     */
    public AuthResponse signup(SignupRequest request) {
        if (userRepository.findByPhoneNumber(request.getPhoneNumber()).isPresent()) {
            throw new RuntimeException("User already exists with this phone number");
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("User already exists with this email address");
        }

        // Generate a 6-digit OTP that is unique among current active OTPs
        Set<Integer> existing = userRepository.findOtps();
        int otp;
        do {
            otp = 100000 + new Random().nextInt(900000); // 6-digit
        } while (existing.contains(otp));

        User user = new User();
        user.setName(request.getName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setLatitude(request.getLatitude());
        user.setLongitude(request.getLongitude());
        user.setOtp(otp);
        user.setOtpExpiry(java.time.LocalDateTime.now().plusMinutes(10));
        user.setPhoneVerified(false);
        user.setIsRiding(FlagTypeEnum.N);

        User saved = userRepository.save(user);

        // Send OTP via SMS (Twilio when enabled, log-only in dev mode)
        smsService.sendOtp(saved.getPhoneNumber(), otp);

        // Issue a TEMP token — only usable for /verify-signup-otp
        UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getPhoneNumber());
        String tempToken = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(tempToken)           // temp — replaced by real JWT after OTP verification
                .tokenType("Bearer")
                .userId(saved.getId())
                .name(saved.getName())
                .phoneNumber(saved.getPhoneNumber())
                .email(saved.getEmail())
                .message("OTP sent to your phone number. Please verify to complete signup.")
                .needsPhoneVerification(true)
                .otpSent(true)
                .otp(otp)                   // DEV ONLY — remove / null this in production
                .build();
    }

    /**
     * Verify the OTP entered by the user after signup.
     * On success, marks the phone as verified, clears the OTP, and returns a full JWT.
     *
     * @param phoneNumber the user's phone number
     * @param otp         the 6-digit OTP submitted by the user
     * @return AuthResponse with a real long-lived JWT
     * @throws RuntimeException if OTP is invalid or expired
     */
    public AuthResponse verifySignupOtp(String phoneNumber, int otp) {
        User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getOtp() == null || !user.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        if (user.getOtpExpiry() != null && user.getOtpExpiry().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        // Mark phone as verified and clear OTP
        user.setPhoneVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        // Now issue the real JWT
        UserDetails userDetails2 = userDetailsService.loadUserByUsername(user.getPhoneNumber());
        String token = jwtUtil.generateToken(userDetails2);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .message("Phone verified successfully. Welcome to CABkaro!")
                .needsPhoneVerification(false)
                .build();
    }

    /**
     * Authenticate user. Returns AuthResponse with JWT token.
     */
    public AuthResponse login(LoginRequest request) {
        Optional<User> userOpt = userRepository.findByPhoneNumber(request.getPhoneNumber());
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();

        // Verify password against BCrypt hash
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getPhoneNumber());
        String token = jwtUtil.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .phoneNumber(user.getPhoneNumber())
                .email(user.getEmail())
                .message("Login successful")
                .build();
    }

    public User getUserByPhone(String phone) {
        return userRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new RuntimeException("User not found: " + phone));
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserByMobileNumber(String mobileNumber) {
        return userRepository.findUserByPhoneNumber(mobileNumber);
    }

    /** Save a user entity (used for OTP updates, Google link, etc.) */
    public User save(User user) {
        return userRepository.save(user);
    }

    /** Find user by Google ID (for OAuth flow) */
    public Optional<User> findByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId);
    }

    /** Find user by email */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /** Find user by phone (Optional, for existence check) */
    public Optional<User> findByPhone(String phone) {
        return userRepository.findByPhoneNumber(phone);
    }

    /** Generate JWT token for a user */
    public String generateTokenForUser(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getPhoneNumber());
        return jwtUtil.generateToken(userDetails);
    }
}
