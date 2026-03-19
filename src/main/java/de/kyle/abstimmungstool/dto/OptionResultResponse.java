package de.kyle.abstimmungstool.dto;

public record OptionResultResponse(
        Long optionId,
        String label,
        String optionKey,
        long count
) {
}
