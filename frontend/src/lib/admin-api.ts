import { get, post, put, patch, del } from "./api";
import type {
  PollGroupResponse,
  PollResponse,
  PollDetailResponse,
  VotingCodeResponse,
} from "./types";

// ============================================================
// Groups API
// ============================================================

/** Create a new poll group */
export function createGroup(name: string): Promise<PollGroupResponse> {
  return post<PollGroupResponse>("/api/admin/groups", { name });
}

/** Fetch all poll groups */
export function fetchGroups(): Promise<PollGroupResponse[]> {
  return get<PollGroupResponse[]>("/api/admin/groups");
}

/** Fetch a single poll group by ID */
export function fetchGroup(id: number): Promise<PollGroupResponse> {
  return get<PollGroupResponse>(`/api/admin/groups/${id}`);
}

/** Update a poll group name */
export function updateGroup(
  id: number,
  name: string
): Promise<PollGroupResponse> {
  return put<PollGroupResponse>(`/api/admin/groups/${id}`, { name });
}

/** Delete a poll group (returns 409 if not empty) */
export function deleteGroup(id: number): Promise<void> {
  return del(`/api/admin/groups/${id}`);
}

// ============================================================
// Polls API
// ============================================================

/** Create a new poll within a group */
export function createPoll(
  groupId: number,
  data: { title: string; description: string }
): Promise<PollResponse> {
  return post<PollResponse>(`/api/admin/groups/${groupId}/polls`, data);
}

/** Fetch all polls, optionally filtered by group */
export function fetchPolls(groupId?: number): Promise<PollResponse[]> {
  const query = groupId != null ? `?groupId=${groupId}` : "";
  return get<PollResponse[]>(`/api/admin/polls${query}`);
}

/** Fetch a single poll with full details */
export function fetchPoll(id: number): Promise<PollDetailResponse> {
  return get<PollDetailResponse>(`/api/admin/polls/${id}`);
}

/** Update a poll (only in DRAFT status) */
export function updatePoll(
  id: number,
  data: { title: string; description: string }
): Promise<PollResponse> {
  return put<PollResponse>(`/api/admin/polls/${id}`, data);
}

/** Change the status of a poll */
export function updatePollStatus(
  id: number,
  status: string
): Promise<PollResponse> {
  return patch<PollResponse>(`/api/admin/polls/${id}/status`, { status });
}

/** Delete a PUBLISHED poll */
export function deletePoll(id: number): Promise<void> {
  return del(`/api/admin/polls/${id}`);
}

/** Update admin notes on a poll */
export function updatePollNotes(
  id: number,
  notes: string
): Promise<PollResponse> {
  return put<PollResponse>(`/api/admin/polls/${id}/notes`, { notes });
}

// ============================================================
// Voting Codes API
// ============================================================

/** Generate new voting codes for a group */
export function generateCodes(
  groupId: number,
  count: number
): Promise<VotingCodeResponse[]> {
  return post<VotingCodeResponse[]>(
    `/api/admin/groups/${groupId}/codes/generate`,
    { count }
  );
}

/** Fetch all voting codes for a group */
export function fetchCodes(groupId: number): Promise<VotingCodeResponse[]> {
  return get<VotingCodeResponse[]>(`/api/admin/groups/${groupId}/codes`);
}
