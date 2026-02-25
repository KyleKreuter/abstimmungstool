package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.Vote;
import de.kyle.abstimmungstool.entity.VoteOption;
import de.kyle.abstimmungstool.entity.VotingCode;
import de.kyle.abstimmungstool.repository.VoteRepository;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for casting and managing votes.
 * Ensures anonymity by never exposing code-to-vote mappings externally.
 */
@Service
@Transactional
public class VoteService {

    private final VoteRepository voteRepository;
    private final VotingCodeRepository votingCodeRepository;
    private final PollService pollService;
    private final WebSocketEventService webSocketEventService;

    public VoteService(VoteRepository voteRepository,
                       VotingCodeRepository votingCodeRepository,
                       PollService pollService,
                       WebSocketEventService webSocketEventService) {
        this.voteRepository = voteRepository;
        this.votingCodeRepository = votingCodeRepository;
        this.pollService = pollService;
        this.webSocketEventService = webSocketEventService;
    }

    /**
     * Casts a vote on a poll using a voting code.
     *
     * @param pollId       the poll ID
     * @param votingCodeId the voting code ID
     * @param option       the vote option (YES, NO, ABSTAIN)
     * @return the created vote
     * @throws EntityNotFoundException if the poll or voting code does not exist
     * @throws IllegalStateException   if the poll is not OPEN
     * @throws IllegalArgumentException if the voting code does not belong to the poll's group
     * @throws IllegalStateException   if the voting code has already voted on this poll
     */
    public Vote castVote(Long pollId, Long votingCodeId, VoteOption option) {
        Poll poll = pollService.getPollById(pollId);
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));

        // Validate poll is OPEN
        if (poll.getStatus() != PollStatus.OPEN) {
            throw new IllegalStateException("Votes can only be cast on OPEN polls. Current status: " + poll.getStatus());
        }

        // Validate voting code belongs to poll's group
        if (!votingCode.getGroup().getId().equals(poll.getGroup().getId())) {
            throw new IllegalArgumentException("Voting code does not belong to the poll's group.");
        }

        // Validate not already voted
        if (voteRepository.existsByPollAndVotingCode(poll, votingCode)) {
            throw new IllegalStateException("This voting code has already voted on this poll.");
        }

        Vote vote = new Vote();
        vote.setPoll(poll);
        vote.setVotingCode(votingCode);
        vote.setOption(option);
        vote.setVotedAt(LocalDateTime.now());
        Vote saved = voteRepository.save(vote);

        // Broadcast updated total vote count
        long totalCount = voteRepository.countByPoll(poll);
        webSocketEventService.broadcastVoteCount(pollId, totalCount);

        return saved;
    }

    /**
     * Changes an existing vote on a poll. Only allowed if the poll is still OPEN.
     *
     * @param pollId       the poll ID
     * @param votingCodeId the voting code ID
     * @param option       the new vote option
     * @return the updated vote
     * @throws EntityNotFoundException if the poll, voting code, or existing vote does not exist
     * @throws IllegalStateException   if the poll is not OPEN
     */
    public Vote changeVote(Long pollId, Long votingCodeId, VoteOption option) {
        Poll poll = pollService.getPollById(pollId);
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));

        if (poll.getStatus() != PollStatus.OPEN) {
            throw new IllegalStateException("Votes can only be changed on OPEN polls. Current status: " + poll.getStatus());
        }

        Vote existingVote = voteRepository.findByPollAndVotingCode(poll, votingCode)
                .orElseThrow(() -> new EntityNotFoundException("No existing vote found for this poll and voting code."));

        existingVote.setOption(option);
        Vote saved = voteRepository.save(existingVote);

        // Broadcast updated total vote count
        long totalCount = voteRepository.countByPoll(poll);
        webSocketEventService.broadcastVoteCount(pollId, totalCount);

        return saved;
    }

    /**
     * Returns all votes for a specific voting code.
     *
     * @param votingCodeId the voting code ID
     * @return list of votes
     * @throws EntityNotFoundException if the voting code does not exist
     */
    @Transactional(readOnly = true)
    public List<Vote> getMyVotes(Long votingCodeId) {
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));
        return voteRepository.findByVotingCode(votingCode);
    }

    /**
     * Returns the vote for a specific poll and voting code, if it exists.
     *
     * @param pollId       the poll ID
     * @param votingCodeId the voting code ID
     * @return optional containing the vote if found
     * @throws EntityNotFoundException if the poll or voting code does not exist
     */
    @Transactional(readOnly = true)
    public Optional<Vote> getVoteForPoll(Long pollId, Long votingCodeId) {
        Poll poll = pollService.getPollById(pollId);
        VotingCode votingCode = votingCodeRepository.findById(votingCodeId)
                .orElseThrow(() -> new EntityNotFoundException("VotingCode not found with id: " + votingCodeId));
        return voteRepository.findByPollAndVotingCode(poll, votingCode);
    }

    /**
     * Counts votes per option for a poll. Returns 0 for options with no votes.
     *
     * @param pollId the poll ID
     * @return a map of VoteOption to count
     * @throws EntityNotFoundException if the poll does not exist
     */
    @Transactional(readOnly = true)
    public Map<VoteOption, Long> countVotes(Long pollId) {
        Poll poll = pollService.getPollById(pollId);

        Map<VoteOption, Long> counts = new EnumMap<>(VoteOption.class);
        counts.put(VoteOption.YES, voteRepository.countByPollAndOption(poll, VoteOption.YES));
        counts.put(VoteOption.NO, voteRepository.countByPollAndOption(poll, VoteOption.NO));
        counts.put(VoteOption.ABSTAIN, voteRepository.countByPollAndOption(poll, VoteOption.ABSTAIN));
        return counts;
    }
}
