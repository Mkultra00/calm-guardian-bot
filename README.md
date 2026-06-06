DJINN is an AI-powered site security audit tool that makes vulnerability assessment conversational, continuous, and actionable.

Why it's needed
Modern web applications face two accelerating threat landscapes that most teams can't see in one place. Conventional attacks—XSS, CSRF, injection, credential stuffing, phishing—are well understood but still ship to production because security reports are static and siloed. At the same time, Non-Human Identities (API keys, service accounts, bots, tokens, autonomous agents) now outnumber human identities 45:1, yet 97% of organizations lack visibility into NHI risk. Security findings are typically too technical for product teams and too shallow for security teams, so remediation stalls.

The problem
- Manual penetration tests are slow, expensive, and produce perishable PDFs.
- Conventional scanners miss machine-identity exposure: leaked tokens in client bundles, OAuth abuse, agent impersonation, MCP/tool misuse.
- There is no conversational, role-based feedback—just checklists that don't explain trade-offs or build consensus.
- NHI sprawl goes unmonitored while developers ship features.

The solution
Enter a URL and DJINN crawls the surface, then generates a live, spoken discussion between two AI specialists:
- CISO (male voice): enterprise risk, compliance, business impact, conventional attack surface.
- NHI Specialist (female voice): bot and agent threats, token leakage, API key hygiene, machine-to-machine auth gaps.

They actually talk to each other—agreeing, pushing back, asking follow-ups—so the output feels like a briefing rather than a scan. The discussion auto-plays via ElevenLabs voice synthesis and can be stopped at any time.

Key features
- Dual-specialist conversation — alternating CISO and NHI perspectives with 14–20 turns per audit.
- Auto-play audio — discussion starts speaking as soon as it's generated.
- Conventional + NHI risk badges — explicit ratings (low / medium / high) for both attack surfaces.
- Downloadable artifacts — full transcript export and structured JSON log for ticketing / SIEM ingestion.
- Live playback controls — stop and restart the conversation on demand.
- One-click audit — Firecrawl surface scan + LLM analysis via Lovable AI Gateway (Gemini).

The goal is to close the NHI blind spot, speed remediation with structured data, and produce audit-ready artifacts for compliance (SOC 2, ISO 27001) without waiting for an annual pen-test.

Team Members

Frank Yu Lead
Forrest Pan
Jitender THakur
