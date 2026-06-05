import { useEffect, useRef, useState } from "react";
import { useCipher } from "@/hooks/use-cipher";
import { Download, Volume2, VolumeX } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { synthesizeSpeech } from "@/lib/tts.functions";

export function Transcript() {
  const { transcript, isRunningDemo, isConnected } = useCipher();
  const ref = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const wasRunningDemo = useRef(false);
  const wasConnected = useRef(false);
  const spokenIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tts = useServerFn(synthesizeSpeech);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (!voiceOn) return;
    const latest = transcript[transcript.length - 1];
    if (!latest || latest.role === "user") return;
    if (spokenIds.current.has(latest.id)) return;
    spokenIds.current.add(latest.id);
    (async () => {
      try {
        const { audio } = await tts({ data: { text: latest.text } });
        if (!voiceOn) return;
        const el = new Audio(`data:audio/mpeg;base64,${audio}`);
        audioRef.current?.pause();
        audioRef.current = el;
        await el.play();
      } catch (e) {
        console.error("TTS error", e);
      }
    })();
  }, [transcript, voiceOn, tts]);

  useEffect(() => {
    if (!voiceOn) {
      audioRef.current?.pause();
      audioRef.current = null;
    } else {
      // mark existing messages as already spoken so we only read new ones
      transcript.forEach((m) => spokenIds.current.add(m.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceOn]);

  useEffect(() => {
    if (isRunningDemo && !wasRunningDemo.current) {
      setVoiceOn(true);
    }
    wasRunningDemo.current = isRunningDemo;
  }, [isRunningDemo]);

  const downloadTranscript = () => {
    const lines = transcript.map((m) => {
      const time = new Date(m.ts).toISOString();
      const who = m.role === "user" ? "You" : "Djinn";
      return `[${time}] ${who}: ${m.text}`;
    });
    const header = `Djinn Session Transcript\nGenerated: ${new Date().toISOString()}\n${"=".repeat(60)}\n\n`;
    const blob = new Blob([header + lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `djinn-transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Live Transcript
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => setVoiceOn((v) => !v)}
          className={`mono inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
            voiceOn
              ? "border-primary bg-primary/20 text-primary"
              : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
          }`}
          title="Read new Djinn messages aloud (ElevenLabs)"
          aria-pressed={voiceOn}
        >
          {voiceOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />} Voice {voiceOn ? "On" : "Off"}
        </button>
        <button
          onClick={downloadTranscript}
          disabled={transcript.length === 0}
          className="mono inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          title="Download transcript as text file"
        >
          <Download className="h-3 w-3" /> Download
        </button>
        </div>
      </div>
      <div ref={ref} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {transcript.length === 0 && (
          <p className="mono text-xs text-muted-foreground">
            Awaiting conversation. Start a session — or click <strong>Run Demo</strong> to watch Djinn analyze a synthetic phishing attack.
          </p>
        )}
        {transcript.map((m) => (
          <div key={m.id} className="space-y-1">
            <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {m.role === "user" ? "▶ You" : "◆ Djinn"}
            </div>
            <div
              className={`whitespace-pre-wrap rounded-md px-3 py-2 ${
                m.role === "user"
                  ? "bg-secondary text-foreground"
                  : "bg-primary/10 text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}