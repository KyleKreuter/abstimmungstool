package de.kyle.abstimmungstool.dto;

/**
 * Response DTO for error responses.
 */
public record ErrorResponse(
        String message,
        int status
) {
}
