package com.TestSpringBoot.cbs.controller;

import com.TestSpringBoot.cbs.model.entities.ChatMessage;
import com.TestSpringBoot.cbs.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Real-time support chat via polling.
 * Frontend polls GET /api/chat/messages/{sessionId} every 3 seconds.
 * Support (admin) replies via POST /api/chat/support-reply.
 */
@RestController
@RequestMapping("/api/chat")
public class SupportChatController {

    @Autowired
    private ChatMessageRepository chatRepo;

    @Value("${support.phone:7974843494}")
    private String supportPhone;

    /** Create a new chat session for the authenticated user */
    @PostMapping("/session")
    public ResponseEntity<Map<String, String>> createSession() {
        String phone = getPhone();
        String sessionId = "SESS_" + phone + "_" + System.currentTimeMillis();

        // Drop a welcome message from support
        ChatMessage welcome = ChatMessage.builder()
                .sessionId(sessionId)
                .userPhone(phone)
                .sender("SUPPORT")
                .message("👋 Hello! Welcome to CABkaro support. How can I help you today? You can also call us at " + supportPhone)
                .sentAt(LocalDateTime.now())
                .readBySupport(true)
                .build();
        chatRepo.save(welcome);

        Map<String, String> resp = new HashMap<>();
        resp.put("sessionId", sessionId);
        resp.put("supportPhone", supportPhone);
        return ResponseEntity.ok(resp);
    }

    /** User sends a message */
    @PostMapping("/send")
    public ResponseEntity<ChatMessage> sendMessage(@RequestBody Map<String, String> body) {
        String phone = getPhone();
        ChatMessage msg = ChatMessage.builder()
                .sessionId(body.get("sessionId"))
                .userPhone(phone)
                .sender("USER")
                .message(body.get("message"))
                .sentAt(LocalDateTime.now())
                .readBySupport(false)
                .build();

        ChatMessage saved = chatRepo.save(msg);

        // Auto-reply if keywords match (basic bot)
        String text = body.get("message").toLowerCase();
        String autoReply = getAutoReply(text, supportPhone);
        if (autoReply != null) {
            ChatMessage bot = ChatMessage.builder()
                    .sessionId(body.get("sessionId"))
                    .userPhone(phone)
                    .sender("SUPPORT")
                    .message(autoReply)
                    .sentAt(LocalDateTime.now().plusSeconds(1))
                    .readBySupport(true)
                    .build();
            chatRepo.save(bot);
        }

        return ResponseEntity.ok(saved);
    }

    /** Poll for all messages in a session */
    @GetMapping("/messages/{sessionId}")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable String sessionId) {
        return ResponseEntity.ok(chatRepo.findBySessionIdOrderBySentAtAsc(sessionId));
    }

    /** Support-side: reply to a user session */
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

    // ── Auto-reply bot ────────────────────────────────────────────────────────

    private String getAutoReply(String text, String phone) {
        if (text.contains("cancel")) {
            return "To cancel a ride, go to your active ride screen and tap 'Cancel'. If you're having trouble, call us at " + phone;
        }
        if (text.contains("refund") || text.contains("payment") || text.contains("billing")) {
            return "For refund or payment issues, our team will review and respond within 24 hours. You can also call " + phone;
        }
        if (text.contains("driver") && (text.contains("complaint") || text.contains("bad") || text.contains("rude"))) {
            return "We're sorry to hear that! Please share the ride ID and we'll investigate immediately. Call " + phone + " for urgent complaints.";
        }
        if (text.contains("track") || text.contains("where")) {
            return "You can track your ride in real-time on the booking screen. If your driver isn't moving, please call " + phone;
        }
        if (text.contains("hello") || text.contains("hi") || text.contains("hey")) {
            return "Hello! 😊 I'm the CABkaro support bot. For urgent help call " + phone + ". How can I assist you?";
        }
        if (text.contains("thank")) {
            return "You're welcome! 😊 Have a safe ride with CABkaro. Is there anything else I can help you with?";
        }
        // No match — queue for human
        return "Thanks for your message. Our support team will respond shortly. For urgent help, call " + phone;
    }

    private String getPhone() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
