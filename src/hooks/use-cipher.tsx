import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getElevenLabsToken, type AgentKind } from "@/lib/elevenlabs-token.functions";

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

  const start = useCallback(async (agent: AgentKind = "guardian") => {
    setIsConnecting(true);
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { token } = await fetchToken({ data: { agent } });
      await conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
      });
      setActiveAgent(agent);
    } catch (e) {
      console.error(e);
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

    queue(() => {
      setTranscript((t) => [
        ...t,
        {
          id: nextId(),
          role: "user",
          text: `[INCOMING EMAIL]\nFrom: support@amaz0n-delivery-help.example\nSubject: Your package is held — $1.99 fee required\nBody: Your parcel is on hold. Pay the $1.99 redelivery fee within 12 hours or it returns to sender. Confirm your card here: hxxps://amaz0n-redeliver.example/pay\n\nPlease analyze this suspicious email and protect me.`,
          ts: Date.now(),
        },
      ]);
    }, 300);

    queue(() => {
      setStatus("analyzing");
    }, 900);

    queue(() => {
      setTranscript((t) => [
        ...t,
        {
          id: nextId(),
          role: "agent",
          text: "I'm analyzing this now. Let me research the sender domain and check for known phishing patterns.",
          ts: Date.now(),
        },
      ]);
    }, 1200);

    queue(() => {
      setActivities((a) => [
        ...a,
        {
          id: nextId(),
          ts: Date.now(),
          tool: "tavily_search",
          reason: "Researching domain amaz0n-delivery-help.example for phishing reports",
          result: "Domain registered 6 hours ago. 14 abuse reports. No legitimate Amazon affiliation.",
        },
      ]);
    }, 2200);

    queue(() => {
      setActivities((a) => [
        ...a,
        {
          id: nextId(),
          ts: Date.now(),
          tool: "deepseek_analysis",
          reason: "Running structural analysis on email content and URL behavior",
          result: "Spoofed branding, urgency trigger ('12 hours'), payment demand to unknown domain. Confidence: 97% phishing.",
        },
      ]);
    }, 3400);

    queue(() => {
      setStatus("threat");
      setThreat({
        scam_type: "Phishing Email (Brand Spoof)",
        risk: "HIGH",
        do_now: [
          "Do NOT click the link or enter any card details.",
          "Delete the email immediately.",
          "Check your real Amazon account directly via amazon.com — not via email links.",
          "Report the phishing attempt to reportphishing@apwg.org.",
        ],
        sources: [
          { title: "FTC: How to Recognize and Avoid Phishing Scams", url: "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams" },
          { title: "CISA: Avoiding Social Engineering and Phishing Attacks", url: "https://www.cisa.gov/news-events/news/avoiding-social-engineering-and-phishing-attacks" },
        ],
      });
    }, 4200);

    queue(() => {
      setTranscript((t) => [
        ...t,
        {
          id: nextId(),
          role: "agent",
          text: "THREAT CONFIRMED. This is a high-confidence phishing attack. The domain was registered 6 hours ago and has no legitimate connection to Amazon. The urgency and small fee are classic social engineering triggers. I've locked the shield and listed the exact steps to protect yourself.",
          ts: Date.now(),
        },
      ]);
      setIsRunningDemo(false);
    }, 4800);
  }, []);

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
    }),
    [status, activities, threat, transcript, conversation.status, conversation.isSpeaking, isConnecting, activeAgent, start, stop, sendThreat, runDemo, isRunningDemo, error],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCipher() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCipher must be used inside CipherProvider");
  return c;
}