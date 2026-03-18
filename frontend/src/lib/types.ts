// ============================================================
// API Response Types
// ============================================================

/** Response from authentication endpoints */
export interface AuthResponse {
  role: string | null;
  message: string;
}

/** User role type */
export type UserRole = "ADMIN" | "PARTICIPANT";

/** Response from GET /api/auth/me when authenticated */
export interface AuthMeResponse {
  authenticated: boolean;
  principal?: string;
  role?: UserRole;
  votingCodeId?: number;
  pollGroupId?: number;
}

/** Response for a poll group (admin view) */
export interface PollGroupResponse {
  id: number;
  name: string;
  createdAt: string;
  pollCount: number;
  codeCount: number;
  activeCodeCount: number;
}

/** Poll status enum */
export type PollStatus = "DRAFT" | "OPEN" | "CLOSED" | "PUBLISHED";

/** Response for a poll (admin view) */
export interface PollResponse {
  id: number;
  title: string;
  description: string;
  notes: string | null;
  status: PollStatus;
  groupId: number;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

/** Poll result summary */
export interface PollResultResponse {
  yesCount: number;
  noCount: number;
  abstainCount: number;
  totalCount: number;
}

/** Detailed poll response including results */
export interface PollDetailResponse extends PollResponse {
  results: PollResultResponse | null;
}

/** Vote option enum */
export type VoteOption = "YES" | "NO" | "ABSTAIN";

/** Participant-facing poll status */
export type ParticipantPollStatus = "OPEN" | "CLOSED" | "PUBLISHED";

/** Response for a poll as seen by a participant */
export interface ParticipantPollResponse {
  id: number;
  title: string;
  description: string;
  status: ParticipantPollStatus;
  myVote: VoteOption | null;
}

/** Response for a vote record */
export interface VoteResponse {
  pollId: number;
  pollTitle: string;
  option: VoteOption;
  votedAt: string;
}

/** Response for a voting code */
export interface VotingCodeResponse {
  id: number;
  code: string;
  groupId: number;
  active: boolean;
}

/** Generic paginated response from the API */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Standard error response from the API */
export interface ErrorResponse {
  message: string;
  status: number;
}

// ============================================================
// WebSocket Message Types
// ============================================================

/** WebSocket event for poll status changes */
export interface PollStatusEvent {
  pollId: number;
  status: PollStatus;
}

/** WebSocket event for vote updates (backend sends per-option breakdown) */
export interface PollVoteEvent {
  pollId: number;
  totalVotes: number;
  yesCount: number;
  noCount: number;
  abstainCount: number;
}

/** WebSocket event for result publication */
export interface PollResultEvent {
  pollId: number;
  results: PollResultResponse;
}
