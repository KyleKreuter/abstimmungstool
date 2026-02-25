package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.VotingCode;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service for generating and managing voting codes.
 */
@Service
@Transactional
public class VotingCodeService {

    private static final String CODE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 8;

    private final VotingCodeRepository votingCodeRepository;
    private final PollGroupService pollGroupService;
    private final SecureRandom secureRandom;

    public VotingCodeService(VotingCodeRepository votingCodeRepository,
                             PollGroupService pollGroupService) {
        this.votingCodeRepository = votingCodeRepository;
        this.pollGroupService = pollGroupService;
        this.secureRandom = new SecureRandom();
    }

    /**
     * Generates a batch of unique voting codes for a group.
     *
     * @param groupId the group ID
     * @param count   the number of codes to generate
     * @return list of created voting codes
     * @throws jakarta.persistence.EntityNotFoundException if the group does not exist
     */
    public List<VotingCode> generateCodes(Long groupId, int count) {
        PollGroup group = pollGroupService.getGroupById(groupId);

        Set<String> generatedCodes = new HashSet<>();
        List<VotingCode> votingCodes = new ArrayList<>();

        while (votingCodes.size() < count) {
            String code = generateRandomCode();

            // Ensure uniqueness both within this batch and in the database
            if (generatedCodes.contains(code) || votingCodeRepository.findByCode(code).isPresent()) {
                continue;
            }

            generatedCodes.add(code);

            VotingCode votingCode = new VotingCode();
            votingCode.setCode(code);
            votingCode.setGroup(group);
            votingCodes.add(votingCode);
        }

        return votingCodeRepository.saveAll(votingCodes);
    }

    /**
     * Returns all voting codes for a group (without vote details to preserve anonymity).
     *
     * @param groupId the group ID
     * @return list of voting codes
     * @throws jakarta.persistence.EntityNotFoundException if the group does not exist
     */
    @Transactional(readOnly = true)
    public List<VotingCode> getCodesByGroup(Long groupId) {
        PollGroup group = pollGroupService.getGroupById(groupId);
        return votingCodeRepository.findByGroup(group);
    }

    /**
     * Validates a voting code string and returns the corresponding entity.
     *
     * @param code the code string to validate
     * @return the voting code entity
     * @throws IllegalArgumentException if the code is not found
     */
    @Transactional(readOnly = true)
    public VotingCode validateCode(String code) {
        return votingCodeRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Invalid voting code: " + code));
    }

    /**
     * Generates a random 8-character uppercase alphanumeric code.
     */
    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            int index = secureRandom.nextInt(CODE_CHARACTERS.length());
            sb.append(CODE_CHARACTERS.charAt(index));
        }
        return sb.toString();
    }
}
