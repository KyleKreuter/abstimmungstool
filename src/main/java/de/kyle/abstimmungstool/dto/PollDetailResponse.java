package de.kyle.abstimmungstool.dto;

import de.kyle.abstimmungstool.entity.PollStatus;

import java.time.LocalDateTime;

/**
 * Response DTO for a poll with detailed result information.
 */
public record PollDetailResponse(
        Long id,
        String title,
        String description,
        String notes,
        PollStatus status,
        Long groupId,
        String groupName,
        PollResultResponse results,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
