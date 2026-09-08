package com.tripplanner.common;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

/**
 * JwtAuthFilter puts the authenticated user's id (a UUID) directly as the
 * Authentication principal, so this is a tiny helper to read it back out
 * without every controller/service repeating the SecurityContextHolder dance.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static UUID id() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UUID uuid) {
            return uuid;
        }
        throw ApiException.unauthorized("No authenticated user");
    }
}
