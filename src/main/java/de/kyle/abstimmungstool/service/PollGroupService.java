package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.repository.PollGroupRepository;
import de.kyle.abstimmungstool.repository.PollRepository;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
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
    private final VotingCodeRepository votingCodeRepository;

    public PollGroupService(PollGroupRepository pollGroupRepository,
                            PollRepository pollRepository,
                            VotingCodeRepository votingCodeRepository) {
        this.pollGroupRepository = pollGroupRepository;
        this.pollRepository = pollRepository;
        this.votingCodeRepository = votingCodeRepository;
    }

    /**
     * Creates a new poll group with the given name.
     *
     * @param name the group name
     * @return the created poll group
     */
    public PollGroup createGroup(String name) {
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
     * Deletes a poll group. Only allowed if no polls and no voting codes are assigned.
     *
     * @param id the group ID
     * @throws EntityNotFoundException if the group does not exist
     * @throws IllegalStateException   if the group still has polls or voting codes
     */
    public void deleteGroup(Long id) {
        PollGroup group = getGroupById(id);

        long pollCount = pollRepository.findByGroup(group).size();
        if (pollCount > 0) {
            throw new IllegalStateException("Cannot delete group: it still has " + pollCount + " poll(s) assigned.");
        }

        long codeCount = votingCodeRepository.countByGroup(group);
        if (codeCount > 0) {
            throw new IllegalStateException("Cannot delete group: it still has " + codeCount + " voting code(s) assigned.");
        }

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
