package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.GenerateCodesRequest;
import de.kyle.abstimmungstool.dto.VotingCodeResponse;
import de.kyle.abstimmungstool.entity.VotingCode;
import de.kyle.abstimmungstool.service.VotingCodeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for managing voting codes (admin endpoints).
 */
@RestController
@RequestMapping("/api/admin/groups")
public class VotingCodeController {

    private final VotingCodeService votingCodeService;

    public VotingCodeController(VotingCodeService votingCodeService) {
        this.votingCodeService = votingCodeService;
    }

    /**
     * Generates a batch of voting codes for a group.
     */
    @PostMapping("/{groupId}/codes/generate")
    public ResponseEntity<List<VotingCodeResponse>> generateCodes(@PathVariable Long groupId,
                                                                  @RequestBody GenerateCodesRequest request) {
        List<VotingCode> codes = votingCodeService.generateCodes(groupId, request.count());
        List<VotingCodeResponse> responses = codes.stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    /**
     * Returns all voting codes for a group.
     */
    @GetMapping("/{groupId}/codes")
    public ResponseEntity<List<VotingCodeResponse>> getCodesByGroup(@PathVariable Long groupId) {
        List<VotingCode> codes = votingCodeService.getCodesByGroup(groupId);
        List<VotingCodeResponse> responses = codes.stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(responses);
    }

    /**
     * Converts a VotingCode entity to a VotingCodeResponse DTO.
     */
    private VotingCodeResponse toResponse(VotingCode code) {
        return new VotingCodeResponse(
                code.getId(),
                code.getCode(),
                code.getGroup().getId()
        );
    }
}
