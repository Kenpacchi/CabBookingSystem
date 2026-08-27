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

    @jakarta.annotation.PostConstruct
    public void init() {
        log.info("GroqService initialized — model: {}, apiKey present: {}, url: {}",
            model, (apiKey != null && !apiKey.isBlank()), apiUrl);
    }

    /**
     * Get AI reply for a user message.
     * @param userPhone authenticated user's phone number
     * @param userMessage the message sent by the user
     * @param sessionHistory last N messages for context [{"role":"user/assistant","content":"..."}]
     * @return AI-generated reply string
     */
    public String getReply(String userPhone, String userMessage, List<Map<String, String>> sessionHistory) {
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
            requestBody.put("max_tokens", 120);
            requestBody.put("temperature", 0.5);
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
            log.error("Groq API call failed — model: {}, apiKey present: {}, error: {}",
                model, (apiKey != null && !apiKey.isBlank()), e.getMessage(), e);
        }

        // Fallback
        return "I'm having trouble connecting right now. Please call us at 7974843494 for immediate assistance.";
    }

    /** Check if the message is relevant to cab support topics */
    /** Build the system prompt with user context and guardrails */
    private String buildSystemPrompt(String userContext) {
        return "You are CABkaro's support assistant. CABkaro is a cab booking app in India (bike, auto, cab).\n\n" +
               "RULES:\n" +
               "1. Reply in 1-3 short sentences only. Be direct and clear.\n" +
               "2. Use simple language a regular user can understand — no technical jargon.\n" +
               "3. Be professional, warm and helpful.\n" +
               "4. For urgent issues, mention support phone: 7974843494.\n" +
               "5. Never write long paragraphs.\n\n" +
               "USER CONTEXT:\n" + userContext;
    }

    /**
     * Get a short, natural driver-like AI reply for the passenger's message.
     * The driver persona is "Ramu bhaiya", a Varanasi cab driver.
     * Conversation history is included so Groq has full context and gives varied replies.
     */
    public String getDriverReply(String userMessage, List<Map<String, String>> conversationHistory, String driverName, String pickupAddress) {
        try {
            // Extract city from pickup address (last meaningful part)
            String city = "your city";
            if (pickupAddress != null && !pickupAddress.isBlank()) {
                String[] parts = pickupAddress.split(",");
                if (parts.length >= 2) {
                    city = parts[parts.length - 2].trim(); // second to last part is usually city
                } else {
                    city = parts[0].trim();
                }
            }

            String name = (driverName != null && !driverName.isBlank()) ? driverName : "Driver";

            List<Map<String, String>> messages = new ArrayList<>();

            // System prompt — driver's real name and local city
            messages.add(Map.of("role", "system", "content",
                "You are " + name + ", a cab driver from " + city + ", India. " +
                "You are driving to pick up the passenger right now. " +
                "Reply like a real local person from " + city + " — casual, natural, short (1-2 sentences max). " +
                "Use the language the passenger uses (Hindi, English, or Hinglish). " +
                "Be genuine and human. No restrictions on topics."));

            // Add last 8 messages of conversation history for context
            if (conversationHistory != null && !conversationHistory.isEmpty()) {
                int start = Math.max(0, conversationHistory.size() - 8);
                messages.addAll(conversationHistory.subList(start, conversationHistory.size()));
            }

            // Add the new user message
            messages.add(Map.of("role", "user", "content", userMessage));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", messages);
            requestBody.put("max_tokens", 120);
            requestBody.put("temperature", 1.0);
            requestBody.put("presence_penalty", 0.8);   // penalise repeating topics
            requestBody.put("frequency_penalty", 0.8);  // penalise repeating exact phrases

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
        // Varied fallbacks so even offline it doesn't feel robotic
        String[] fallbacks = {
            "Haan bhai, bas pohonch raha hoon! 2 minute.",
            "Traffic mein hoon, jaldi aaunga!",
            "Almost there, 3 mins!",
            "Aapke paas hi hoon, bas ek turn aur.",
            "Haan dekh raha hoon aapko, aa raha hoon!"
        };
        return fallbacks[(int)(Math.random() * fallbacks.length)];
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
