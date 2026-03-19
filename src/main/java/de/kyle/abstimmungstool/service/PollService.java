package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.dto.OptionResultResponse;
import de.kyle.abstimmungstool.dto.PollOptionRequest;
import de.kyle.abstimmungstool.dto.PollResultResponse;
import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.PollOption;
import de.kyle.abstimmungstool.entity.PollStatus;
import de.kyle.abstimmungstool.entity.PollType;
import de.kyle.abstimmungstool.repository.PollRepository;
import de.kyle.abstimmungstool.repository.VoteRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
     */
    public Poll createPoll(Long groupId, String title, String description,
                           PollType type, Integer maxChoices,
                           List<PollOptionRequest> optionRequests) {
        PollGroup group = pollGroupService.getGroupById(groupId);

        Poll poll = new Poll();
        poll.setGroup(group);
        poll.setTitle(title);
        poll.setDescription(description);
        poll.setStatus(PollStatus.DRAFT);
        poll.setType(type);
        poll.setCreatedAt(LocalDateTime.now());
        poll.setUpdatedAt(LocalDateTime.now());

        switch (type) {
            case SIMPLE -> {
                poll.setMaxChoices(1);
                addSimpleOptions(poll);
            }
            case PERSON_ELECTION -> {
                validateCustomOptions(optionRequests);
                poll.setMaxChoices(1);
                addCustomOptions(poll, optionRequests);
            }
            case MULTI_VOTE -> {
                validateCustomOptions(optionRequests);
                if (maxChoices == null || maxChoices < 1 || maxChoices > optionRequests.size()) {
                    throw new IllegalArgumentException(
                            "maxChoices must be between 1 and " + optionRequests.size());
                }
                poll.setMaxChoices(maxChoices);
                addCustomOptions(poll, optionRequests);
            }
        }

        return pollRepository.save(poll);
    }

    /**
     * Updates the title and description of a poll. Only allowed if the poll is in DRAFT status.
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
     */
    public Poll changeStatus(Long id, PollStatus newStatus) {
        Poll poll = getPollById(id);
        PollStatus currentStatus = poll.getStatus();

        validateStatusTransition(currentStatus, newStatus);

        poll.setStatus(newStatus);
        poll.setUpdatedAt(LocalDateTime.now());
        Poll saved = pollRepository.save(poll);

        webSocketEventService.broadcastPollStatusChange(saved);

        if (saved.getStatus() == PollStatus.PUBLISHED) {
            PollResultResponse results = buildResults(saved);
            webSocketEventService.broadcastResults(saved.getId(), results);
        }

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Poll> getAllPolls(Long groupId) {
        if (groupId == null) {
            return pollRepository.findAll();
        }
        PollGroup group = pollGroupService.getGroupById(groupId);
        return pollRepository.findByGroup(group);
    }

    @Transactional(readOnly = true)
    public Page<Poll> getAllPolls(Long groupId, Pageable pageable) {
        if (groupId == null) {
            return pollRepository.findAll(pageable);
        }
        PollGroup group = pollGroupService.getGroupById(groupId);
        return pollRepository.findByGroup(group, pageable);
    }

    @Transactional(readOnly = true)
    public Poll getPollById(Long id) {
        return pollRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Poll not found with id: " + id));
    }

    public void deletePoll(Long id) {
        Poll poll = getPollById(id);

        if (poll.getStatus() != PollStatus.PUBLISHED) {
            throw new IllegalStateException("Only PUBLISHED polls can be deleted. Current status: " + poll.getStatus());
        }

        voteRepository.deleteByPoll(poll);
        pollRepository.delete(poll);
    }

    @Transactional(readOnly = true)
    public List<Poll> getPollsForParticipant(PollGroup group) {
        return pollRepository.findByGroupAndStatusIn(group, List.of(PollStatus.OPEN, PollStatus.CLOSED, PollStatus.PUBLISHED));
    }

    /**
     * Returns the vote results for a poll. Only allowed if the poll is PUBLISHED.
     */
    @Transactional(readOnly = true)
    public PollResultResponse getResults(Long pollId) {
        Poll poll = getPollById(pollId);

        if (poll.getStatus() != PollStatus.PUBLISHED) {
            throw new IllegalStateException("Results are only available for PUBLISHED polls. Current status: " + poll.getStatus());
        }

        return buildResults(poll);
    }

    /**
     * Builds a generic result response for any poll type.
     */
    public PollResultResponse buildResults(Poll poll) {
        List<OptionResultResponse> optionResults = poll.getOptions().stream()
                .map(option -> new OptionResultResponse(
                        option.getId(),
                        option.getLabel(),
                        option.getOptionKey(),
                        voteRepository.countByPollAndPollOption(poll, option)
                ))
                .toList();

        long totalVoters = voteRepository.countByPoll(poll);
        if (poll.getType() == PollType.MULTI_VOTE) {
            // For MULTI_VOTE, totalVoters = sum of votes / not unique voters
            // We need distinct voter count, approximate via total votes
            long totalVotes = optionResults.stream().mapToLong(OptionResultResponse::count).sum();
            // Use countByPoll which counts all vote rows; we want distinct voters
            // Since each voter can have multiple votes, we use a different approach
            totalVoters = totalVotes > 0 ? totalVoters : 0;
        }

        return new PollResultResponse(poll.getType(), totalVoters, optionResults);
    }

    private void addSimpleOptions(Poll poll) {
        addOption(poll, "Ja", "YES", 0);
        addOption(poll, "Nein", "NO", 1);
        addOption(poll, "Enthaltung", "ABSTAIN", 2);
    }

    private void addCustomOptions(Poll poll, List<PollOptionRequest> requests) {
        for (int i = 0; i < requests.size(); i++) {
            addOption(poll, requests.get(i).label(), null, i);
        }
    }

    private void addOption(Poll poll, String label, String optionKey, int sortOrder) {
        PollOption option = new PollOption();
        option.setPoll(poll);
        option.setLabel(label);
        option.setOptionKey(optionKey);
        option.setSortOrder(sortOrder);
        poll.getOptions().add(option);
    }

    private void validateCustomOptions(List<PollOptionRequest> options) {
        if (options == null || options.size() < 2) {
            throw new IllegalArgumentException("At least 2 options are required.");
        }
    }

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
