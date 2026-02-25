package de.kyle.abstimmungstool.dto;

import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.VoteOption;

/**
 * Response DTO for a poll as seen by a participant.
 * Includes the participant's own vote if they have voted.
 */
public record ParticipantPollResponse(
        Long id,
        String title,
        String description,
        PollStatus status,
        VoteOption myVote
) {
}
