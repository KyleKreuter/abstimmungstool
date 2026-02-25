package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for updating an existing poll.
 */
public record UpdatePollRequest(
        String title,
        String description
) {
}
