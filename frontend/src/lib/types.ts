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

/** Poll type enum */
export type PollType = "SIMPLE" | "PERSON_ELECTION" | "MULTI_VOTE";

/** Response for a poll option */
export interface PollOptionResponse {
  id: number;
  label: string;
  optionKey: string | null;
  sortOrder: number;
}

/** Result for a single option */
export interface OptionResultResponse {
  optionId: number;
  label: string;
  optionKey: string | null;
  count: number;
}

/** Response for a poll (admin view) */
export interface PollResponse {
  id: number;
  title: string;
  description: string;
  notes: string | null;
  status: PollStatus;
  type: PollType;
  maxChoices: number | null;
  options: PollOptionResponse[];
  groupId: number;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

/** Poll result summary */
export interface PollResultResponse {
  type: PollType;
  totalVoters: number;
  optionResults: OptionResultResponse[];
}

/** Detailed poll response including results */
export interface PollDetailResponse extends PollResponse {
  results: PollResultResponse | null;
}

/** Participant-facing poll status */
export type ParticipantPollStatus = "OPEN" | "CLOSED" | "PUBLISHED";

/** Response for a poll as seen by a participant */
export interface ParticipantPollResponse {
  id: number;
  title: string;
  description: string;
  status: ParticipantPollStatus;
  type: PollType;
  maxChoices: number | null;
  options: PollOptionResponse[];
  myVoteOptionIds: number[] | null;
}

/** Response for a vote record */
export interface VoteResponse {
  pollId: number;
  pollTitle: string;
  optionId: number;
  optionLabel: string;
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

/** WebSocket event for vote updates (generic per-option results) */
export interface PollVoteEvent {
  pollId: number;
  results: PollResultResponse;
}

/** WebSocket event for result publication */
export interface PollResultEvent {
  pollId: number;
  results: PollResultResponse;
}
