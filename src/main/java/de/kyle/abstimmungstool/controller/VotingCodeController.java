package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.GenerateCodesRequest;
import de.kyle.abstimmungstool.dto.PageResponse;
import de.kyle.abstimmungstool.dto.VotingCodeResponse;
import de.kyle.abstimmungstool.entity.VotingCode;
import de.kyle.abstimmungstool.service.VotingCodeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
     * Returns voting codes for a group, paginated with optional search.
     */
    @GetMapping("/{groupId}/codes")
    public ResponseEntity<PageResponse<VotingCodeResponse>> getCodesByGroup(
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        Page<VotingCode> codePage;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "code"));
        if (search != null && !search.isBlank()) {
            codePage = votingCodeService.searchCodesByGroup(groupId, search.trim(), pageRequest);
        } else {
            codePage = votingCodeService.getCodesByGroup(groupId, pageRequest);
        }
        PageResponse<VotingCodeResponse> response = new PageResponse<>(
                codePage.getContent().stream().map(this::toResponse).toList(),
                codePage.getNumber(),
                codePage.getSize(),
                codePage.getTotalElements(),
                codePage.getTotalPages()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Toggles the active state of a voting code.
     */
    @PatchMapping("/{groupId}/codes/{codeId}/toggle-active")
    public ResponseEntity<VotingCodeResponse> toggleActive(@PathVariable Long groupId,
                                                            @PathVariable Long codeId) {
        VotingCode code = votingCodeService.toggleActive(codeId);
        return ResponseEntity.ok(toResponse(code));
    }

    /**
     * Converts a VotingCode entity to a VotingCodeResponse DTO.
     */
    private VotingCodeResponse toResponse(VotingCode code) {
        return new VotingCodeResponse(
                code.getId(),
                code.getCode(),
                code.getGroup().getId(),
                code.isActive()
        );
    }
}
