package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.ChangeStatusRequest;
import de.kyle.abstimmungstool.dto.CreatePollRequest;
import de.kyle.abstimmungstool.dto.PageResponse;
import de.kyle.abstimmungstool.dto.PollDetailResponse;
import de.kyle.abstimmungstool.dto.PollResponse;
import de.kyle.abstimmungstool.dto.PollResultResponse;
import de.kyle.abstimmungstool.dto.UpdateNotesRequest;
import de.kyle.abstimmungstool.dto.UpdatePollRequest;
import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.VoteOption;
import de.kyle.abstimmungstool.service.PollService;
import de.kyle.abstimmungstool.service.VoteService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST controller for managing polls (admin endpoints).
 */
@RestController
@RequestMapping("/api/admin")
public class PollController {

    private final PollService pollService;
    private final VoteService voteService;

    public PollController(PollService pollService, VoteService voteService) {
        this.pollService = pollService;
        this.voteService = voteService;
    }

    /**
     * Creates a new poll within a group.
     */
    @PostMapping("/groups/{groupId}/polls")
    public ResponseEntity<PollResponse> createPoll(@PathVariable Long groupId,
                                                   @RequestBody CreatePollRequest request) {
        Poll poll = pollService.createPoll(groupId, request.title(), request.description());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(poll));
    }

    /**
     * Updates a poll's title and description. Only allowed if the poll is in DRAFT status.
     */
    @PutMapping("/polls/{id}")
    public ResponseEntity<PollResponse> updatePoll(@PathVariable Long id,
                                                   @RequestBody UpdatePollRequest request) {
        Poll poll = pollService.updatePoll(id, request.title(), request.description());
        return ResponseEntity.ok(toResponse(poll));
    }

    /**
     * Changes the status of a poll.
     */
    @PatchMapping("/polls/{id}/status")
    public ResponseEntity<PollResponse> changeStatus(@PathVariable Long id,
                                                     @RequestBody ChangeStatusRequest request) {
        PollStatus newStatus = PollStatus.valueOf(request.status().toUpperCase());
        Poll poll = pollService.changeStatus(id, newStatus);
        return ResponseEntity.ok(toResponse(poll));
    }

    /**
     * Updates the notes of a poll.
     */
    @PutMapping("/polls/{id}/notes")
    public ResponseEntity<PollResponse> updateNotes(@PathVariable Long id,
                                                    @RequestBody UpdateNotesRequest request) {
        Poll poll = pollService.updateNotes(id, request.notes());
        return ResponseEntity.ok(toResponse(poll));
    }

    /**
     * Returns all polls, optionally filtered by group ID, paginated.
     */
    @GetMapping("/polls")
    public ResponseEntity<PageResponse<PollResponse>> getAllPolls(
            @RequestParam(required = false) Long groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Poll> pollPage = pollService.getAllPolls(groupId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        PageResponse<PollResponse> response = new PageResponse<>(
                pollPage.getContent().stream().map(this::toResponse).toList(),
                pollPage.getNumber(),
                pollPage.getSize(),
                pollPage.getTotalElements(),
                pollPage.getTotalPages()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Deletes a PUBLISHED poll and all associated votes.
     */
    @DeleteMapping("/polls/{id}")
    public ResponseEntity<Void> deletePoll(@PathVariable Long id) {
        pollService.deletePoll(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns a single poll with detailed information including results for OPEN, CLOSED and PUBLISHED polls.
     */
    @GetMapping("/polls/{id}")
    public ResponseEntity<PollDetailResponse> getPoll(@PathVariable Long id) {
        Poll poll = pollService.getPollById(id);
        PollResultResponse results = null;

        if (poll.getStatus() != PollStatus.DRAFT) {
            Map<VoteOption, Long> voteCounts = voteService.countVotes(id);
            long yesCount = voteCounts.getOrDefault(VoteOption.YES, 0L);
            long noCount = voteCounts.getOrDefault(VoteOption.NO, 0L);
            long abstainCount = voteCounts.getOrDefault(VoteOption.ABSTAIN, 0L);
            long totalCount = yesCount + noCount + abstainCount;
            results = new PollResultResponse(yesCount, noCount, abstainCount, totalCount);
        }

        PollDetailResponse response = new PollDetailResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getNotes(),
                poll.getStatus(),
                poll.getGroup().getId(),
                poll.getGroup().getName(),
                results,
                poll.getCreatedAt(),
                poll.getUpdatedAt()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Converts a Poll entity to a PollResponse DTO.
     */
    private PollResponse toResponse(Poll poll) {
        return new PollResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getNotes(),
                poll.getStatus(),
                poll.getGroup().getId(),
                poll.getGroup().getName(),
                poll.getCreatedAt(),
                poll.getUpdatedAt()
        );
    }
}
