package de.kyle.abstimmungstool.controller;

import de.kyle.abstimmungstool.dto.CastVoteRequest;
import de.kyle.abstimmungstool.dto.ParticipantPollResponse;
import de.kyle.abstimmungstool.dto.PollResultResponse;
import de.kyle.abstimmungstool.dto.VoteResponse;
import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.Vote;
import de.kyle.abstimmungstool.entity.VoteOption;
import de.kyle.abstimmungstool.repository.PollGroupRepository;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
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
import java.util.Map;
import java.util.Optional;

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
    private final VotingCodeRepository votingCodeRepository;
    private final PollGroupRepository pollGroupRepository;

    public ParticipantPollController(PollService pollService,
                                     VoteService voteService,
                                     VotingCodeRepository votingCodeRepository,
                                     PollGroupRepository pollGroupRepository) {
        this.pollService = pollService;
        this.voteService = voteService;
        this.votingCodeRepository = votingCodeRepository;
        this.pollGroupRepository = pollGroupRepository;
    }

    /**
     * Returns all OPEN and PUBLISHED polls for the participant's group, including their own vote.
     */
    @GetMapping("/polls")
    public ResponseEntity<List<ParticipantPollResponse>> getPolls(HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        Long pollGroupId = getPollGroupId(session);

        PollGroup group = pollGroupRepository.findById(pollGroupId)
                .orElseThrow(() -> new IllegalStateException("Poll group not found for session."));

        List<Poll> polls = pollService.getPollsForParticipant(group);

        List<ParticipantPollResponse> responses = polls.stream()
                .map(poll -> {
                    Optional<Vote> myVote = voteService.getVoteForPoll(poll.getId(), votingCodeId);
                    return toParticipantResponse(poll, myVote.orElse(null));
                })
                .toList();

        return ResponseEntity.ok(responses);
    }

    /**
     * Returns a single poll with the participant's own vote if it exists.
     */
    @GetMapping("/polls/{id}")
    public ResponseEntity<ParticipantPollResponse> getPoll(@PathVariable Long id,
                                                           HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        Poll poll = pollService.getPollById(id);

        Optional<Vote> myVote = voteService.getVoteForPoll(id, votingCodeId);
        return ResponseEntity.ok(toParticipantResponse(poll, myVote.orElse(null)));
    }

    /**
     * Casts a vote on a poll.
     */
    @PostMapping("/polls/{id}/vote")
    public ResponseEntity<VoteResponse> castVote(@PathVariable Long id,
                                                 @RequestBody CastVoteRequest request,
                                                 HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        VoteOption option = VoteOption.valueOf(request.option().toUpperCase());

        Vote vote = voteService.castVote(id, votingCodeId, option);
        return ResponseEntity.status(HttpStatus.CREATED).body(toVoteResponse(vote));
    }

    /**
     * Changes an existing vote on a poll.
     */
    @PutMapping("/polls/{id}/vote")
    public ResponseEntity<VoteResponse> changeVote(@PathVariable Long id,
                                                   @RequestBody CastVoteRequest request,
                                                   HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);
        VoteOption option = VoteOption.valueOf(request.option().toUpperCase());

        Vote vote = voteService.changeVote(id, votingCodeId, option);
        return ResponseEntity.ok(toVoteResponse(vote));
    }

    /**
     * Returns the results for a poll. Only available for PUBLISHED polls.
     */
    @GetMapping("/polls/{id}/results")
    public ResponseEntity<PollResultResponse> getResults(@PathVariable Long id) {
        Map<VoteOption, Long> results = pollService.getResults(id);

        long yesCount = results.getOrDefault(VoteOption.YES, 0L);
        long noCount = results.getOrDefault(VoteOption.NO, 0L);
        long abstainCount = results.getOrDefault(VoteOption.ABSTAIN, 0L);
        long totalCount = yesCount + noCount + abstainCount;

        return ResponseEntity.ok(new PollResultResponse(yesCount, noCount, abstainCount, totalCount));
    }

    /**
     * Returns all votes cast by the current participant.
     */
    @GetMapping("/my-votes")
    public ResponseEntity<List<VoteResponse>> getMyVotes(HttpSession session) {
        Long votingCodeId = getVotingCodeId(session);

        List<VoteResponse> responses = voteService.getMyVotes(votingCodeId).stream()
                .map(this::toVoteResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    /**
     * Extracts the voting code ID from the HTTP session.
     */
    private Long getVotingCodeId(HttpSession session) {
        Long votingCodeId = (Long) session.getAttribute(SESSION_ATTR_VOTING_CODE_ID);
        if (votingCodeId == null) {
            throw new IllegalStateException("No voting code found in session. Please login first.");
        }
        return votingCodeId;
    }

    /**
     * Extracts the poll group ID from the HTTP session.
     */
    private Long getPollGroupId(HttpSession session) {
        Long pollGroupId = (Long) session.getAttribute(SESSION_ATTR_POLL_GROUP_ID);
        if (pollGroupId == null) {
            throw new IllegalStateException("No poll group found in session. Please login first.");
        }
        return pollGroupId;
    }

    /**
     * Converts a Poll entity and an optional Vote to a ParticipantPollResponse DTO.
     */
    private ParticipantPollResponse toParticipantResponse(Poll poll, Vote vote) {
        return new ParticipantPollResponse(
                poll.getId(),
                poll.getTitle(),
                poll.getDescription(),
                poll.getStatus(),
                vote != null ? vote.getOption() : null
        );
    }

    /**
     * Converts a Vote entity to a VoteResponse DTO.
     */
    private VoteResponse toVoteResponse(Vote vote) {
        return new VoteResponse(
                vote.getPoll().getId(),
                vote.getPoll().getTitle(),
                vote.getOption(),
                vote.getVotedAt()
        );
    }
}
