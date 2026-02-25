package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for admin login via username and password.
 */
public record AdminLoginRequest(
        String username,
        String password
) {
}
