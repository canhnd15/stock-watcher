package com.data.trade.controller;

import com.data.trade.migration.UserMigrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/migration")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class MigrationController {

    private final UserMigrationService userMigrationService;

    @PostMapping("/users")
    public ResponseEntity<?> migrateUsers() {
        try {
            log.info("User migration endpoint called by admin");
            UserMigrationService.MigrationResult result = userMigrationService.migrateAllUsers();
            
            return ResponseEntity.ok(new MigrationResponse(
                    result.getSuccessfulCount(),
                    result.getFailedCount(),
                    result.getSkippedCount(),
                    result.getSuccessUsers(),
                    result.getFailedUsers()
            ));
        } catch (Exception e) {
            log.error("Error during user migration: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("Migration failed: " + e.getMessage());
        }
    }

    public record MigrationResponse(
            int successful,
            int failed,
            int skipped,
            java.util.List<String> successUsers,
            java.util.List<String> failedUsers
    ) {}
}

