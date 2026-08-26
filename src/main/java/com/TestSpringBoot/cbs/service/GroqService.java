package com.TestSpringBoot.cbs.service;

import com.TestSpringBoot.cbs.model.entities.RideHistory;
import com.TestSpringBoot.cbs.model.entities.User;
import com.TestSpringBoot.cbs.repository.RideHistoryRepository;
import com.TestSpringBoot.cbs.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroqService {

    private static final Logger log = LoggerFactory.getLogger(GroqService.class);

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    @Value("${groq.model:llama3-8b-8192}")
    private String model;

    @Autowired private UserRepository userRepo;
    @Autowired private RideHistoryRepository rideHistoryRepo;

    private final RestTemplate restTemplate = new RestTemplate();

    // Guardrail keywords - topics the bot is allowed to answer
    private static final Set<String> ALLOWED_TOPICS = Set.of(
        "ride", "cab", "book", "cancel", "driver", "fare", "price", "payment",
        "refund", "billing", "track", "otp", "account", "profile", "support",
        "help", "lost", "item", "auto", "bike", "pickup", "drop", "location",
        "rating", "complaint", "surge", "discount", "promo", "trip", "history",
        "hello", "hi", "hey", "thank", "thanks", "bye", "problem", "issue",
        "app", "login", "signup", "password", "phone", "number", "wait", "eta"
    );

    /**
     * Get AI reply for a user message.
     * @param userPhone authenticated user's phone number
     * @param userMessage the message sent by the user
     * @param sessionHistory last N messages for context [{"role":"user/assistant","content":"..."}]
     * @return AI-generated reply string
     */
    public String getReply(String userPhone, String userMessage, List<Map<String, String>> sessionHistory) {
        // Guardrail check
        if (!isRelevantToSupport(userMessage)) {
            return "I'm CABkaro's support assistant and can only help with ride-related questions — booking, payments, drivers, account issues, and trip history. For other queries, please contact us at 7974843494.";
        }

        try {
            // Build user context
            String userContext = buildUserContext(userPhone);

            // Build messages array for Groq
            List<Map<String, String>> messages = new ArrayList<>();

            // System prompt with guardrails and user context
            messages.add(Map.of(
                "role", "system",
                "content", buildSystemPrompt(userContext)
            ));

            // Add recent session history (last 6 messages for context window)
            if (sessionHistory != null) {
                int start = Math.max(0, sessionHistory.size() - 6);
                messages.addAll(sessionHistory.subList(start, sessionHistory.size()));
            }

            // Add current user message
            messages.add(Map.of("role", "user", "content", userMessage));

            // Build request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 300);
            requestBody.put("temperature", 0.7);

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // Call Groq API
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

            // Parse response
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> msg = (Map<String, Object>) choice.get("message");
                    if (msg != null) {
                        Object contentObj = msg.get("content");
                        if (contentObj instanceof String && !((String) contentObj).isBlank()) {
                            return (String) contentObj;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Groq API call failed: {}", e.getMessage());
        }

        // Fallback
        return "I'm having trouble connecting right now. Please call us at 7974843494 for immediate assistance.";
    }

    /** Check if the message is relevant to cab support topics */
    private boolean isRelevantToSupport(String message) {
        if (message == null || message.trim().isEmpty()) return false;
        String lower = message.toLowerCase();
        // Short greetings always allowed
        if (lower.length() < 15) return true;
        // Check if any allowed topic keyword is present
        return ALLOWED_TOPICS.stream().anyMatch(lower::contains);
    }

    /** Build the system prompt with user context and guardrails */
    private String buildSystemPrompt(String userContext) {
        return "You are CABkaro's helpful support assistant. CABkaro is a cab booking app in India offering bike, auto-rickshaw, and cab rides.\n\n" +
               "RULES:\n" +
               "1. Only answer questions about: cab booking, rides, payments, drivers, account issues, trip history, app features.\n" +
               "2. If asked anything unrelated (politics, general knowledge, coding, etc.), politely decline and redirect to ride support.\n" +
               "3. Be concise, friendly, and helpful. Use simple English.\n" +
               "4. Always refer to support phone 7974843494 for urgent issues.\n" +
               "5. Keep responses under 150 words.\n\n" +
               "USER CONTEXT:\n" + userContext;
    }

    /**
     * Get a short, natural driver-like AI reply for the passenger's message.
     * The driver persona is "Ramu bhaiya", a Varanasi cab driver.
     * @param userMessage the passenger's message
     * @return short AI-generated driver reply (1-2 sentences), or a fallback
     */
    public String getDriverReply(String userMessage) {
        try {
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content",
                "You are a cab driver in Varanasi, India named Ramu bhaiya. Reply naturally and briefly to the passenger as if you are driving. " +
                "If they ask where you are, say you are nearby and almost there. If they ask to hurry, say you are going fast. " +
                "If they say 'I can see you', say good, I can see you too. " +
                "Keep replies to 1-2 sentences max. Match the language the passenger used (Hindi, English, or Hinglish). " +
                "Sample Hindi reply: 'Haan bhai, aa raha hoon, bas 2 minute.' Sample English: 'Yes, almost there, 2 mins.' " +
                "Never break character. Be friendly and natural."));
            messages.add(Map.of("role", "user", "content", userMessage));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 80);
            requestBody.put("temperature", 0.8);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
                    if (msg != null && msg.get("content") instanceof String content && !content.isBlank()) {
                        return content.trim();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Driver AI reply failed: {}", e.getMessage());
        }
        return "Haan, aa raha hoon! 2 minute.";
    }

    /** Fetch user's data and recent rides to build context */
    private String buildUserContext(String userPhone) {
        StringBuilder ctx = new StringBuilder();
        try {
            Optional<User> userOpt = userRepo.findByPhoneNumber(userPhone);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                ctx.append("Name: ").append(user.getName()).append("\n");
                ctx.append("Phone: ").append(user.getPhoneNumber()).append("\n");
                ctx.append("Email: ").append(user.getEmail()).append("\n");
                ctx.append("Phone verified: ").append(user.getPhoneVerified()).append("\n");

                // Recent rides
                List<RideHistory> rides = rideHistoryRepo.findByUserPhoneOrderByBookedAtDesc(userPhone);
                ctx.append("Total rides: ").append(rides.size()).append("\n");
                if (!rides.isEmpty()) {
                    double totalSpent = rides.stream().mapToDouble(r -> r.getFare() != null ? r.getFare() : 0).sum();
                    ctx.append("Total spent: INR ").append(String.format("%.0f", totalSpent)).append("\n");
                    // Last 3 rides summary
                    ctx.append("Recent rides:\n");
                    rides.stream().limit(3).forEach(r -> {
                        ctx.append("  - ").append(r.getVehicleType())
                           .append(" from ").append(r.getPickupAddress() != null ? r.getPickupAddress().substring(0, Math.min(30, r.getPickupAddress().length())) : "?")
                           .append(" to ").append(r.getDropAddress() != null ? r.getDropAddress().substring(0, Math.min(30, r.getDropAddress().length())) : "?")
                           .append(" INR ").append(r.getFare())
                           .append(" (").append(r.getStatus()).append(")\n");
                    });
                }
            }
        } catch (Exception e) {
            log.warn("Could not build user context: {}", e.getMessage());
            ctx.append("Context unavailable.\n");
        }
        return ctx.toString();
    }
}
