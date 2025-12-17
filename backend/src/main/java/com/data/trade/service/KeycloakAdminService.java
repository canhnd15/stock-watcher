package com.data.trade.service;

import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class KeycloakAdminService {

    private final RealmResource realmResource;

    /**
     * Create a new user in Keycloak
     * @param username Username
     * @param email Email address
     * @param password Password (will be set as temporary - user must change on first login)
     * @param emailVerified Whether email is verified
     * @return The ID of the created user
     */
    public String createUser(String username, String email, String password, boolean emailVerified) {
        UsersResource usersResource = realmResource.users();
        
        // Check if user already exists
        List<UserRepresentation> existingUsers = usersResource.searchByUsername(username, true);
        if (!existingUsers.isEmpty()) {
            throw new RuntimeException("User with username " + username + " already exists in Keycloak");
        }

        // Create user representation
        UserRepresentation userRepresentation = new UserRepresentation();
        userRepresentation.setUsername(username);
        userRepresentation.setEmail(email);
        userRepresentation.setEmailVerified(emailVerified);
        userRepresentation.setEnabled(true);

        // Create user
        Response response = usersResource.create(userRepresentation);
        
        if (response.getStatus() != Response.Status.CREATED.getStatusCode()) {
            String errorMessage = response.readEntity(String.class);
            log.error("Failed to create user in Keycloak: {}", errorMessage);
            throw new RuntimeException("Failed to create user in Keycloak: " + errorMessage);
        }

        // Get the created user ID from the Location header
        String userId = getCreatedId(response);
        log.info("Created user in Keycloak with ID: {}", userId);

        // Set password
        if (password != null && !password.isEmpty()) {
            setPassword(userId, password, true); // true = temporary password
        }

        return userId;
    }

    /**
     * Assign a realm role to a user
     * @param userId User ID in Keycloak
     * @param roleName Role name (NORMAL, VIP, ADMIN)
     */
    public void assignRole(String userId, String roleName) {
        try {
            // Get realm role
            RoleRepresentation role = realmResource.roles().get(roleName).toRepresentation();
            
            // Get user resource
            UserResource userResource = realmResource.users().get(userId);
            
            // Assign role
            userResource.roles().realmLevel().add(Collections.singletonList(role));
            
            log.info("Assigned role {} to user {}", roleName, userId);
        } catch (Exception e) {
            log.error("Failed to assign role {} to user {}: {}", roleName, userId, e.getMessage());
            throw new RuntimeException("Failed to assign role: " + e.getMessage(), e);
        }
    }

    /**
     * Find user by username
     * @param username Username to search for
     * @return UserRepresentation or null if not found
     */
    public UserRepresentation findUserByUsername(String username) {
        List<UserRepresentation> users = realmResource.users().searchByUsername(username, true);
        return users.isEmpty() ? null : users.get(0);
    }

    /**
     * Update user information
     * @param userId User ID in Keycloak
     * @param userRepresentation Updated user representation
     */
    public void updateUser(String userId, UserRepresentation userRepresentation) {
        try {
            UserResource userResource = realmResource.users().get(userId);
            userResource.update(userRepresentation);
            log.info("Updated user {} in Keycloak", userId);
        } catch (Exception e) {
            log.error("Failed to update user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to update user: " + e.getMessage(), e);
        }
    }

    /**
     * Set password for a user
     * @param userId User ID
     * @param password Password
     * @param temporary Whether password is temporary (user must change on first login)
     */
    private void setPassword(String userId, String password, boolean temporary) {
        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(password);
        credential.setTemporary(temporary);

        UserResource userResource = realmResource.users().get(userId);
        userResource.resetPassword(credential);
        
        log.info("Set password for user {} (temporary: {})", userId, temporary);
    }

    /**
     * Extract user ID from the Location header of a response
     */
    private String getCreatedId(Response response) {
        String location = response.getLocation().getPath();
        return location.substring(location.lastIndexOf('/') + 1);
    }

    /**
     * Get all realm roles
     * @return List of role names
     */
    public List<String> getRealmRoles() {
        return realmResource.roles().list().stream()
                .map(RoleRepresentation::getName)
                .collect(Collectors.toList());
    }
}

