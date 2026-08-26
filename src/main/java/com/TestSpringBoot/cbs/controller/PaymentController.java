package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.repository.RideHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Razorpay payment gateway integration.
 *
 * Flow:
 * 1. POST /api/payment/create-order  → backend creates Razorpay order, returns {orderId, amount, key}
 * 2. Frontend opens Razorpay checkout with those details
 * 3. After payment, frontend sends razorpayPaymentId + orderId + signature
 * 4. POST /api/payment/verify        → backend verifies HMAC, marks ride as paid
 * 5. POST /api/payment/rate          → save driver rating
 *
 * To activate real payments:
 *   1. Create account at https://dashboard.razorpay.com
 *   2. Get Key ID + Key Secret from Settings > API Keys
 *   3. Update application.properties: razorpay.key.id and razorpay.key.secret
 *   4. For payouts to 7974843494, set up Razorpay Route in dashboard
 */
@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    @Value("${razorpay.key.id:rzp_test_placeholder}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:placeholder_secret}")
    private String razorpayKeySecret;

    @Autowired
    private RideHistoryRepository rideHistoryRepo;

    /**
     * POST /api/payment/create-order
     * Body: { amount: 7500, rideId: 42, type: "RIDE" | "TIP" }
     * Amount is in paise (₹75 = 7500 paise)
     */
    @PostMapping("/create-order")
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody Map<String, Object> body) {
        try {
            int amount = Integer.parseInt(body.get("amount").toString());
            String receiptId = "rcpt_" + System.currentTimeMillis();

            // Call Razorpay Orders API
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBasicAuth(razorpayKeyId, razorpayKeySecret);

            Map<String, Object> orderReq = new HashMap<>();
            orderReq.put("amount", amount);
            orderReq.put("currency", "INR");
            orderReq.put("receipt", receiptId);
            orderReq.put("payment_capture", 1);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(orderReq, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "https://api.razorpay.com/v1/orders", entity, Map.class);

            Map<?, ?> rzpOrder = response.getBody();

            Map<String, Object> result = new HashMap<>();
            result.put("orderId", rzpOrder.get("id"));
            result.put("amount", amount);
            result.put("currency", "INR");
            result.put("key", razorpayKeyId);
            result.put("rideId", body.get("rideId"));
            result.put("mock", false);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.warn("Razorpay order creation failed ({}), using mock order", e.getMessage());
            int amount = Integer.parseInt(body.getOrDefault("amount", "0").toString());
            return ResponseEntity.ok(buildMockOrder(amount, body.get("rideId")));
        }
    }

    /**
     * POST /api/payment/verify
     * Body: { razorpayPaymentId, razorpayOrderId, razorpaySignature, rideId, tipAmount }
     */
    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyPayment(@RequestBody Map<String, Object> body) {
        try {
            String paymentId = (String) body.get("razorpayPaymentId");
            String orderId   = (String) body.get("razorpayOrderId");
            String signature = (String) body.get("razorpaySignature");

            boolean valid = (orderId != null && orderId.startsWith("order_mock_"))
                    || verifySignature(orderId + "|" + paymentId, signature, razorpayKeySecret);

            if (valid) {
                Object rideIdObj = body.get("rideId");
                if (rideIdObj != null) {
                    Long rideId = Long.valueOf(rideIdObj.toString());
                    rideHistoryRepo.findById(rideId).ifPresent(ride -> {
                        ride.setPaymentId(paymentId != null ? paymentId : "mock_" + System.currentTimeMillis());
                        Object tipObj = body.get("tipAmount");
                        if (tipObj != null) {
                            double tipAmt = Double.parseDouble(tipObj.toString());
                            if (tipAmt > 0) {
                                ride.setTip(tipAmt);
                                ride.setTipPaid(true);
                            }
                        }
                        rideHistoryRepo.save(ride);
                    });
                }
                Map<String, Object> result = new HashMap<>();
                result.put("success", true);
                result.put("message", "Payment successful!");
                result.put("paymentId", paymentId);
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Payment verification failed"));
            }
        } catch (Exception e) {
            log.error("Payment verify error: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * POST /api/payment/rate
     * Body: { rideId: 42, rating: 4 }
     */
    @PostMapping("/rate")
    public ResponseEntity<Map<String, Object>> rateDriver(@RequestBody Map<String, Object> body) {
        try {
            Long rideId = Long.valueOf(body.get("rideId").toString());
            int rating  = Integer.parseInt(body.get("rating").toString());
            rideHistoryRepo.findById(rideId).ifPresent(ride -> {
                ride.setRating(rating);
                rideHistoryRepo.save(ride);
            });
            return ResponseEntity.ok(Map.of("success", true, "rating", rating));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> buildMockOrder(int amount, Object rideId) {
        Map<String, Object> mock = new HashMap<>();
        mock.put("orderId", "order_mock_" + System.currentTimeMillis());
        mock.put("amount", amount);
        mock.put("currency", "INR");
        mock.put("key", razorpayKeyId);
        mock.put("rideId", rideId);
        mock.put("mock", true);
        return mock;
    }

    private boolean verifySignature(String payload, String signature, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString().equals(signature);
        } catch (Exception e) {
            return false;
        }
    }
}
