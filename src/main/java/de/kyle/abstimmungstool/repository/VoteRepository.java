package de.kyle.abstimmungstool.repository;

import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.Vote;
import de.kyle.abstimmungstool.entity.VoteOption;
import de.kyle.abstimmungstool.entity.VotingCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VoteRepository extends JpaRepository<Vote, Long> {

    long countByPollAndOption(Poll poll, VoteOption option);

    boolean existsByPollAndVotingCode(Poll poll, VotingCode votingCode);

    Optional<Vote> findByPollAndVotingCode(Poll poll, VotingCode votingCode);

    List<Vote> findByVotingCode(VotingCode votingCode);
}
