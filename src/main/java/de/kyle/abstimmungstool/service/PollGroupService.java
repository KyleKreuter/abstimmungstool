package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.repository.PollGroupRepository;
import de.kyle.abstimmungstool.repository.PollRepository;
import de.kyle.abstimmungstool.repository.VoteRepository;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
import de.kyle.abstimmungstool.exception.DuplicateException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for managing poll groups (e.g. 'LMV 20.02.2026').
 */
@Service
@Transactional
public class PollGroupService {

    private final PollGroupRepository pollGroupRepository;
    private final PollRepository pollRepository;
    private final VoteRepository voteRepository;
    private final VotingCodeRepository votingCodeRepository;

    public PollGroupService(PollGroupRepository pollGroupRepository,
                            PollRepository pollRepository,
                            VoteRepository voteRepository,
                            VotingCodeRepository votingCodeRepository) {
        this.pollGroupRepository = pollGroupRepository;
        this.pollRepository = pollRepository;
        this.voteRepository = voteRepository;
        this.votingCodeRepository = votingCodeRepository;
    }

    /**
     * Creates a new poll group with the given name.
     *
     * @param name the group name
     * @return the created poll group
     */
    public PollGroup createGroup(String name) {
        if (pollGroupRepository.existsByNameIgnoreCase(name)) {
            throw new DuplicateException("Eine Gruppe mit dem Namen \"" + name + "\" existiert bereits.");
        }

        PollGroup group = new PollGroup();
        group.setName(name);
        group.setCreatedAt(LocalDateTime.now());
        return pollGroupRepository.save(group);
    }

    /**
     * Renames an existing poll group.
     *
     * @param id   the group ID
     * @param name the new name
     * @return the updated poll group
     * @throws EntityNotFoundException if the group does not exist
     */
    public PollGroup renameGroup(Long id, String name) {
        PollGroup group = getGroupById(id);
        group.setName(name);
        return pollGroupRepository.save(group);
    }

    /**
     * Deletes a poll group and all associated data (votes, polls, voting codes).
     *
     * @param id the group ID
     * @throws EntityNotFoundException if the group does not exist
     */
    public void deleteGroup(Long id) {
        PollGroup group = getGroupById(id);

        // Delete votes first (they reference polls and voting codes)
        var polls = pollRepository.findByGroup(group);
        if (!polls.isEmpty()) {
            voteRepository.deleteByPollIn(polls);
        }

        // Delete polls and voting codes
        pollRepository.deleteByGroup(group);
        votingCodeRepository.deleteByGroup(group);

        // Delete the group itself
        pollGroupRepository.delete(group);
    }

    /**
     * Returns all poll groups.
     *
     * @return list of all poll groups
     */
    @Transactional(readOnly = true)
    public List<PollGroup> getAllGroups() {
        return pollGroupRepository.findAll();
    }

    /**
     * Retrieves a poll group by its ID.
     *
     * @param id the group ID
     * @return the poll group
     * @throws EntityNotFoundException if the group does not exist
     */
    @Transactional(readOnly = true)
    public PollGroup getGroupById(Long id) {
        return pollGroupRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("PollGroup not found with id: " + id));
    }
}
