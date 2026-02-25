package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.VoteOption;
import de.kyle.abstimmungstool.repository.PollRepository;
import de.kyle.abstimmungstool.repository.VoteRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Service for managing polls and their lifecycle.
 */
@Service
@Transactional
public class PollService {

    private final PollRepository pollRepository;
    private final PollGroupService pollGroupService;
    private final VoteRepository voteRepository;
    private final WebSocketEventService webSocketEventService;

    public PollService(PollRepository pollRepository,
                       PollGroupService pollGroupService,
                       VoteRepository voteRepository,
                       WebSocketEventService webSocketEventService) {
        this.pollRepository = pollRepository;
        this.pollGroupService = pollGroupService;
        this.voteRepository = voteRepository;
        this.webSocketEventService = webSocketEventService;
    }

    /**
     * Creates a new poll in DRAFT status within the given group.
     *
     * @param groupId     the group ID
     * @param title       the poll title
     * @param description the poll description
     * @return the created poll
     * @throws EntityNotFoundException if the group does not exist
     */
    public Poll createPoll(Long groupId, String title, String description) {
        PollGroup group = pollGroupService.getGroupById(groupId);

        Poll poll = new Poll();
        poll.setGroup(group);
        poll.setTitle(title);
        poll.setDescription(description);
        poll.setStatus(PollStatus.DRAFT);
        poll.setCreatedAt(LocalDateTime.now());
        poll.setUpdatedAt(LocalDateTime.now());
        return pollRepository.save(poll);
    }

    /**
     * Updates the title and description of a poll. Only allowed if the poll is in DRAFT status.
     *
     * @param id          the poll ID
     * @param title       the new title
     * @param description the new description
     * @return the updated poll
     * @throws EntityNotFoundException if the poll does not exist
     * @throws IllegalStateException   if the poll is not in DRAFT status
     */
    public Poll updatePoll(Long id, String title, String description) {
        Poll poll = getPollById(id);

        if (poll.getStatus() != PollStatus.DRAFT) {
            throw new IllegalStateException("Poll can only be updated in DRAFT status. Current status: " + poll.getStatus());
        }

        poll.setTitle(title);
        poll.setDescription(description);
        poll.setUpdatedAt(LocalDateTime.now());
        return pollRepository.save(poll);
    }

    /**
     * Updates the notes of a poll (allowed in any status).
     *
     * @param id    the poll ID
     * @param notes the new notes
     * @return the updated poll
     * @throws EntityNotFoundException if the poll does not exist
     */
    public Poll updateNotes(Long id, String notes) {
        Poll poll = getPollById(id);
        poll.setNotes(notes);
        poll.setUpdatedAt(LocalDateTime.now());
        return pollRepository.save(poll);
    }

    /**
     * Changes the status of a poll. Only forward transitions are allowed:
     * DRAFT -> OPEN -> CLOSED -> PUBLISHED.
     * Broadcasts the status change via WebSocket.
     *
     * @param id        the poll ID
     * @param newStatus the new status
     * @return the updated poll
     * @throws EntityNotFoundException if the poll does not exist
     * @throws IllegalStateException   if the transition is not valid
     */
    public Poll changeStatus(Long id, PollStatus newStatus) {
        Poll poll = getPollById(id);
        PollStatus currentStatus = poll.getStatus();

        validateStatusTransition(currentStatus, newStatus);

        poll.setStatus(newStatus);
        poll.setUpdatedAt(LocalDateTime.now());
        Poll saved = pollRepository.save(poll);

        webSocketEventService.broadcastPollStatusChange(saved);

        return saved;
    }

    /**
     * Returns all polls, optionally filtered by group.
     *
     * @param groupId the group ID to filter by, or null for all polls
     * @return list of polls
     */
    @Transactional(readOnly = true)
    public List<Poll> getAllPolls(Long groupId) {
        if (groupId == null) {
            return pollRepository.findAll();
        }
        PollGroup group = pollGroupService.getGroupById(groupId);
        return pollRepository.findByGroup(group);
    }

    /**
     * Retrieves a poll by its ID.
     *
     * @param id the poll ID
     * @return the poll
     * @throws EntityNotFoundException if the poll does not exist
     */
    @Transactional(readOnly = true)
    public Poll getPollById(Long id) {
        return pollRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Poll not found with id: " + id));
    }

    /**
     * Returns polls visible to a participant (only OPEN and PUBLISHED polls in the group).
     *
     * @param group the poll group
     * @return list of visible polls
     */
    @Transactional(readOnly = true)
    public List<Poll> getPollsForParticipant(PollGroup group) {
        return pollRepository.findByGroupAndStatusIn(group, List.of(PollStatus.OPEN, PollStatus.PUBLISHED));
    }

    /**
     * Returns the vote results for a poll. Only allowed if the poll is PUBLISHED.
     *
     * @param pollId the poll ID
     * @return a map of VoteOption to count
     * @throws EntityNotFoundException if the poll does not exist
     * @throws IllegalStateException   if the poll is not in PUBLISHED status
     */
    @Transactional(readOnly = true)
    public Map<VoteOption, Long> getResults(Long pollId) {
        Poll poll = getPollById(pollId);

        if (poll.getStatus() != PollStatus.PUBLISHED) {
            throw new IllegalStateException("Results are only available for PUBLISHED polls. Current status: " + poll.getStatus());
        }

        Map<VoteOption, Long> results = new EnumMap<>(VoteOption.class);
        results.put(VoteOption.YES, voteRepository.countByPollAndOption(poll, VoteOption.YES));
        results.put(VoteOption.NO, voteRepository.countByPollAndOption(poll, VoteOption.NO));
        results.put(VoteOption.ABSTAIN, voteRepository.countByPollAndOption(poll, VoteOption.ABSTAIN));
        return results;
    }

    /**
     * Validates that the status transition is allowed.
     * Only forward transitions: DRAFT -> OPEN -> CLOSED -> PUBLISHED.
     */
    private void validateStatusTransition(PollStatus current, PollStatus target) {
        boolean valid = switch (current) {
            case DRAFT -> target == PollStatus.OPEN;
            case OPEN -> target == PollStatus.CLOSED;
            case CLOSED -> target == PollStatus.PUBLISHED;
            case PUBLISHED -> false;
        };

        if (!valid) {
            throw new IllegalStateException(
                    "Invalid status transition from " + current + " to " + target + ". " +
                            "Only DRAFT->OPEN, OPEN->CLOSED, CLOSED->PUBLISHED are allowed.");
        }
    }
}
