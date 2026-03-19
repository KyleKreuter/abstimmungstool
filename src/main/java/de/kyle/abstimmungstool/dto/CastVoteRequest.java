package de.kyle.abstimmungstool.dto;

import java.util.List;

/**
 * Request DTO for casting or changing a vote.
 * For SIMPLE/PERSON_ELECTION: optionIds contains exactly one ID.
 * For MULTI_VOTE: optionIds contains 1 to maxChoices IDs.
 */
public record CastVoteRequest(
        List<Long> optionIds
) {
}
