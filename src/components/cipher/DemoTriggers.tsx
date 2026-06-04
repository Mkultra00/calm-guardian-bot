import { useCipher } from "@/hooks/use-cipher";
import { DEMO_PAYLOADS, type DemoKey } from "@/lib/cipher-payloads";

export function DemoTriggers() {
  const { sendThreat, isConnected } = useCipher();

  const fire = async (key: DemoKey) => {
    await sendThreat(DEMO_PAYLOADS[key].text);
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Demo Triggers · Synthetic Attacks
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(DEMO_PAYLOADS) as DemoKey[]).map((k) => {
          const p = DEMO_PAYLOADS[k];
          return (
            <button
              key={k}
              disabled={!isConnected}
              onClick={() => fire(k)}
              className="mono group relative overflow-hidden rounded-md border border-primary/30 bg-background/60 px-4 py-3 text-left text-sm transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="text-xl">{p.emoji}</div>
              <div className="mt-1 font-bold tracking-wide text-foreground">
                {p.label}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                Fire synthetic attack →
              </div>
            </button>
          );
        })}
      </div>
      {!isConnected && (
        <p className="mono mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Start a session to enable demo triggers
        </p>
      )}
    </div>
  );
}