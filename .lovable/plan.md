# CIPHER Guardian — Build Plan (Lovable Frontend)

Scope: build the Lovable web app per spec §8. The ElevenLabs agent + Tavily/GMI server tools are configured outside Lovable (in the ElevenLabs dashboard) — this plan covers only the frontend, which is the Lovable-side deliverable.

## What I'll build

A single-page React app (TanStack Start route `/`) called **CIPHER Guardian** with:

- **Shield Status banner** (top) — 3 states: PROTECTED (cyan), ANALYZING (amber, pulsing), THREAT DETECTED (red).
- **Live Transcript** (center-left) — streams user ⇄ CIPHER messages from the ElevenLabs conversation.
- **Tool Activity log** (right) — timestamped lines appended by the agent (`🔍 Tavily …`, `🧠 DeepSeek V4 Pro …`).
- **Threat Card** (right overlay) — scam type, risk badge, "Do this now" checklist, source links.
- **Demo Triggers** (bottom) — 3 buttons that inject the §6 synthetic payloads into the conversation: 📧 Phishing Email, 📞 Scam Call, 🎭 Multimodal Attack.
- **Black Chamber theme** — deep navy `#0A0E1A`, electric cyan `#22D3EE`, amber/gold `#F5B301`, monospace headers.

## ElevenLabs integration

- Install `@elevenlabs/react`.
- `useConversation` hook with `clientTools` registered (case-sensitive, must match agent config):
  - `set_shield_status({ status })`
  - `show_tool_activity({ tool, reason, result? })`
  - `display_threat_card({ scam_type, risk, do_now, sources })`
- Connect via WebRTC. Token fetched from a TanStack server function (`/api/elevenlabs-token`) that calls `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=...` using server-side `ELEVENLABS_API_KEY`.
- Agent ID stored as `VITE_ELEVENLABS_AGENT_ID` (public, fine in client).
- Demo buttons call `conversation.sendUserMessage(payloadText)` with the §6 incoming-threat text.
- Mic permission requested on Start; "Start Session" button gates the conversation.

## What I need from you before/while I build

1. **ElevenLabs API key** — I'll set it up as a secret (`ELEVENLABS_API_KEY`) when you confirm.
2. **ElevenLabs Agent ID** — for the CIPHER agent you create in the ElevenLabs dashboard. Add as `VITE_ELEVENLABS_AGENT_ID`.
3. Confirm: server tools (Tavily, DeepSeek) and the system prompt are configured **inside the ElevenLabs dashboard**, not in Lovable. (This is what your spec describes — keys stay in ElevenLabs secrets.)

If you'd rather have Lovable proxy DeepSeek/Tavily itself (the optional §3.3 fallback), tell me and I'll add server functions for those instead.

## File plan

- `src/styles.css` — add Black Chamber theme tokens (navy bg, cyan/amber accents, mono font stack via Google Fonts link in `__root.tsx` head).
- `src/routes/index.tsx` — replace placeholder with the CIPHER dashboard layout.
- `src/components/cipher/ShieldStatus.tsx` — animated status banner.
- `src/components/cipher/Transcript.tsx` — message list from `conversation` messages.
- `src/components/cipher/ToolActivityLog.tsx` — timestamped activity feed.
- `src/components/cipher/ThreatCard.tsx` — verdict card with risk badge, checklist, sources.
- `src/components/cipher/DemoTriggers.tsx` — 3 buttons firing §6 payloads.
- `src/components/cipher/StartSession.tsx` — mic permission + connect button.
- `src/hooks/use-cipher.ts` — wraps `useConversation`, registers client tools, exposes UI state (status, activities, threat, transcript) via a small Zustand store or React context.
- `src/lib/cipher-payloads.ts` — the 3 demo trigger texts (verbatim from §6).
- `src/lib/elevenlabs-token.functions.ts` — `createServerFn` that returns a conversation token using `process.env.ELEVENLABS_API_KEY`.
- `src/routes/__root.tsx` — update `<head>`: title "CIPHER Guardian", meta description, JetBrains Mono + Inter font links.

## Technical details

- **State**: React context (`CipherProvider`) holding `{status, activities[], threatCard, transcript[]}`. Client-tool handlers update this state and return short string acks to the agent.
- **Transcript source**: `useConversation({ onMessage })` — push user_transcript and agent_response events into transcript state.
- **Demo triggers**: `await conversation.sendUserMessage(payload)` after session is connected; disable until `status === 'connected'`.
- **Tailwind v4 tokens** added to `src/styles.css` under `@theme` and `:root` (`--background`, `--primary` = cyan, `--accent` = amber, plus custom `--color-cipher-navy`, `--color-cipher-cyan`, `--color-cipher-amber`, `--color-cipher-danger`). No `tailwind.config.js`.
- **Status colors**: use semantic tokens (`bg-primary`, `bg-accent`, `bg-destructive`) mapped to the Black Chamber palette — no hardcoded hex in components.
- **Animation**: ANALYZING state pulses via `animate-pulse` + custom keyframe glow.
- **Responsive**: stacks vertically below `md`; 3-column grid on desktop.

## Out of scope (this build)

- Creating/configuring the ElevenLabs agent itself, Tavily/GMI webhook tools, or the system prompt — done in the ElevenLabs dashboard.
- Real Tavily/DeepSeek HTTP calls from Lovable (unless you opt into the proxy fallback).
- Persisting transcripts or threats (not in spec; demo-only).

## Confirm to proceed

Reply "build it" (and share the agent ID + ElevenLabs API key when ready) and I'll switch to build mode and ship the frontend.
