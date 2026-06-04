import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getElevenLabsToken } from "@/lib/elevenlabs-token.functions";

export type ShieldStatus = "protected" | "analyzing" | "threat";
export type Risk = "LOW" | "MEDIUM" | "HIGH";

export interface ToolActivity {
  id: string;
  ts: number;
  tool: string;
  reason: string;
  result?: string;
}

export interface ThreatCard {
  scam_type: string;
  risk: Risk;
  do_now: string[];
  sources: { title?: string; url: string }[];
}

export interface TranscriptMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  ts: number;
}

interface CipherCtx {
  status: ShieldStatus;
  activities: ToolActivity[];
  threat: ThreatCard | null;
  transcript: TranscriptMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  sendThreat: (text: string) => Promise<void>;
  runDemo: () => void;
  isRunningDemo: boolean;
  error: string | null;
}

const Ctx = createContext<CipherCtx | null>(null);

export function CipherProvider({ children }: { children: ReactNode }) {
  return (
    <ConversationProvider>
      <InnerCipherProvider>{children}</InnerCipherProvider>
    </ConversationProvider>
  );
}

function InnerCipherProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ShieldStatus>("protected");
  const [activities, setActivities] = useState<ToolActivity[]>([]);
  const [threat, setThreat] = useState<ThreatCard | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextId = () => `${Date.now()}-${++counter.current}`;

  const fetchToken = useServerFn(getElevenLabsToken);

  const conversation = useConversation({
    onConnect: () => {
      setError(null);
    },
    onDisconnect: () => {},
    onError: (e) => {
      console.error("ElevenLabs error", e);
      setError(typeof e === "string" ? e : "Connection error");
    },
    onMessage: (message: { source?: string; message?: string }) => {
      // SDK fires onMessage with { source: 'user' | 'ai', message: string }
      if (!message?.message) return;
      const role: "user" | "agent" = message.source === "user" ? "user" : "agent";
      setTranscript((t) => [
        ...t,
        { id: nextId(), role, text: message.message!, ts: Date.now() },
      ]);
    },
    clientTools: {
      set_shield_status: ({ status }: { status: string }) => {
        const s = (status || "").toLowerCase();
        if (s === "protected" || s === "analyzing" || s === "threat") {
          setStatus(s as ShieldStatus);
        }
        return `Shield status set to ${s}`;
      },
      show_tool_activity: ({ tool, reason, result }: { tool: string; reason: string; result?: string }) => {
        setActivities((a) => [
          ...a,
          { id: nextId(), ts: Date.now(), tool, reason, result },
        ]);
        return "Activity logged";
      },
      display_threat_card: ({
        scam_type,
        risk,
        do_now,
        sources,
      }: {
        scam_type: string;
        risk: string;
        do_now: string[] | string;
        sources: { title?: string; url: string }[] | string[];
      }) => {
        const normalizedDoNow = Array.isArray(do_now)
          ? do_now
          : String(do_now).split("\n").filter(Boolean);
        const normalizedSources = (sources || []).map((s) =>
          typeof s === "string" ? { url: s } : s,
        );
        const r = (risk || "MEDIUM").toUpperCase() as Risk;
        setThreat({
          scam_type,
          risk: ["LOW", "MEDIUM", "HIGH"].includes(r) ? r : "MEDIUM",
          do_now: normalizedDoNow,
          sources: normalizedSources,
        });
        return "Threat card displayed";
      },
    },
  });

  const start = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { token } = await fetchToken();
      await conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, fetchToken]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const sendThreat = useCallback(
    async (text: string) => {
      conversation.sendUserMessage(text);
    },
    [conversation],
  );

  const value: CipherCtx = useMemo(
    () => ({
      status,
      activities,
      threat,
      transcript,
      isConnected: conversation.status === "connected",
      isConnecting,
      isSpeaking: conversation.isSpeaking,
      start,
      stop,
      sendThreat,
      error,
    }),
    [status, activities, threat, transcript, conversation.status, conversation.isSpeaking, isConnecting, start, stop, sendThreat, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCipher() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCipher must be used inside CipherProvider");
  return c;
}