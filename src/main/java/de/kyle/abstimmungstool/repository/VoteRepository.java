package de.kyle.abstimmungstool.repository;

import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollOption;
import de.kyle.abstimmungstool.entity.Vote;
import de.kyle.abstimmungstool.entity.VotingCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VoteRepository extends JpaRepository<Vote, Long> {

    long countByPoll(Poll poll);

    long countByPollAndPollOption(Poll poll, PollOption pollOption);

    boolean existsByPollAndVotingCode(Poll poll, VotingCode votingCode);

    long countByPollAndVotingCode(Poll poll, VotingCode votingCode);

    List<Vote> findByPollAndVotingCode(Poll poll, VotingCode votingCode);

    List<Vote> findByVotingCode(VotingCode votingCode);

    void deleteByPoll(Poll poll);

    void deleteByPollIn(List<Poll> polls);

    void deleteByPollAndVotingCode(Poll poll, VotingCode votingCode);
}
