package de.kyle.abstimmungstool.dto;

/**
 * Response DTO for a voting code.
 */
public record VotingCodeResponse(
        Long id,
        String code,
        Long groupId
) {
}
