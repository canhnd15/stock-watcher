package com.data.trade.constants;

/**
 * Constants for user roles
 * Centralized role names for easier maintenance and refactoring
 */
public class RoleConstants {

    // Role names (as used in Spring Security - without ROLE_ prefix)
    public static final String ROLE_NORMAL = "NORMAL";
    public static final String ROLE_VIP = "VIP";
    public static final String ROLE_ADMIN = "ADMIN";

    // Role combinations for common access patterns
    public static final String ROLES_ALL = "NORMAL, VIP, ADMIN";
    public static final String ROLES_VIP_ADMIN = "VIP, ADMIN";
    public static final String ROLES_ADMIN_ONLY = "ADMIN";

    // Spring Security role expressions (with ROLE_ prefix for hasRole)
    public static final String HAS_ROLE_NORMAL = "hasRole('NORMAL')";
    public static final String HAS_ROLE_VIP = "hasRole('VIP')";
    public static final String HAS_ROLE_ADMIN = "hasRole('ADMIN')";
    public static final String HAS_ANY_ROLE_ALL = "hasAnyRole('NORMAL', 'VIP', 'ADMIN')";
    public static final String HAS_ANY_ROLE_VIP_ADMIN = "hasAnyRole('VIP', 'ADMIN')";

    private RoleConstants() {
        // Utility class - prevent instantiation
    }
}

