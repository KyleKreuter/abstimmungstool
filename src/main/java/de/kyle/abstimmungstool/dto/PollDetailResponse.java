package de.kyle.abstimmungstool.dto;

import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.PollType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for a poll with detailed result information.
 */
public record PollDetailResponse(
        Long id,
        String title,
        String description,
        String notes,
        PollStatus status,
        PollType type,
        Integer maxChoices,
        List<PollOptionResponse> options,
        Long groupId,
        String groupName,
        PollResultResponse results,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
