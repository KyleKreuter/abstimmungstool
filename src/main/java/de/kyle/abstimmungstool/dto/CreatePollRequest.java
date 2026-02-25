package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for creating a new poll.
 */
public record CreatePollRequest(
        String title,
        String description
) {
}
