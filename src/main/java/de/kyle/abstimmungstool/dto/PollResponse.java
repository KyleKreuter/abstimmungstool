package de.kyle.abstimmungstool.dto;

import de.kyle.abstimmungstool.entity.PollStatus;

import java.time.LocalDateTime;

/**
 * Response DTO for a poll (without detailed results).
 */
public record PollResponse(
        Long id,
        String title,
        String description,
        String notes,
        PollStatus status,
        Long groupId,
        String groupName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
