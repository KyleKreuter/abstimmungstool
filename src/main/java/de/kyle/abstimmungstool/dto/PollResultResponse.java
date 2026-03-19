package de.kyle.abstimmungstool.dto;

import de.kyle.abstimmungstool.entity.PollType;

import java.util.List;

/**
 * Response DTO for poll voting results.
 */
public record PollResultResponse(
        PollType type,
        long totalVoters,
        List<OptionResultResponse> optionResults
) {
}
