import { useCipher } from "@/hooks/use-cipher";
import { Search, Brain, Terminal } from "lucide-react";

function iconFor(tool: string) {
  const t = tool.toLowerCase();
  if (t.includes("tavily")) return Search;
  if (t.includes("deepseek") || t.includes("gmi")) return Brain;
  return Terminal;
}

export function ToolActivityLog() {
  const { activities } = useCipher();
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card/60">
      <div className="border-b border-border px-4 py-2">
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Tool Activity · Transparency Log
        </div>
      </div>
      <div className="cipher-scan relative flex-1 overflow-y-auto p-3 font-mono text-xs">
        {activities.length === 0 && (
          <p className="text-muted-foreground">
            // No tool calls yet. Djinn will narrate every search and analysis here.
          </p>
        )}
        <ul className="space-y-2">
          {activities.map((a) => {
            const Icon = iconFor(a.tool);
            return (
              <li key={a.id} className="rounded border border-border/60 bg-background/60 p-2">
                <div className="flex items-center gap-2 text-primary">
                  <Icon className="h-3 w-3" />
                  <span className="font-bold">{a.tool}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(a.ts).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-foreground/90">{a.reason}</div>
                {a.result && (
                  <div className="mt-1 text-accent">✓ {a.result}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}