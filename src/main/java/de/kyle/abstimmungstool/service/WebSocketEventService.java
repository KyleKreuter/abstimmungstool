package de.kyle.abstimmungstool.service;

import de.kyle.abstimmungstool.dto.PollResultResponse;
import de.kyle.abstimmungstool.entity.Poll;
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
     */
    public void broadcastPollStatusChange(Poll poll) {
        log.info("Broadcasting poll status change: pollId={}, status={}", poll.getId(), poll.getStatus());
        messagingTemplate.convertAndSend("/topic/poll-status",
                Map.of("pollId", poll.getId(), "status", poll.getStatus().name()));
    }

    /**
     * Broadcasts the vote counts for a poll using the generic result structure.
     */
    public void broadcastVoteCount(Long pollId, PollResultResponse results) {
        log.info("Broadcasting vote count: pollId={}, totalVoters={}", pollId, results.totalVoters());
        messagingTemplate.convertAndSend("/topic/poll/" + pollId + "/votes",
                Map.of("pollId", pollId, "results", results));
    }

    /**
     * Broadcasts the detailed results for a poll on publication.
     */
    public void broadcastResults(Long pollId, PollResultResponse results) {
        log.info("Broadcasting results: pollId={}", pollId);
        messagingTemplate.convertAndSend("/topic/poll/" + pollId + "/results",
                Map.of("pollId", pollId, "results", results));
    }
}
