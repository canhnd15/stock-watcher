package com.data.trade.config;

import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.RealmResource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class KeycloakConfig {

    @Value("${keycloak.admin.server-url:http://localhost:8090}")
    private String serverUrl;

    @Value("${keycloak.admin.realm:master}")
    private String adminRealm;

    @Value("${keycloak.admin.client-id:admin-cli}")
    private String clientId;

    @Value("${keycloak.admin.username:admin}")
    private String username;

    @Value("${keycloak.admin.password:admin}")
    private String password;

    @Value("${keycloak.realm:stock-watcher}")
    private String realm;

    @Bean
    public Keycloak keycloak() {
        log.info("Initializing Keycloak admin client for server: {}, realm: {}", serverUrl, adminRealm);
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm(adminRealm)
                .clientId(clientId)
                .username(username)
                .password(password)
                .build();
    }

    @Bean
    public RealmResource realmResource(Keycloak keycloak) {
        log.info("Getting realm resource for realm: {}", realm);
        return keycloak.realm(realm);
    }
}

