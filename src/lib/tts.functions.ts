import { createServerFn } from "@tanstack/react-start";

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string; voiceId?: string }) => {
    if (!data?.text || typeof data.text !== "string") throw new Error("text required");
    if (data.text.length > 5000) throw new Error("text too long");
    return { text: data.text, voiceId: data.voiceId || "EXAVITQu4vr4xnSDxMaL" };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY_1 ?? process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ElevenLabs not connected");
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 1.0 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TTS failed: ${res.status} ${err}`);
    }
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return { audio: base64 };
  });