package de.kyle.abstimmungstool.dto;

import java.time.LocalDateTime;

/**
 * Response DTO for a poll group.
 */
public record PollGroupResponse(
        Long id,
        String name,
        LocalDateTime createdAt,
        long pollCount,
        long codeCount,
        long activeCodeCount
) {
}
