package de.kyle.abstimmungstool.dto;

/**
 * Response DTO for poll voting results.
 */
public record PollResultResponse(
        long yesCount,
        long noCount,
        long abstainCount,
        long totalCount
) {
}
