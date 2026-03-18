import { get, post, put, patch, del } from "./api";
import type {
  PageResponse,
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

/** Fetch poll groups (paginated) */
export function fetchGroups(
  page: number = 0,
  size: number = 20
): Promise<PageResponse<PollGroupResponse>> {
  return get<PageResponse<PollGroupResponse>>(
    `/api/admin/groups?page=${page}&size=${size}`
  );
}

/** Fetch all poll groups (non-paginated, for dropdowns) */
export function fetchAllGroups(): Promise<PageResponse<PollGroupResponse>> {
  return get<PageResponse<PollGroupResponse>>(
    `/api/admin/groups?page=0&size=1000`
  );
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

/** Fetch polls (paginated), optionally filtered by group */
export function fetchPolls(
  page: number = 0,
  size: number = 20,
  groupId?: number
): Promise<PageResponse<PollResponse>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (groupId != null) {
    params.set("groupId", String(groupId));
  }
  return get<PageResponse<PollResponse>>(`/api/admin/polls?${params}`);
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

/** Fetch voting codes for a group (paginated with optional search) */
export function fetchCodes(
  groupId: number,
  page: number = 0,
  size: number = 20,
  search?: string
): Promise<PageResponse<VotingCodeResponse>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (search) {
    params.set("search", search);
  }
  return get<PageResponse<VotingCodeResponse>>(
    `/api/admin/groups/${groupId}/codes?${params}`
  );
}

/** Toggle active state of a voting code */
export function toggleCodeActive(
  groupId: number,
  codeId: number
): Promise<VotingCodeResponse> {
  return patch<VotingCodeResponse>(
    `/api/admin/groups/${groupId}/codes/${codeId}/toggle-active`,
    {}
  );
}
