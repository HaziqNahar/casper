const runtimeDefaultApiBase = "";
const accessTokenKey = "casper.accessToken";
const casperApiPrefix = "/api/v1/casper";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? runtimeDefaultApiBase;

function normalizeBaseUrl(value: string): string {
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = normalizeBaseUrl(rawBaseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function looksLikeHtml(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  return text.startsWith("<!doctype html") || text.startsWith("<html");
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function casperApi(path = ""): string {
  const normalizedPath = path.trim().replace(/^\/+/, "");
  return normalizedPath ? `${casperApiPrefix}/${normalizedPath}` : casperApiPrefix;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(accessTokenKey);
}

export function setAccessToken(token: string | null | undefined): void {
  if (token) {
    localStorage.setItem(accessTokenKey, token);
    return;
  }

  localStorage.removeItem(accessTokenKey);
}

export function clearAccessToken(): void {
  localStorage.removeItem(accessTokenKey);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestUrl = buildUrl(path);
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(requestUrl, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();
  const isJson = contentType.includes("application/json");
  let body: unknown = rawBody;

  if (isJson && rawBody.length > 0) {
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      if (looksLikeHtml(rawBody)) {
        throw new ApiError(
          `API returned HTML instead of JSON for ${requestUrl}. Check VITE_API_BASE_URL or dev proxy.`,
          response.status,
          rawBody
        );
      }

      throw new ApiError(
        `API returned invalid JSON for ${requestUrl}.`,
        response.status,
        rawBody
      );
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }

    const message =
      typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof (body as Record<string, unknown>).message === "string"
        ? String((body as Record<string, unknown>).message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(`${message} (${requestUrl})`, response.status, body);
  }

  if (!isJson) {
    const message = looksLikeHtml(body)
      ? `API returned HTML instead of JSON for ${requestUrl}. If serving dist, rebuild after setting VITE_API_BASE_URL.`
      : `API returned a non-JSON response where JSON was expected (${requestUrl}).`;
    throw new ApiError(message, response.status, body);
  }

  return body as T;
}