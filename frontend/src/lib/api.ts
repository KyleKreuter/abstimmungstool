import type { ErrorResponse } from "./types";

const BASE_URL = "http://localhost:4222";

/**
 * Custom error class for API errors that carries the status code
 * and the parsed error response from the server.
 */
export class ApiError extends Error {
  public status: number;
  public body: ErrorResponse;

  constructor(status: number, body: ErrorResponse) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Shared fetch wrapper that handles JSON serialization,
 * credentials (session cookies), and error responses.
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: HeadersInit = {
    Accept: "application/json",
    ...options.headers,
  };

  // Add Content-Type for requests with a body
  if (options.body) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Try to parse JSON body
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!response.ok) {
    if (isJson) {
      const errorBody: ErrorResponse = await response.json();
      throw new ApiError(response.status, errorBody);
    }
    throw new ApiError(response.status, {
      message: response.statusText || "An unknown error occurred",
      status: response.status,
    });
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return undefined as T;
}

// ============================================================
// HTTP helper functions
// ============================================================

/** Send a GET request */
export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

/** Send a POST request with an optional JSON body */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Send a PUT request with an optional JSON body */
export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Send a PATCH request with an optional JSON body */
export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Send a DELETE request */
export function del<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}
