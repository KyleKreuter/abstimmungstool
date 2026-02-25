package de.kyle.abstimmungstool.repository;

import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollGroup;
import de.kyle.abstimmungstool.entity.PollStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PollRepository extends JpaRepository<Poll, Long> {

    List<Poll> findByGroup(PollGroup group);

    List<Poll> findByGroupAndStatusIn(PollGroup group, List<PollStatus> statuses);

    void deleteByGroup(PollGroup group);
}
