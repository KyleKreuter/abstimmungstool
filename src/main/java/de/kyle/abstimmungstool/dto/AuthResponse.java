package de.kyle.abstimmungstool.dto;

/**
 * Response DTO for authentication endpoints.
 */
public record AuthResponse(
        String role,
        String message
) {
}
