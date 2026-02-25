import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type {
  PollStatusEvent,
  PollVoteEvent,
  PollResultEvent,
} from "./types";

const WS_URL = "http://localhost:4222/ws";

// ============================================================
// Topics
// ============================================================
export const TOPICS = {
  /** Global poll status changes */
  POLL_STATUS: "/topic/poll-status",
  /** Live vote counts for a specific poll */
  pollVotes: (pollId: number) => `/topic/poll/${pollId}/votes`,
  /** Result publication for a specific poll */
  pollResults: (pollId: number) => `/topic/poll/${pollId}/results`,
} as const;

// ============================================================
// STOMP Client Singleton
// ============================================================

let client: Client | null = null;

/**
 * Connect to the WebSocket server.
 * Uses SockJS as the transport layer and STOMP as the messaging protocol.
 *
 * @param onConnect - Optional callback invoked once the connection is established
 * @param onError - Optional callback invoked on connection errors
 */
export function connect(
  onConnect?: () => void,
  onError?: (error: string) => void
): void {
  if (client?.connected) {
    onConnect?.();
    return;
  }

  client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,

    onConnect: () => {
      onConnect?.();
    },

    onStompError: (frame) => {
      const message = frame.headers["message"] ?? "WebSocket error";
      console.error("[WebSocket] STOMP error:", message);
      onError?.(message);
    },

    onWebSocketClose: () => {
      console.info("[WebSocket] Connection closed");
    },
  });

  client.activate();
}

/**
 * Disconnect from the WebSocket server.
 */
export function disconnect(): void {
  if (client) {
    client.deactivate();
    client = null;
  }
}

/**
 * Check whether the STOMP client is currently connected.
 */
export function isConnected(): boolean {
  return client?.connected ?? false;
}

// ============================================================
// Subscribe helpers
// ============================================================

/**
 * Subscribe to a topic and receive typed messages.
 *
 * @param destination - STOMP destination (e.g. `/topic/poll-status`)
 * @param callback - Handler for incoming messages
 * @returns A subscription that can be unsubscribed via `.unsubscribe()`
 */
export function subscribe<T>(
  destination: string,
  callback: (payload: T) => void
): StompSubscription {
  if (!client?.connected) {
    throw new Error(
      "WebSocket is not connected. Call connect() before subscribing."
    );
  }

  return client.subscribe(destination, (message: IMessage) => {
    const payload = JSON.parse(message.body) as T;
    callback(payload);
  });
}

/**
 * Subscribe to global poll status changes.
 */
export function subscribePollStatus(
  callback: (event: PollStatusEvent) => void
): StompSubscription {
  return subscribe<PollStatusEvent>(TOPICS.POLL_STATUS, callback);
}

/**
 * Subscribe to live vote updates for a specific poll.
 */
export function subscribePollVotes(
  pollId: number,
  callback: (event: PollVoteEvent) => void
): StompSubscription {
  return subscribe<PollVoteEvent>(TOPICS.pollVotes(pollId), callback);
}

/**
 * Subscribe to result publication for a specific poll.
 */
export function subscribePollResults(
  pollId: number,
  callback: (event: PollResultEvent) => void
): StompSubscription {
  return subscribe<PollResultEvent>(TOPICS.pollResults(pollId), callback);
}
