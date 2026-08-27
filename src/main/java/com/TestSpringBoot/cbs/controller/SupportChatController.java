package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.entities.ChatMessage;
import com.TestSpringBoot.cbs.repository.ChatMessageRepository;
import com.TestSpringBoot.cbs.service.GroqService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Real-time support chat via polling.
 * User messages → Groq LLM → AI reply with user context + guardrails.
 * Frontend polls GET /api/chat/messages/{sessionId} every 3 seconds.
 */
@RestController
@RequestMapping("/api/chat")
public class SupportChatController {

    @Autowired
    private ChatMessageRepository chatRepo;

    @Autowired
    private GroqService groqService;

    @Value("${support.phone:7974843494}")
    private String supportPhone;

    /** Create a new chat session for the authenticated user */
    @PostMapping("/session")
    public ResponseEntity<Map<String, String>> createSession() {
        String phone = getPhone();
        String sessionId = "SESS_" + phone + "_" + System.currentTimeMillis();

        // Welcome message from AI
        ChatMessage welcome = ChatMessage.builder()
                .sessionId(sessionId)
                .userPhone(phone)
                .sender("SUPPORT")
                .message("👋 Hello! I'm CABkaro's AI support assistant. I can help you with ride bookings, payments, driver issues, and account questions. How can I help you today? For urgent help, call us at " + supportPhone)
                .sentAt(LocalDateTime.now())
                .readBySupport(true)
                .build();
        chatRepo.save(welcome);

        Map<String, String> resp = new HashMap<>();
        resp.put("sessionId", sessionId);
        resp.put("supportPhone", supportPhone);
        return ResponseEntity.ok(resp);
    }

    /** User sends a message — triggers Groq AI reply */
    @PostMapping("/send")
    public ResponseEntity<ChatMessage> sendMessage(@RequestBody Map<String, String> body) {
        String phone = getPhone();
        String sessionId = body.get("sessionId");
        String userText  = body.getOrDefault("message", "").trim();

        // Save user message
        ChatMessage msg = ChatMessage.builder()
                .sessionId(sessionId)
                .userPhone(phone)
                .sender("USER")
                .message(userText)
                .sentAt(LocalDateTime.now())
                .readBySupport(false)
                .build();
        ChatMessage saved = chatRepo.save(msg);

        // Build session history for Groq context (last 10 messages)
        List<ChatMessage> recentMessages = chatRepo.findBySessionIdOrderBySentAtAsc(sessionId);
        List<Map<String, String>> history = recentMessages.stream()
                .limit(10)
                .map(m -> Map.of(
                    "role",    "USER".equals(m.getSender()) ? "user" : "assistant",
                    "content", m.getMessage()
                ))
                .collect(Collectors.toList());

        // Get AI reply from Groq (includes user context + guardrails)
        String aiReply = groqService.getReply(phone, userText, history);

        // Save AI reply
        ChatMessage bot = ChatMessage.builder()
                .sessionId(sessionId)
                .userPhone(phone)
                .sender("SUPPORT")
                .message(aiReply)
                .sentAt(LocalDateTime.now().plusSeconds(1))
                .readBySupport(true)
                .build();
        chatRepo.save(bot);

        return ResponseEntity.ok(saved);
    }

    /** Poll for all messages in a session */
    @GetMapping("/messages/{sessionId}")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable String sessionId) {
        return ResponseEntity.ok(chatRepo.findBySessionIdOrderBySentAtAsc(sessionId));
    }

    /** Support-side: manual reply to a user session (admin override) */
    @PostMapping("/support-reply")
    public ResponseEntity<ChatMessage> supportReply(@RequestBody Map<String, String> body) {
        ChatMessage msg = ChatMessage.builder()
                .sessionId(body.get("sessionId"))
                .userPhone(body.get("userPhone"))
                .sender("SUPPORT")
                .message(body.get("message"))
                .sentAt(LocalDateTime.now())
                .readBySupport(true)
                .build();
        return ResponseEntity.ok(chatRepo.save(msg));
    }

    /** Get unread message count (for support dashboard) */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestParam String sessionId) {
        long count = chatRepo.countBySessionIdAndSenderAndReadBySupportFalse(sessionId, "USER");
        return ResponseEntity.ok(Map.of("unread", count));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Driver Chat — scoped per rideId
    // Session key convention: "DRIVER_RIDE_{rideId}"
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/chat/driver-message
     * Body: { rideId, message, sender }
     * Saves a user→driver message for the given ride, then triggers an AI
     * driver reply (Groq) which is saved as a DRIVER-sender message.
     */
    @PostMapping("/driver-message")
    public ResponseEntity<ChatMessage> sendDriverMessage(@RequestBody Map<String, Object> body) {
        String phone   = getPhone();
        String rideId  = body.getOrDefault("rideId",  "").toString();
        String text    = body.getOrDefault("message", "").toString().trim();
        String sender  = body.getOrDefault("sender",  "USER").toString();

        if (rideId.isBlank() || text.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        String sessionId = "DRIVER_RIDE_" + rideId;

        // Save the user's message
        ChatMessage msg = ChatMessage.builder()
                .sessionId(sessionId)
                .userPhone(phone)
                .sender(sender)           // USER or DRIVER
                .message(text)
                .sentAt(LocalDateTime.now())
                .readBySupport(false)
                .build();
        ChatMessage saved = chatRepo.save(msg);

        // If the sender is USER, generate an AI driver reply asynchronously
        if ("USER".equalsIgnoreCase(sender)) {
            final String userText = text;
            final String finalSessionId = sessionId;
            final String finalPhone = phone;
            // Fetch history EXCLUDING the message we just saved (it's passed separately as the final user turn)
            List<ChatMessage> history = chatRepo.findBySessionIdOrderBySentAtAsc(finalSessionId);
            final List<Map<String, String>> conversationHistory = history.stream()
                .filter(m -> !m.getMessage().equals(userText) || !"USER".equalsIgnoreCase(m.getSender()))
                .map(m -> Map.of(
                    "role",    "USER".equalsIgnoreCase(m.getSender()) ? "user" : "assistant",
                    "content", m.getMessage()
                ))
                .collect(Collectors.toList());
            new Thread(() -> {
                try {
                    String driverReply = groqService.getDriverReply(userText, conversationHistory);
                    ChatMessage driverMsg = ChatMessage.builder()
                            .sessionId(finalSessionId)
                            .userPhone(finalPhone)
                            .sender("DRIVER")
                            .message(driverReply)
                            .sentAt(LocalDateTime.now().plusSeconds(2))
                            .readBySupport(false)
                            .build();
                    chatRepo.save(driverMsg);
                } catch (Exception e) {
                    // Swallow — driver reply is best-effort
                }
            }).start();
        }

        return ResponseEntity.ok(saved);
    }

    /**
     * GET /api/chat/driver/{rideId}
     * Poll all messages for a ride-scoped driver chat.
     */
    @GetMapping("/driver/{rideId}")
    public ResponseEntity<List<ChatMessage>> getDriverChat(@PathVariable String rideId) {
        String sessionId = "DRIVER_RIDE_" + rideId;
        return ResponseEntity.ok(chatRepo.findBySessionIdOrderBySentAtAsc(sessionId));
    }

    private String getPhone() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
