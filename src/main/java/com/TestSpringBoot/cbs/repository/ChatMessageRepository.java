package com.TestSpringBoot.cbs.repository;

import com.TestSpringBoot.cbs.model.entities.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionIdOrderBySentAtAsc(String sessionId);
    List<ChatMessage> findByUserPhoneOrderBySentAtAsc(String userPhone);
    long countBySessionIdAndSenderAndReadBySupportFalse(String sessionId, String sender);
}
