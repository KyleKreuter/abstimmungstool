package de.kyle.abstimmungstool.repository;

import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.VotingCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VotingCodeRepository extends JpaRepository<VotingCode, Long> {

    Optional<VotingCode> findByCode(String code);

    List<VotingCode> findByGroup(PollGroup group);

    long countByGroup(PollGroup group);
}
