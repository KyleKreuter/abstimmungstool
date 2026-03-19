package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.dto.PollResultResponse;
import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollOption;
import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.PollType;
import de.kyle.abstimmungstool.entity.Vote;
import de.kyle.abstimmungstool.entity.VotingCode;
import de.kyle.abstimmungstool.repository.PollOptionRepository;
import de.kyle.abstimmungstool.repository.VoteRepository;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service for casting and managing votes.
 * Ensures anonymity by never exposing code-to-vote mappings externally.
 */
@Service
@Transactional
public class VoteService {

    private final VoteRepository voteRepository;
    private final VotingCodeRepository votingCodeRepository;
    private final PollOptionRepository pollOptionRepository;
    private final PollService pollService;
    private final WebSocketEventService webSocketEventService;

    public VoteService(VoteRepository voteRepository,
                       VotingCodeRepository votingCodeRepository,
                       PollOptionRepository pollOptionRepository,
                       PollService pollService,
                       WebSocketEventService webSocketEventService) {
        this.voteRepository = voteRepository;
        this.votingCodeRepository = votingCodeRepository;
        this.pollOptionRepository = pollOptionRepository;
        this.pollService = pollService;
        this.webSocketEventService = webSocketEventService;
    }

    /**
     * Casts votes on a poll using a voting code.
     * For SIMPLE/PERSON_ELECTION: exactly one optionId.
     * For MULTI_VOTE: 1 to maxChoices optionIds.
     */
    public List<Vote> castVote(Long pollId, Long votingCodeId, List<Long> optionIds) {
        Poll poll = pollService.getPollById(pollId);
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));

        if (poll.getStatus() != PollStatus.OPEN) {
            throw new IllegalStateException("Votes can only be cast on OPEN polls. Current status: " + poll.getStatus());
        }

        if (!votingCode.getGroup().getId().equals(poll.getGroup().getId())) {
            throw new IllegalArgumentException("Voting code does not belong to the poll's group.");
        }

        if (voteRepository.existsByPollAndVotingCode(poll, votingCode)) {
            throw new IllegalStateException("This voting code has already voted on this poll.");
        }

        validateOptionIds(poll, optionIds);

        List<Vote> votes = createVotes(poll, votingCode, optionIds);

        broadcastVoteCounts(poll);

        return votes;
    }

    /**
     * Changes existing votes on a poll. Deletes all previous votes and creates new ones.
     */
    public List<Vote> changeVote(Long pollId, Long votingCodeId, List<Long> optionIds) {
        Poll poll = pollService.getPollById(pollId);
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));

        if (poll.getStatus() != PollStatus.OPEN) {
            throw new IllegalStateException("Votes can only be changed on OPEN polls. Current status: " + poll.getStatus());
        }

        if (!voteRepository.existsByPollAndVotingCode(poll, votingCode)) {
            throw new EntityNotFoundException("No existing vote found for this poll and voting code.");
        }

        validateOptionIds(poll, optionIds);

        voteRepository.deleteByPollAndVotingCode(poll, votingCode);
        voteRepository.flush();

        List<Vote> votes = createVotes(poll, votingCode, optionIds);

        broadcastVoteCounts(poll);

        return votes;
    }

    @Transactional(readOnly = true)
    public List<Vote> getMyVotes(Long votingCodeId) {
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));
        return voteRepository.findByVotingCode(votingCode);
    }

    @Transactional(readOnly = true)
    public List<Vote> getVotesForPoll(Long pollId, Long votingCodeId) {
        Poll poll = pollService.getPollById(pollId);
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));
        return voteRepository.findByPollAndVotingCode(poll, votingCode);
    }

    /**
     * Builds a result response with per-option counts for a poll.
     */
    @Transactional(readOnly = true)
    public PollResultResponse countVotes(Long pollId) {
        Poll poll = pollService.getPollById(pollId);
        return pollService.buildResults(poll);
    }

    private void validateOptionIds(Poll poll, List<Long> optionIds) {
        if (optionIds == null || optionIds.isEmpty()) {
            throw new IllegalArgumentException("At least one option must be selected.");
        }

        Set<Long> uniqueIds = new HashSet<>(optionIds);
        if (uniqueIds.size() != optionIds.size()) {
            throw new IllegalArgumentException("Duplicate option selections are not allowed.");
        }

        Set<Long> validOptionIds = new HashSet<>();
        for (PollOption option : poll.getOptions()) {
            validOptionIds.add(option.getId());
        }

        for (Long optionId : optionIds) {
            if (!validOptionIds.contains(optionId)) {
                throw new IllegalArgumentException("Option " + optionId + " does not belong to this poll.");
            }
        }

        PollType type = poll.getType();
        int maxChoices = poll.getMaxChoices() != null ? poll.getMaxChoices() : 1;

        if (type == PollType.SIMPLE || type == PollType.PERSON_ELECTION) {
            if (optionIds.size() != 1) {
                throw new IllegalArgumentException("Exactly one option must be selected for this poll type.");
            }
        } else if (type == PollType.MULTI_VOTE) {
            if (optionIds.size() > maxChoices) {
                throw new IllegalArgumentException("At most " + maxChoices + " options can be selected.");
            }
        }
    }

    private List<Vote> createVotes(Poll poll, VotingCode votingCode, List<Long> optionIds) {
        LocalDateTime now = LocalDateTime.now();
        List<Vote> votes = new ArrayList<>();

        for (Long optionId : optionIds) {
            PollOption pollOption = pollOptionRepository.findById(optionId)
                    .orElseThrow(() -> new EntityNotFoundException("PollOption not found: " + optionId));

            Vote vote = new Vote();
            vote.setPoll(poll);
            vote.setVotingCode(votingCode);
            vote.setPollOption(pollOption);
            vote.setVotedAt(now);
            votes.add(voteRepository.save(vote));
        }

        return votes;
    }

    private void broadcastVoteCounts(Poll poll) {
        PollResultResponse results = pollService.buildResults(poll);
        webSocketEventService.broadcastVoteCount(poll.getId(), results);
    }
}
