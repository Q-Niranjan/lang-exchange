"use client";

import { useEffect, useRef } from "react";

import { api, chatSocketURL, type ChatMessage, type IncomingCall } from "@/lib/api";

type Args = {
  enabled: boolean;
  onMessage?: (msg: ChatMessage) => void;
  onIncomingCall?: (call: IncomingCall) => void;
  onCallEnded?: (sessionId: string) => void;
};

export function useChatSocket({ enabled, onMessage, onIncomingCall, onCallEnded }: Args) {
  const messageRef = useRef(onMessage);
  const callRef = useRef(onIncomingCall);
  const endedRef = useRef(onCallEnded);
  messageRef.current = onMessage;
  callRef.current = onIncomingCall;
  endedRef.current = onCallEnded;

  useEffect(() => {
    if (!enabled) return;

    let closed = false;
    let ws: WebSocket | null = null;
    let retry: number | undefined;

    function connect() {
      if (closed) return;
      ws = new WebSocket(chatSocketURL());
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as ChatMessage & {
            event?: string;
            session_id?: string;
            partner?: IncomingCall["partner"];
          };
          if (payload.event === "incoming_call" && payload.session_id) {
            callRef.current?.({
              session_id: payload.session_id,
              partner: payload.partner,
            });
            return;
          }
          if (payload.event === "call_ended" && payload.session_id) {
            endedRef.current?.(payload.session_id);
            return;
          }
          if (payload.conversation_id && payload.content) {
            messageRef.current?.(payload);
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (!closed) retry = window.setTimeout(connect, 2500);
      };
    }

    connect();
    const beat = window.setInterval(() => {
      void api("/api/v1/presence/heartbeat", { method: "POST", body: JSON.stringify({}) }).catch(() => undefined);
    }, 25000);
    void api("/api/v1/presence/heartbeat", { method: "POST", body: JSON.stringify({}) }).catch(() => undefined);

    return () => {
      closed = true;
      window.clearInterval(beat);
      if (retry) window.clearTimeout(retry);
      ws?.close();
    };
  }, [enabled]);
}
