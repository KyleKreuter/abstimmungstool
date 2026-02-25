package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for updating poll notes.
 */
public record UpdateNotesRequest(
        String notes
) {
}
