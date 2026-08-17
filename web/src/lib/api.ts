import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function practiceSocketURL(sessionId: string) {
  const token = getAccessToken() ?? "";
  const ws = API.replace(/^http/i, "ws");
  return `${ws}/api/v1/ws/practice?session_id=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}`;
}

export function chatSocketURL() {
  const token = getAccessToken() ?? "";
  const ws = API.replace(/^http/i, "ws");
  return `${ws}/api/v1/ws/chat?token=${encodeURIComponent(token)}`;
}

export type ApiError = {
  error?: string;
  message?: string;
  status: number;
};

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers: headerInit, ...rest } = options;
  const headers = new Headers(headerInit);
  headers.set("Content-Type", "application/json");
  if (auth !== false) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(`${API}${path}`, { ...rest, headers });
  if (res.status === 401 && auth !== false) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${getAccessToken()}`);
      res = await fetch(`${API}${path}`, { ...rest, headers });
    }
  }

  if (!res.ok) {
    let body: { error?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      body = { message: await res.text() };
    }
    const err: ApiError = {
      status: res.status,
      error: body.error,
      message: body.message || body.error || `Request failed (${res.status})`,
    };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefresh() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const tokens = await api<TokenPair>("/api/v1/auth/refresh", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ refresh_token: refresh }),
    });
    setTokens(tokens.access_token, tokens.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export type User = {
  id: string;
  username: string;
  mobile_number: string;
  gender: string;
  is_verified: boolean;
  is_premium: boolean;
  premium_until?: string;
  created_at: string;
  profile?: {
    native_language?: string;
    learning_language?: string;
    bio?: string;
  };
};

export type PracticeSession = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: string;
  started_at: string;
  ended_at?: string;
};

export type Partner = {
  id: string;
  username: string;
  native_language?: string;
  learning_language?: string;
};

export type MatchResult = {
  status: "matched" | "queued" | "incoming";
  session?: PracticeSession;
  session_id?: string;
  partner?: Partner;
  stats?: {
    session_count: number;
    week_minutes: number;
    online_partners?: number;
  };
  incoming_call?: IncomingCall;
};

export type IncomingCall = {
  session_id: string;
  partner?: Partner;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type ChatPartner = {
  id: string;
  username: string;
  native_language?: string;
  learning_language?: string;
};

export type Conversation = {
  id: string;
  participants: string[];
  last_message: string;
  last_message_at: string;
  session_id?: string;
  partner_id?: string;
  partner?: ChatPartner;
  unread: number;
  online: boolean;
};

export type Friend = {
  id: string;
  username: string;
  native_language?: string;
  learning_language?: string;
  online: boolean;
  session_count: number;
  last_session_at?: string;
  last_session_id?: string;
  conversation_id: string;
  created_at?: string;
};

export type RatingSummary = {
  user_id: string;
  avg_score: number;
  rating_count: number;
};

export type Plan = {
  id: string;
  name: string;
  duration_days: number;
  amount_paise: number;
  currency: string;
};
