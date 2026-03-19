package de.kyle.abstimmungstool.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a selectable option within a poll.
 * For SIMPLE polls, three options are auto-created (YES/NO/ABSTAIN).
 * For PERSON_ELECTION and MULTI_VOTE, options are defined by the admin.
 */
@Entity
@Table(name = "poll_options")
@Getter
@Setter
@NoArgsConstructor
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "poll_id", nullable = false)
    private Poll poll;

    @Column(nullable = false)
    private String label;

    @Column
    private String optionKey;

    @Column(nullable = false)
    private int sortOrder;
}
