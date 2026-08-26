package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.entities.QuickLocation;
import com.TestSpringBoot.cbs.model.entities.RideHistory;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.repository.QuickLocationRepository;
import com.TestSpringBoot.cbs.repository.RideHistoryRepository;
import com.TestSpringBoot.cbs.service.UserService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/user")
public class ProfileController {

    @Autowired private UserService userService;
    @Autowired private RideHistoryRepository rideHistoryRepo;
    @Autowired private QuickLocationRepository quickLocationRepo;

    /** GET /api/user/profile — user details + ride stats */
    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getProfile() {
        String phone = getPhone();
        User user = userService.getUserByPhone(phone);
        List<RideHistory> rides = rideHistoryRepo.findByUserIdOrderByBookedAtDesc(user.getId());

        double totalSpent     = rides.stream().mapToDouble(r -> r.getFare()  != null ? r.getFare()  : 0).sum();
        double totalTips      = rides.stream().mapToDouble(r -> r.getTip()   != null ? r.getTip()   : 0).sum();
        long   completedRides = rides.stream().filter(r -> "COMPLETED".equals(r.getStatus())).count();
        double avgRating      = rides.stream()
                .filter(r -> r.getRating() != null)
                .mapToInt(RideHistory::getRating)
                .average().orElse(0.0);

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id",             user.getId());
        profile.put("name",           user.getName());
        profile.put("phoneNumber",    user.getPhoneNumber());
        profile.put("email",          user.getEmail());
        profile.put("latitude",       user.getLatitude());
        profile.put("longitude",      user.getLongitude());
        profile.put("phoneVerified",  user.getPhoneVerified());
        profile.put("totalRides",     (long) rides.size());
        profile.put("completedRides", completedRides);
        profile.put("totalSpent",     Math.round(totalSpent));
        profile.put("totalTips",      Math.round(totalTips));
        profile.put("avgRating",      Math.round(avgRating * 10.0) / 10.0);
        return ResponseEntity.ok(profile);
    }

    /** PUT /api/user/profile — update name or email */
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody Map<String, String> body) {
        String phone = getPhone();
        User user = userService.getUserByPhone(phone);
        if (body.containsKey("name")  && !body.get("name").isBlank())  user.setName(body.get("name"));
        if (body.containsKey("email") && !body.get("email").isBlank()) user.setEmail(body.get("email"));
        userService.save(user);
        return ResponseEntity.ok(Map.of("success", true, "message", "Profile updated"));
    }

    // ────────────────────────────────────────────────────────────────────────
    //  QUICK LOCATIONS
    // ────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/user/quick-locations
     * Returns all saved quick locations for the authenticated user.
     */
    @GetMapping("/quick-locations")
    public ResponseEntity<List<QuickLocation>> getQuickLocations() {
        return ResponseEntity.ok(quickLocationRepo.findByUserPhone(getPhone()));
    }

    /**
     * POST /api/user/quick-locations
     * Save or update a quick location.
     * Body: { label, address, latitude, longitude }
     * Labels: HOME | WORK | GYM | SCHOOL | HOSPITAL | MARKET | OTHER
     */
    @PostMapping("/quick-locations")
    @Transactional
    public ResponseEntity<QuickLocation> saveQuickLocation(@RequestBody Map<String, Object> body) {
        String phone   = getPhone();
        String label   = ((String) body.get("label")).toUpperCase().trim();
        String address = (String) body.getOrDefault("address", "");
        double lat     = ((Number) body.get("latitude")).doubleValue();
        double lng     = ((Number) body.get("longitude")).doubleValue();

        // Validate label
        Set<String> validLabels = Set.of("HOME", "WORK", "GYM", "SCHOOL", "HOSPITAL", "MARKET", "OTHER");
        if (!validLabels.contains(label)) {
            return ResponseEntity.badRequest().build();
        }

        // Upsert — delete existing and save new (simpler than merge)
        quickLocationRepo.deleteByUserPhoneAndLabel(phone, label);

        QuickLocation saved = quickLocationRepo.save(QuickLocation.builder()
                .userPhone(phone)
                .label(label)
                .address(address)
                .latitude(lat)
                .longitude(lng)
                .build());

        return ResponseEntity.ok(saved);
    }

    /**
     * DELETE /api/user/quick-locations/{label}
     * Remove a saved quick location by label.
     */
    @DeleteMapping("/quick-locations/{label}")
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteQuickLocation(@PathVariable String label) {
        quickLocationRepo.deleteByUserPhoneAndLabel(getPhone(), label.toUpperCase());
        return ResponseEntity.ok(Map.of("success", true));
    }

    private String getPhone() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
