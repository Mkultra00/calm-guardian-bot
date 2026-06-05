import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getElevenLabsToken, type AgentKind } from "@/lib/elevenlabs-token.functions";
import { pickRandomScenario } from "@/lib/demo-scenarios";

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
  activeAgent: AgentKind | null;
  start: (agent?: AgentKind) => Promise<void>;
  stop: () => Promise<void>;
  sendThreat: (text: string) => Promise<void>;
  runDemo: () => void;
  isRunningDemo: boolean;
  error: string | null;
  addActivity: (a: { tool: string; reason: string; result?: string }) => void;
  attachSources: (scamType: string, sources: { title?: string; url: string }[]) => void;
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
  const [activeAgent, setActiveAgent] = useState<AgentKind | null>(null);
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
      console.warn("ElevenLabs error", e);
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

  const start = useCallback(async (agent: AgentKind = "guardian") => {
    setIsConnecting(true);
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const tokenResult = await fetchToken({ data: { agent } });
      if (!tokenResult.token) {
        throw new Error(tokenResult.error ?? "Failed to get voice agent token");
      }
      await conversation.startSession({
        conversationToken: tokenResult.token,
        connectionType: "webrtc",
      });
      setActiveAgent(agent);
    } catch (e) {
      console.warn(e);
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, fetchToken]);

  const stop = useCallback(async () => {
    await conversation.endSession();
    setActiveAgent(null);
  }, [conversation]);

  const sendThreat = useCallback(
    async (text: string) => {
      conversation.sendUserMessage(text);
    },
    [conversation],
  );

  const runDemo = useCallback(() => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    setTranscript([]);
    setActivities([]);
    setThreat(null);
    setStatus("protected");
    setIsRunningDemo(true);

    const queue = (fn: () => void, delay: number) => {
      const t = setTimeout(fn, delay);
      demoTimers.current.push(t);
    };

    const scenario = pickRandomScenario();

    queue(() => {
      setTranscript((t) => [
        ...t,
        { id: nextId(), role: "user", text: scenario.userText, ts: Date.now() },
      ]);
    }, 300);

    queue(() => setStatus("analyzing"), 900);

    queue(() => {
      setTranscript((t) => [
        ...t,
        { id: nextId(), role: "agent", text: scenario.analyzingLine, ts: Date.now() },
      ]);
    }, 1200);

    scenario.activities.forEach((act, i) => {
      queue(() => {
        setActivities((a) => [
          ...a,
          { id: nextId(), ts: Date.now(), tool: act.tool, reason: act.reason, result: act.result },
        ]);
      }, 2200 + i * 1200);
    });

    const threatDelay = 2200 + scenario.activities.length * 1200 + 600;

    queue(() => {
      setStatus("threat");
      setThreat(scenario.threat);
    }, threatDelay);

    queue(() => {
      setTranscript((t) => [
        ...t,
        { id: nextId(), role: "agent", text: scenario.closingLine, ts: Date.now() },
      ]);
      setIsRunningDemo(false);
    }, threatDelay + 600);
  }, []);

  const addActivity = useCallback(
    (a: { tool: string; reason: string; result?: string }) => {
      setActivities((prev) => [
        ...prev,
        { id: nextId(), ts: Date.now(), tool: a.tool, reason: a.reason, result: a.result },
      ]);
    },
    [],
  );

  const attachSources = useCallback(
    (scamType: string, sources: { title?: string; url: string }[]) => {
      setThreat((prev) => {
        if (prev) {
          const existing = new Set(prev.sources.map((s) => s.url));
          const merged = [...prev.sources, ...sources.filter((s) => !existing.has(s.url))];
          return { ...prev, sources: merged };
        }
        return {
          scam_type: scamType,
          risk: "MEDIUM",
          do_now: ["Review the sources below before acting.", "Do not click links from unverified senders."],
          sources,
        };
      });
    },
    [],
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
      activeAgent,
      start,
      stop,
      sendThreat,
      runDemo,
      isRunningDemo,
      error,
      addActivity,
      attachSources,
    }),
    [status, activities, threat, transcript, conversation.status, conversation.isSpeaking, isConnecting, activeAgent, start, stop, sendThreat, runDemo, isRunningDemo, error, addActivity, attachSources],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCipher() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCipher must be used inside CipherProvider");
  return c;
}