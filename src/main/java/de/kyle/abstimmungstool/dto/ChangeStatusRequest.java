package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for changing poll status.
 * Status is provided as a String and parsed to PollStatus enum in the controller.
 */
public record ChangeStatusRequest(
        String status
) {
}
