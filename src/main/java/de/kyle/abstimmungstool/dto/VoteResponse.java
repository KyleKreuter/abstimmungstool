package de.kyle.abstimmungstool.dto;

import de.kyle.abstimmungstool.entity.VoteOption;

import java.time.LocalDateTime;

/**
 * Response DTO for a vote.
 */
public record VoteResponse(
        Long pollId,
        String pollTitle,
        VoteOption option,
        LocalDateTime votedAt
) {
}
