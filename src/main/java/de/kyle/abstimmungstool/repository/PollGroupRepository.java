package de.kyle.abstimmungstool.repository;

import de.kyle.abstimmungstool.entity.PollGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PollGroupRepository extends JpaRepository<PollGroup, Long> {
}
