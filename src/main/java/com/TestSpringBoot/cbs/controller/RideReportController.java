package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.entities.RideReport;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.repository.RideReportRepository;
import com.TestSpringBoot.cbs.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * RideReportController
 *
 * POST /api/ride/report               — user submits a problem report
 * GET  /api/ride/reports              — user's own reports
 * GET  /api/ride/reports/all          — all reports (admin)
 * PUT  /api/ride/reports/{id}/reply   — admin replies to a report
 */
@RestController
@RequestMapping("/api/ride")
public class RideReportController {

    private static final Logger log = LoggerFactory.getLogger(RideReportController.class);

    @Autowired
    private RideReportRepository reportRepository;

    @Autowired
    private UserService userService;

    // ── Draft replies keyed by category ──────────────────────────────────────
    private static final Map<String, String> DRAFT_REPLIES = Map.of(

        "MISBEHAVIOUR",
        "Dear valued rider,\n\n" +
        "We sincerely apologise for the unpleasant experience you had with your recent ride. " +
        "At CABkaro, we expect all our driver partners to maintain the highest standards of " +
        "professionalism and courtesy at all times.\n\n" +
        "Your report has been logged and we are investigating this matter with the driver. " +
        "Appropriate action — including a formal warning or temporary suspension — will be " +
        "taken based on our findings.\n\n" +
        "We value your safety and comfort. As a gesture of goodwill, please use code " +
        "SORRY50 for ₹50 off your next ride.\n\n" +
        "Regards,\nCABkaro Support Team",

        "EXTRA_CHARGE",
        "Dear valued rider,\n\n" +
        "Thank you for bringing this to our attention. We take fare transparency very seriously.\n\n" +
        "Our team will cross-verify the fare charged against our system records for your ride. " +
        "If an overcharge is confirmed, a full refund of the excess amount will be processed " +
        "to your original payment method within 3-5 business days.\n\n" +
        "In the meantime, please note that fares are always calculated based on road distance " +
        "and may include applicable surge pricing which is always shown before booking.\n\n" +
        "We apologise for any inconvenience caused.\n\n" +
        "Regards,\nCABkaro Support Team",

        "NO_HELMET",
        "Dear valued rider,\n\n" +
        "Thank you for reporting this safety concern. Wearing a helmet is a non-negotiable " +
        "safety requirement for all our bike rider partners — for both your protection and theirs.\n\n" +
        "This violation has been flagged to our safety team. The driver will receive a mandatory " +
        "safety briefing, and repeat violations will result in permanent deactivation from our platform.\n\n" +
        "Your safety is our top priority, and we appreciate you helping us maintain it.\n\n" +
        "Regards,\nCABkaro Safety Team",

        "LOST_ITEM",
        "Dear valued rider,\n\n" +
        "We understand how stressful it is to lose a belonging. Our team has already reached " +
        "out to the driver to check for your item.\n\n" +
        "If the item is found, we will coordinate a convenient return pickup at no extra charge. " +
        "Please keep your phone accessible — the driver or our support team will contact you " +
        "within the next 2 hours.\n\n" +
        "If the item is not recovered, we can provide a detailed trip summary to assist with " +
        "any insurance or police complaint.\n\n" +
        "We're doing everything we can to help recover your item.\n\n" +
        "Regards,\nCABkaro Support Team",

        "WRONG_DROP",
        "Dear valued rider,\n\n" +
        "We sincerely apologise for the inconvenience of being dropped at the wrong location. " +
        "This should never happen, and we take full responsibility.\n\n" +
        "Our team will review the GPS records of your trip to understand what went wrong. " +
        "As compensation for the extra distance/time you spent, a credit of ₹75 has been " +
        "added to your CABkaro wallet and will reflect within 24 hours.\n\n" +
        "We are also counselling the driver on the importance of following navigation accurately.\n\n" +
        "Regards,\nCABkaro Support Team",

        "OTHER",
        "Dear valued rider,\n\n" +
        "Thank you for taking the time to share your feedback. Every report helps us improve " +
        "the experience for all our riders.\n\n" +
        "Our support team has received your concern and will review it carefully. " +
        "We aim to respond with a resolution within 24-48 hours.\n\n" +
        "If this is urgent, please call our helpline at 1800-CAB-KARO (toll-free, 24×7).\n\n" +
        "We appreciate your patience.\n\n" +
        "Regards,\nCABkaro Support Team"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/ride/report
    // Body: { rideId, category, description, driverName, vehicleNumber }
    // ─────────────────────────────────────────────────────────────────────────
    @PostMapping("/report")
    public ResponseEntity<?> submitReport(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        if (auth == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Please login to report a problem."));
        }

        try {
            User user = userService.getUserByPhone(auth.getName());

            Long rideId      = Long.parseLong(body.get("rideId").toString());
            String category  = body.getOrDefault("category", "OTHER").toString().toUpperCase();
            String desc      = (String) body.getOrDefault("description", "");
            String driverName  = (String) body.getOrDefault("driverName", "");
            String vehicleNum  = (String) body.getOrDefault("vehicleNumber", "");

            // Validate category
            if (!DRAFT_REPLIES.containsKey(category)) category = "OTHER";

            // Check for duplicate report
            Optional<RideReport> existing = reportRepository.findByRideIdAndUserId(rideId, user.getId());
            if (existing.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "success", false,
                        "message", "You have already submitted a report for this ride.",
                        "report", existing.get()
                ));
            }

            // Build and save report
            RideReport report = RideReport.builder()
                    .rideId(rideId)
                    .userId(user.getId())
                    .userPhone(user.getPhoneNumber())
                    .userName(user.getName())
                    .driverName(driverName)
                    .vehicleNumber(vehicleNum)
                    .category(category)
                    .description(desc)
                    .draftedReply(DRAFT_REPLIES.get(category))
                    .status("OPEN")
                    .reportedAt(LocalDateTime.now())
                    .build();

            RideReport saved = reportRepository.save(report);
            log.info("New ride report #{} submitted by user {} for ride {} — category: {}",
                    saved.getId(), user.getId(), rideId, category);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Your report has been submitted. Our team will respond within 24 hours.",
                    "reportId", saved.getId(),
                    "draftedReply", saved.getDraftedReply()
            ));

        } catch (Exception e) {
            log.error("Error submitting ride report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Failed to submit report. Please try again."));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ride/reports  — logged-in user's own reports
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/reports")
    public ResponseEntity<?> getMyReports(Authentication auth) {
        if (auth == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            User user = userService.getUserByPhone(auth.getName());
            List<RideReport> reports = reportRepository.findByUserIdOrderByReportedAtDesc(user.getId());
            return ResponseEntity.ok(reports);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/ride/reports/all  — all reports (admin use)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/reports/all")
    public ResponseEntity<List<RideReport>> getAllReports() {
        return ResponseEntity.ok(reportRepository.findAll());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/ride/reports/{id}/reply  — admin sends a reply
    // Body: { adminReply }
    // ─────────────────────────────────────────────────────────────────────────
    @PutMapping("/reports/{id}/reply")
    public ResponseEntity<?> replyToReport(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return reportRepository.findById(id).map(report -> {
            report.setAdminReply(body.get("adminReply"));
            report.setStatus("RESOLVED");
            report.setResolvedAt(LocalDateTime.now());
            reportRepository.save(report);
            return ResponseEntity.ok(Map.of("success", true, "message", "Reply sent."));
        }).orElse(ResponseEntity.notFound().build());
    }
}
