package de.kyle.abstimmungstool.dto;

public record PollOptionResponse(
        Long id,
        String label,
        String optionKey,
        int sortOrder
) {
}
