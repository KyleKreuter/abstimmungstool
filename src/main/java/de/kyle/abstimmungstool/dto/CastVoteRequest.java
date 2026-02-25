package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for casting or changing a vote.
 * Option is provided as a String and parsed to VoteOption enum in the controller.
 */
public record CastVoteRequest(
        String option
) {
}
