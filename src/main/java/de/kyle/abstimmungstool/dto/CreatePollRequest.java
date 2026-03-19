package de.kyle.abstimmungstool.dto;

import java.util.List;

/**
 * Request DTO for creating a new poll.
 */
public record CreatePollRequest(
        String title,
        String description,
        String type,
        Integer maxChoices,
        List<PollOptionRequest> options
) {
}
