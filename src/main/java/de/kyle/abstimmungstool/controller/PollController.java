package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.ChangeStatusRequest;
import de.kyle.abstimmungstool.dto.CreatePollRequest;
import de.kyle.abstimmungstool.dto.PageResponse;
import de.kyle.abstimmungstool.dto.PollDetailResponse;
import de.kyle.abstimmungstool.dto.PollOptionResponse;
import de.kyle.abstimmungstool.dto.PollResponse;
import de.kyle.abstimmungstool.dto.PollResultResponse;
import de.kyle.abstimmungstool.dto.UpdateNotesRequest;
import de.kyle.abstimmungstool.dto.UpdatePollRequest;
import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.PollType;
import de.kyle.abstimmungstool.service.PollService;
import de.kyle.abstimmungstool.service.VoteService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.util.HtmlUtils;

import java.util.List;

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

    @PostMapping("/groups/{groupId}/polls")
    public ResponseEntity<PollResponse> createPoll(@PathVariable Long groupId,
                                                   @RequestBody CreatePollRequest request) {
        PollType type = request.type() != null
                ? PollType.valueOf(request.type().toUpperCase())
                : PollType.SIMPLE;

        Poll poll = pollService.createPoll(
                groupId,
                HtmlUtils.htmlEscape(request.title()),
                request.description() != null ? HtmlUtils.htmlEscape(request.description()) : "",
                type,
                request.maxChoices(),
                request.options() != null
                        ? request.options().stream()
                            .map(o -> new de.kyle.abstimmungstool.dto.PollOptionRequest(
                                    HtmlUtils.htmlEscape(o.label())))
                            .toList()
                        : null
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(poll));
    }

    @PutMapping("/polls/{id}")
    public ResponseEntity<PollResponse> updatePoll(@PathVariable Long id,
                                                   @RequestBody UpdatePollRequest request) {
        Poll poll = pollService.updatePoll(id,
                HtmlUtils.htmlEscape(request.title()),
                request.description() != null ? HtmlUtils.htmlEscape(request.description()) : "");
        return ResponseEntity.ok(toResponse(poll));
    }

    @PatchMapping("/polls/{id}/status")
    public ResponseEntity<PollResponse> changeStatus(@PathVariable Long id,
                                                     @RequestBody ChangeStatusRequest request) {
        PollStatus newStatus = PollStatus.valueOf(request.status().toUpperCase());
        Poll poll = pollService.changeStatus(id, newStatus);
        return ResponseEntity.ok(toResponse(poll));
    }

    @PutMapping("/polls/{id}/notes")
    public ResponseEntity<PollResponse> updateNotes(@PathVariable Long id,
                                                    @RequestBody UpdateNotesRequest request) {
        Poll poll = pollService.updateNotes(id, request.notes());
        return ResponseEntity.ok(toResponse(poll));
    }

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

    @DeleteMapping("/polls/{id}")
    public ResponseEntity<Void> deletePoll(@PathVariable Long id) {
        pollService.deletePoll(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/polls/{id}")
    public ResponseEntity<PollDetailResponse> getPoll(@PathVariable Long id) {
        Poll poll = pollService.getPollById(id);
        PollResultResponse results = null;

        if (poll.getStatus() != PollStatus.DRAFT) {
            results = voteService.countVotes(id);
        }

        return ResponseEntity.ok(new PollDetailResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getNotes(),
                poll.getStatus(),
                poll.getType(),
                poll.getMaxChoices(),
                toOptionResponses(poll),
                poll.getGroup().getId(),
                poll.getGroup().getName(),
                results,
                poll.getCreatedAt(),
                poll.getUpdatedAt()
        ));
    }

    private PollResponse toResponse(Poll poll) {
        return new PollResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getNotes(),
                poll.getStatus(),
                poll.getType(),
                poll.getMaxChoices(),
                toOptionResponses(poll),
                poll.getGroup().getId(),
                poll.getGroup().getName(),
                poll.getCreatedAt(),
                poll.getUpdatedAt()
        );
    }

    private List<PollOptionResponse> toOptionResponses(Poll poll) {
        return poll.getOptions().stream()
                .map(o -> new PollOptionResponse(o.getId(), o.getLabel(), o.getOptionKey(), o.getSortOrder()))
                .toList();
    }
}
