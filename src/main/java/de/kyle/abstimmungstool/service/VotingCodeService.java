package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.VotingCode;
import de.kyle.abstimmungstool.repository.VotingCodeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

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
    private static final int PAYLOAD_LENGTH = CODE_LENGTH - 1;

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
     * Returns voting codes for a group in a paginated fashion.
     *
     * @param groupId  the group ID
     * @param pageable pagination parameters
     * @return page of voting codes
     */
    @Transactional(readOnly = true)
    public Page<VotingCode> getCodesByGroup(Long groupId, Pageable pageable) {
        PollGroup group = pollGroupService.getGroupById(groupId);
        return votingCodeRepository.findByGroup(group, pageable);
    }

    /**
     * Searches voting codes for a group by code string, paginated.
     *
     * @param groupId  the group ID
     * @param search   the search string to match against code
     * @param pageable pagination parameters
     * @return page of matching voting codes
     */
    @Transactional(readOnly = true)
    public Page<VotingCode> searchCodesByGroup(Long groupId, String search, Pageable pageable) {
        PollGroup group = pollGroupService.getGroupById(groupId);
        return votingCodeRepository.findByGroupAndCodeContainingIgnoreCase(group, search, pageable);
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
     * Toggles the active state of a voting code.
     *
     * @param codeId the voting code ID
     * @return the updated voting code
     * @throws EntityNotFoundException if the code does not exist
     */
    public VotingCode toggleActive(Long codeId) {
        VotingCode code = votingCodeRepository.findById(codeId)
                .orElseThrow(() -> new EntityNotFoundException("Voting code not found: " + codeId));
        code.setActive(!code.isActive());
        return votingCodeRepository.save(code);
    }

    /**
     * Generates a random 8-character code: 7 random characters + 1 checksum character.
     * The checksum allows immediate rejection of invalid codes without a database lookup.
     */
    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < PAYLOAD_LENGTH; i++) {
            int index = secureRandom.nextInt(CODE_CHARACTERS.length());
            sb.append(CODE_CHARACTERS.charAt(index));
        }
        sb.append(computeCheckChar(sb.toString()));
        return sb.toString();
    }

    /**
     * Computes a check character for the given payload using a weighted sum modulo 36.
     * Each character is multiplied by its 1-based position to ensure transposition detection.
     */
    private static char computeCheckChar(String payload) {
        int sum = 0;
        for (int i = 0; i < payload.length(); i++) {
            sum += CODE_CHARACTERS.indexOf(payload.charAt(i)) * (i + 1);
        }
        return CODE_CHARACTERS.charAt(sum % CODE_CHARACTERS.length());
    }

    /**
     * Validates that a code has a correct checksum structure.
     * Returns false for codes that could not have been generated by this system.
     */
    public static boolean isChecksumValid(String code) {
        if (code == null || code.length() != CODE_LENGTH) {
            return false;
        }
        String payload = code.substring(0, PAYLOAD_LENGTH);
        char expectedCheck = computeCheckChar(payload);
        return code.charAt(PAYLOAD_LENGTH) == expectedCheck;
    }
}
