package de.kyle.abstimmungstool.dto;

import java.time.LocalDateTime;

/**
 * Response DTO for a vote.
 */
public record VoteResponse(
        Long pollId,
        String pollTitle,
        Long optionId,
        String optionLabel,
        LocalDateTime votedAt
) {
}
