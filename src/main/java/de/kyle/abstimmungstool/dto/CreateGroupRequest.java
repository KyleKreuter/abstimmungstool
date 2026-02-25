package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for creating a new poll group.
 */
public record CreateGroupRequest(
        String name
) {
}
