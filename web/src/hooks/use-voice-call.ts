"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { practiceSocketURL } from "@/lib/api";

type Args = {
  enabled: boolean;
  sessionId: string;
  userId: string;
  partnerId: string;
  localStream: MediaStream | null;
  onHangup?: () => void;
};

export type VoiceStatus = "idle" | "connecting" | "waiting" | "live" | "error";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export function useVoiceCall({ enabled, sessionId, userId, partnerId, localStream, onHangup }: Args) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const remoteRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const offered = useRef(false);
  const runId = useRef(0);
  const wsEverOpen = useRef(false);
  const hangupRef = useRef(onHangup);
  hangupRef.current = onHangup;

  const isOfferer = userId < partnerId;

  const teardown = useCallback((resetRun = true) => {
    if (resetRun) runId.current += 1;
    offered.current = false;
    wsEverOpen.current = false;
    setStatus("idle");
    pcRef.current?.close();
    pcRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const connect = useCallback(
    (attempt: number) => {
      if (!enabled || !sessionId || !userId || !partnerId || !localStream) return;

      const mine = runId.current;
      setError("");
      setStatus("connecting");

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" },
        ],
      });
      pcRef.current = pc;
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        if (remoteRef.current) {
          remoteRef.current.srcObject = event.streams[0];
          remoteRef.current.muted = !speakerOn;
          void remoteRef.current.play().catch(() => undefined);
        }
        if (mine === runId.current) setStatus("live");
      };

      pc.onconnectionstatechange = () => {
        if (!pcRef.current || mine !== runId.current) return;
        if (pc.connectionState === "connected") setStatus("live");
        if (pc.connectionState === "failed") {
          setStatus("error");
          setError("Voice connection failed. Try a different network or browser.");
        }
        if (pc.connectionState === "disconnected") setStatus("waiting");
      };

      const pendingIce: RTCIceCandidateInit[] = [];
      async function flushIce() {
        while (pendingIce.length) {
          const candidate = pendingIce.shift();
          if (candidate) await pc.addIceCandidate(candidate);
        }
      }

      const ws = new WebSocket(practiceSocketURL(sessionId));
      wsRef.current = ws;

      ws.onopen = () => {
        wsEverOpen.current = true;
        if (mine === runId.current) {
          setRetryCount(0);
          setStatus("waiting");
        }
      };

      ws.onerror = () => {
        if (mine !== runId.current) return;
        if (wsEverOpen.current) {
          setStatus("error");
          setError("Voice channel disconnected unexpectedly. Tap Retry to reconnect.");
        } else if (attempt < MAX_RETRIES) {
          // Silent retry — backend may still be spinning up the session
          setTimeout(() => {
            if (mine === runId.current) {
              pc.close();
              ws.close();
              setRetryCount(attempt + 1);
              connect(attempt + 1);
            }
          }, RETRY_DELAY_MS);
        } else {
          setStatus("error");
          setError("Could not connect to the voice server. Check that the backend is reachable and your session is still active.");
        }
      };

      ws.onclose = () => {
        if (mine === runId.current && status !== "live") setStatus("idle");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
        }
      };

      async function makeOffer() {
        if (!isOfferer || offered.current || ws.readyState !== WebSocket.OPEN) return;
        offered.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
      }

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string) as {
          type: string;
          sdp?: string;
          candidate?: RTCIceCandidateInit;
          count?: number;
        };
        if (msg.type === "peers" && msg.count === 2) await makeOffer();
        if (msg.type === "peer-joined") await makeOffer();
        if (msg.type === "offer" && msg.sdp && !isOfferer) {
          await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
          await flushIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "answer", sdp: answer.sdp }));
        }
        if (msg.type === "answer" && msg.sdp && isOfferer) {
          await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
          await flushIce();
        }
        if (msg.type === "ice" && msg.candidate) {
          if (!pc.remoteDescription) pendingIce.push(msg.candidate);
          else {
            try {
              await pc.addIceCandidate(msg.candidate);
            } catch {
              /* ignore stale candidates */
            }
          }
        }
        if (msg.type === "hangup") {
          if (mine === runId.current) setStatus("idle");
          hangupRef.current?.();
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, sessionId, userId, partnerId, localStream, isOfferer, speakerOn],
  );

  // Main effect: start a fresh connection whenever inputs change
  useEffect(() => {
    if (!enabled || !sessionId || !userId || !partnerId || !localStream) return;
    teardown();
    runId.current += 1;
    connect(0);

    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sessionId, userId, partnerId, localStream]);

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.muted = !speakerOn;
  }, [speakerOn]);

  function retry() {
    teardown();
    runId.current += 1;
    setRetryCount(0);
    setError("");
    connect(0);
  }

  function toggleMute() {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }

  function toggleSpeaker() {
    setSpeakerOn((on) => {
      const next = !on;
      if (remoteRef.current) remoteRef.current.muted = !next;
      return next;
    });
  }

  const connected = status === "live";

  return {
    remoteRef,
    status,
    connected,
    muted,
    speakerOn,
    error,
    retryCount,
    retry,
    toggleMute,
    toggleSpeaker,
  };
}
