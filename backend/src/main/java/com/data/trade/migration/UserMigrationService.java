package com.data.trade.migration;

import com.data.trade.model.User;
import com.data.trade.model.UserRole;
import com.data.trade.repository.UserRepository;
import com.data.trade.service.KeycloakAdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserMigrationService {

    private final UserRepository userRepository;
    private final KeycloakAdminService keycloakAdminService;

    public MigrationResult migrateAllUsers() {
        log.info("Starting user migration to Keycloak");
        MigrationResult result = new MigrationResult();

        List<User> users = userRepository.findAll();
        log.info("Found {} users to migrate", users.size());

        for (User user : users) {
            try {
                // Check if user already exists in Keycloak
                UserRepresentation existingUser = keycloakAdminService.findUserByUsername(user.getUsername());
                
                if (existingUser != null) {
                    log.warn("User {} already exists in Keycloak, skipping", user.getUsername());
                    result.incrementSkipped();
                    continue;
                }

                // Generate a temporary password (user must change on first login)
                String temporaryPassword = generateTemporaryPassword();

                // Create user in Keycloak
                String keycloakUserId = keycloakAdminService.createUser(
                        user.getUsername(),
                        user.getEmail(),
                        temporaryPassword,
                        user.getEmailVerified() != null ? user.getEmailVerified() : false
                );

                // Assign role based on user's current role
                String roleName = mapRoleToKeycloakRole(user.getRole());
                keycloakAdminService.assignRole(keycloakUserId, roleName);

                log.info("Successfully migrated user {} (ID: {}) with role {}", 
                        user.getUsername(), keycloakUserId, roleName);
                result.incrementSuccessful();
                result.addSuccessUser(user.getUsername());

            } catch (Exception e) {
                log.error("Failed to migrate user {}: {}", user.getUsername(), e.getMessage(), e);
                result.incrementFailed();
                result.addFailedUser(user.getUsername(), e.getMessage());
            }
        }

        log.info("Migration completed. Successful: {}, Failed: {}, Skipped: {}", 
                result.getSuccessfulCount(), result.getFailedCount(), result.getSkippedCount());

        return result;
    }

    private String generateTemporaryPassword() {
        // Generate a secure temporary password
        // Users will be required to change this on first login
        return "TempP@ss" + UUID.randomUUID().toString().substring(0, 8);
    }

    private String mapRoleToKeycloakRole(UserRole role) {
        // Map application roles to Keycloak realm roles
        return role.name(); // NORMAL, VIP, ADMIN - should match Keycloak realm roles
    }

    public static class MigrationResult {
        private int successfulCount = 0;
        private int failedCount = 0;
        private int skippedCount = 0;
        private List<String> successUsers = new ArrayList<>();
        private List<String> failedUsers = new ArrayList<>();

        public void incrementSuccessful() {
            successfulCount++;
        }

        public void incrementFailed() {
            failedCount++;
        }

        public void incrementSkipped() {
            skippedCount++;
        }

        public void addSuccessUser(String username) {
            successUsers.add(username);
        }

        public void addFailedUser(String username, String error) {
            failedUsers.add(username + ": " + error);
        }

        // Getters
        public int getSuccessfulCount() {
            return successfulCount;
        }

        public int getFailedCount() {
            return failedCount;
        }

        public int getSkippedCount() {
            return skippedCount;
        }

        public List<String> getSuccessUsers() {
            return successUsers;
        }

        public List<String> getFailedUsers() {
            return failedUsers;
        }
    }
}

