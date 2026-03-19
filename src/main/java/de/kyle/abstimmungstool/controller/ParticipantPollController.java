package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.CastVoteRequest;
import de.kyle.abstimmungstool.dto.ParticipantPollResponse;
import de.kyle.abstimmungstool.dto.PollOptionResponse;
import de.kyle.abstimmungstool.dto.PollResultResponse;
import de.kyle.abstimmungstool.dto.VoteResponse;
import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.Vote;
import de.kyle.abstimmungstool.repository.PollGroupRepository;
import de.kyle.abstimmungstool.service.PollService;
import de.kyle.abstimmungstool.service.VoteService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for participant-facing poll endpoints.
 * Participants are identified by their voting code stored in the HTTP session.
 */
@RestController
@RequestMapping("/api")
public class ParticipantPollController {

    private static final String SESSION_ATTR_VOTING_CODE_ID = "VOTING_CODE_ID";
    private static final String SESSION_ATTR_POLL_GROUP_ID = "POLL_GROUP_ID";

    private final PollService pollService;
    private final VoteService voteService;
    private final PollGroupRepository pollGroupRepository;

    public ParticipantPollController(PollService pollService,
                                     VoteService voteService,
                                     PollGroupRepository pollGroupRepository) {
        this.pollService = pollService;
        this.voteService = voteService;
        this.pollGroupRepository = pollGroupRepository;
    }

    @GetMapping("/polls")
    public ResponseEntity<List<ParticipantPollResponse>> getPolls(HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        Long pollGroupId = getPollGroupId(session);

        PollGroup group = pollGroupRepository.findById(pollGroupId)
                .orElseThrow(() -> new IllegalStateException("Poll group not found for session."));

        List<Poll> polls = pollService.getPollsForParticipant(group);

        List<ParticipantPollResponse> responses = polls.stream()
                .map(poll -> {
                    List<Vote> myVotes = voteService.getVotesForPoll(poll.getId(), votingCodeId);
                    return toParticipantResponse(poll, myVotes);
                })
                .toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/polls/{id}")
    public ResponseEntity<ParticipantPollResponse> getPoll(@PathVariable Long id,
                                                           HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        Poll poll = pollService.getPollById(id);

        List<Vote> myVotes = voteService.getVotesForPoll(id, votingCodeId);
        return ResponseEntity.ok(toParticipantResponse(poll, myVotes));
    }

    @PostMapping("/polls/{id}/vote")
    public ResponseEntity<List<VoteResponse>> castVote(@PathVariable Long id,
                                                       @RequestBody CastVoteRequest request,
                                                       HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        List<Vote> votes = voteService.castVote(id, votingCodeId, request.optionIds());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(votes.stream().map(this::toVoteResponse).toList());
    }

    @PutMapping("/polls/{id}/vote")
    public ResponseEntity<List<VoteResponse>> changeVote(@PathVariable Long id,
                                                         @RequestBody CastVoteRequest request,
                                                         HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        List<Vote> votes = voteService.changeVote(id, votingCodeId, request.optionIds());
        return ResponseEntity.ok(votes.stream().map(this::toVoteResponse).toList());
    }

    @GetMapping("/polls/{id}/results")
    public ResponseEntity<PollResultResponse> getResults(@PathVariable Long id) {
        return ResponseEntity.ok(pollService.getResults(id));
    }

    @GetMapping("/my-votes")
    public ResponseEntity<List<VoteResponse>> getMyVotes(HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        List<VoteResponse> responses = voteService.getMyVotes(votingCodeId).stream()
                .map(this::toVoteResponse)
                .toList();
        return ResponseEntity.ok(responses);
    }

    private Long getVotingCodeId(HttpSession session) {
        Long votingCodeId = (Long) session.getAttribute(SESSION_ATTR_VOTING_CODE_ID);
        if (votingCodeId == null) {
            throw new IllegalStateException("No voting code found in session. Please login first.");
        }
        return votingCodeId;
    }

    private Long getPollGroupId(HttpSession session) {
        Long pollGroupId = (Long) session.getAttribute(SESSION_ATTR_POLL_GROUP_ID);
        if (pollGroupId == null) {
            throw new IllegalStateException("No poll group found in session. Please login first.");
        }
        return pollGroupId;
    }

    private ParticipantPollResponse toParticipantResponse(Poll poll, List<Vote> votes) {
        List<Long> myVoteOptionIds = votes.isEmpty()
                ? null
                : votes.stream().map(v -> v.getPollOption().getId()).toList();

        List<PollOptionResponse> options = poll.getOptions().stream()
                .map(o -> new PollOptionResponse(o.getId(), o.getLabel(), o.getOptionKey(), o.getSortOrder()))
                .toList();

        return new ParticipantPollResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getStatus(),
                poll.getType(),
                poll.getMaxChoices(),
                options,
                myVoteOptionIds
        );
    }

    private VoteResponse toVoteResponse(Vote vote) {
        return new VoteResponse(
                vote.getPoll().getId(),
                vote.getPoll().getTitle(),
                vote.getPollOption().getId(),
                vote.getPollOption().getLabel(),
                vote.getVotedAt()
        );
    }
}
