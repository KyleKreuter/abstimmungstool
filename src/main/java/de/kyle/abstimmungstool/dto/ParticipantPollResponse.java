package de.kyle.abstimmungstool.dto;

import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.PollType;

import java.util.List;

/**
 * Response DTO for a poll as seen by a participant.
 * Includes the participant's own votes if they have voted.
 */
public record ParticipantPollResponse(
        Long id,
        String title,
        String description,
        PollStatus status,
        PollType type,
        Integer maxChoices,
        List<PollOptionResponse> options,
        List<Long> myVoteOptionIds
) {
}
