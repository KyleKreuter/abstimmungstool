package de.kyle.abstimmungstool.dto;

/**
 * Request DTO for participant login via voting code.
 */
public record VotingCodeLoginRequest(
        String code
) {
}
