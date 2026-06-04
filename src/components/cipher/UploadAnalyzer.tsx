import { useRef, useState } from "react";
import { Upload, Camera, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeUpload } from "@/lib/analyze-upload.functions";
import { useCipher } from "@/hooks/use-cipher";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function UploadAnalyzer() {
  const { sendThreat, isConnected } = useCipher();
  const analyze = useServerFn(analyzeUpload);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);

  const handle = async (file: File) => {
    setErr(null);
    setBusy(true);
    setLastName(file.name);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("File too large (max 8MB).");
      const dataUrl = await readAsDataURL(file);
      const { analysis } = await analyze({
        data: { dataUrl, filename: file.name, mimeType: file.type || "application/octet-stream" },
      });
      const payload = `[UPLOADED ${file.type.startsWith("image/") ? "IMAGE" : "FILE"}: ${file.name}]\n\nExtracted analysis:\n${analysis}\n\nPlease assess this for scam / phishing risk and protect me.`;
      if (isConnected) {
        await sendThreat(payload);
      } else {
        setErr("Start a session first so Joshua can analyze this.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void handle(f);
  };

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4">
      <div className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Upload Evidence · Photo / Document
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="mono inline-flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-background/60 px-4 py-3 text-sm font-bold uppercase tracking-widest text-foreground transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload File
        </button>
        <button
          disabled={busy}
          onClick={() => camRef.current?.click()}
          className="mono inline-flex items-center justify-center gap-2 rounded-md border border-accent/40 bg-background/60 px-4 py-3 text-sm font-bold uppercase tracking-widest text-foreground transition hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Take Picture
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onPick}
      />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
      {lastName && !err && (
        <p className="mono mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          {busy ? `Analyzing ${lastName}…` : `Sent ${lastName} to Joshua`}
        </p>
      )}
      {err && (
        <p className="mono mt-2 text-[10px] uppercase tracking-widest text-destructive">{err}</p>
      )}
    </div>
  );
}