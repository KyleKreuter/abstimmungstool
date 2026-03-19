package de.kyle.abstimmungstool.repository;

import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.PollOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PollOptionRepository extends JpaRepository<PollOption, Long> {

    List<PollOption> findByPollOrderBySortOrder(Poll poll);
}
