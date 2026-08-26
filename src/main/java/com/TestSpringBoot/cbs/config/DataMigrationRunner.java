package com.TestSpringBoot.cbs.config;

import com.TestSpringBoot.cbs.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Runs once on startup.
 *
 * Detects any users whose password is NOT a BCrypt hash
 * (BCrypt hashes always start with "$2a$") and re-hashes them.
 *
 * This safely handles the migration from plain-text passwords
 * created before BCrypt was added.
 */
@Component
public class DataMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataMigrationRunner.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var users = userRepository.findAll();
        int migrated = 0;

        for (var user : users) {
            String pwd = user.getPassword();
            // BCrypt hashes always start with "$2a$" and are exactly 60 chars
            if (pwd != null && !pwd.startsWith("$2a$") && !pwd.startsWith("$2b$")) {
                user.setPassword(passwordEncoder.encode(pwd));
                userRepository.save(user);
                migrated++;
                log.info("Migrated password for user: {} ({})", user.getName(), user.getPhoneNumber());
            }
        }

        if (migrated > 0) {
            log.info("Password migration complete: {} user(s) updated.", migrated);
        } else {
            log.info("Password migration: all passwords already hashed. Nothing to do.");
        }
    }
}
