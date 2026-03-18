package de.kyle.abstimmungstool.repository;

import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.VotingCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VotingCodeRepository extends JpaRepository<VotingCode, Long> {

    Optional<VotingCode> findByCode(String code);

    List<VotingCode> findByGroup(PollGroup group);

    Page<VotingCode> findByGroup(PollGroup group, Pageable pageable);

    Page<VotingCode> findByGroupAndCodeContainingIgnoreCase(PollGroup group, String code, Pageable pageable);

    long countByGroup(PollGroup group);

    long countByGroupAndActiveTrue(PollGroup group);

    void deleteByGroup(PollGroup group);
}
