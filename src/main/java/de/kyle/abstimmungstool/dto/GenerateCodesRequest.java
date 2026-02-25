package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for generating voting codes.
 */
public record GenerateCodesRequest(
        int count
) {
}
