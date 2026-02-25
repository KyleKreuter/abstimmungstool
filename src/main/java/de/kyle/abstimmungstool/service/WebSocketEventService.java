package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.entity.Poll;
import de.kyle.abstimmungstool.entity.VoteOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service responsible for broadcasting real-time updates via WebSocket.
 * Sends poll status changes, vote counts, and results to subscribed clients.
 */
@Service
public class WebSocketEventService {

    private static final Logger log = LoggerFactory.getLogger(WebSocketEventService.class);

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketEventService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Broadcasts a poll status change to all subscribers.
     *
     * @param poll the poll whose status has changed
     */
    public void broadcastPollStatusChange(Poll poll) {
        log.info("Broadcasting poll status change: pollId={}, status={}", poll.getId(), poll.getStatus());
        messagingTemplate.convertAndSend("/topic/poll-status",
                Map.of("pollId", poll.getId(), "status", poll.getStatus().name()));
    }

    /**
     * Broadcasts the vote counts for a poll including per-option breakdown.
     *
     * @param pollId       the poll ID
     * @param totalCount   the total number of votes
     * @param yesCount     number of YES votes
     * @param noCount      number of NO votes
     * @param abstainCount number of ABSTAIN votes
     */
    public void broadcastVoteCount(Long pollId, long totalCount,
                                    long yesCount, long noCount, long abstainCount) {
        log.info("Broadcasting vote count: pollId={}, totalCount={}", pollId, totalCount);
        messagingTemplate.convertAndSend("/topic/poll/" + pollId + "/votes",
                Map.of("pollId", pollId,
                       "totalVotes", totalCount,
                       "yesCount", yesCount,
                       "noCount", noCount,
                       "abstainCount", abstainCount));
    }

    /**
     * Broadcasts the detailed results for a poll (per-option counts).
     *
     * @param pollId  the poll ID
     * @param results a map of VoteOption to count
     */
    public void broadcastResults(Long pollId, Map<VoteOption, Long> results) {
        log.info("Broadcasting results: pollId={}", pollId);
        messagingTemplate.convertAndSend("/topic/poll/" + pollId + "/results",
                Map.of("pollId", pollId, "results", results));
    }
}
