package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.CreateGroupRequest;
import de.kyle.abstimmungstool.dto.PageResponse;
import de.kyle.abstimmungstool.dto.PollGroupResponse;
import de.kyle.abstimmungstool.dto.UpdateGroupRequest;
import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.repository.PollRepository;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
import de.kyle.abstimmungstool.service.PollGroupService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for managing poll groups (admin endpoints).
 */
@RestController
@RequestMapping("/api/admin/groups")
public class PollGroupController {

    private final PollGroupService pollGroupService;
    private final PollRepository pollRepository;
    private final VotingCodeRepository votingCodeRepository;

    public PollGroupController(PollGroupService pollGroupService,
                               PollRepository pollRepository,
                               VotingCodeRepository votingCodeRepository) {
        this.pollGroupService = pollGroupService;
        this.pollRepository = pollRepository;
        this.votingCodeRepository = votingCodeRepository;
    }

    /**
     * Creates a new poll group.
     */
    @PostMapping
    public ResponseEntity<PollGroupResponse> createGroup(@RequestBody CreateGroupRequest request) {
        PollGroup group = pollGroupService.createGroup(request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(group));
    }

    /**
     * Returns poll groups with poll count and code count, paginated.
     */
    @GetMapping
    public ResponseEntity<PageResponse<PollGroupResponse>> getAllGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PollGroup> groupPage = pollGroupService.getAllGroups(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        PageResponse<PollGroupResponse> response = new PageResponse<>(
                groupPage.getContent().stream().map(this::toResponse).toList(),
                groupPage.getNumber(),
                groupPage.getSize(),
                groupPage.getTotalElements(),
                groupPage.getTotalPages()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Returns a single poll group by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PollGroupResponse> getGroup(@PathVariable Long id) {
        PollGroup group = pollGroupService.getGroupById(id);
        return ResponseEntity.ok(toResponse(group));
    }

    /**
     * Updates a poll group's name.
     */
    @PutMapping("/{id}")
    public ResponseEntity<PollGroupResponse> updateGroup(@PathVariable Long id,
                                                         @RequestBody UpdateGroupRequest request) {
        PollGroup group = pollGroupService.renameGroup(id, request.name());
        return ResponseEntity.ok(toResponse(group));
    }

    /**
     * Deletes a poll group. Returns 409 if the group still has polls or voting codes.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        pollGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Converts a PollGroup entity to a PollGroupResponse DTO.
     */
    private PollGroupResponse toResponse(PollGroup group) {
        long pollCount = pollRepository.findByGroup(group).size();
        long codeCount = votingCodeRepository.countByGroup(group);
        long activeCodeCount = votingCodeRepository.countByGroupAndActiveTrue(group);
        return new PollGroupResponse(
                group.getId(),
                group.getName(),
                group.getCreatedAt(),
                pollCount,
                codeCount,
                activeCodeCount
        );
    }
}
