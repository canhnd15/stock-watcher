/**
 * Keycloak configuration
 */
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8090',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'stock-watcher',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'stock-watcher-frontend',
};

