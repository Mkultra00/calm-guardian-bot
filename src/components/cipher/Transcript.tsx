import { useEffect, useRef } from "react";
import { useCipher } from "@/hooks/use-cipher";
import { Download } from "lucide-react";

export function Transcript() {
  const { transcript } = useCipher();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

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
        <button
          onClick={downloadTranscript}
          disabled={transcript.length === 0}
          className="mono inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          title="Download transcript as text file"
        >
          <Download className="h-3 w-3" /> Download
        </button>
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