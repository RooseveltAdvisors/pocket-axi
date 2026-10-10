---
name: pocket-axi
description: Read, search, list, transcribe, download, and ingest Pocket AI (heypocketai.com) meeting recordings, transcripts, and audio streams. Use when the user asks to check Pocket recordings, ingest recent calls from Pocket, download call audio, or extract meeting dialogue.
---

# pocket-axi

The AXI-standard CLI for interacting with Pocket AI meeting recordings, transcripts, and raw audio streams.

## Core Directives

> [!IMPORTANT]
> **Do not use Pocket AI's auto-generated summary.** Pocket AI's summarizer frequently hallucinates names, misattributes speakers, and distorts financial and clinical terms (e.g. converting "$400K annual salary" into "$400/hour", or inventing phonetically similar surnames).
>
> **Always pull the transcript** (`pocket-axi latest --transcript` or `pocket-axi get <id> --transcript`), and synthesize the executive summary, decisions, and action items yourself directly from the source dialogue turns.

---

## Quick Reference

```bash
# List recent recordings (human table)
pocket-axi list --limit 10

# Output raw JSON for agent parsing
pocket-axi list --limit 10 --json

# Extract transcript text directly (for our own synthesis)
pocket-axi latest --transcript
pocket-axi get <recording-id> --transcript

# Inspect metadata & segments
pocket-axi latest
pocket-axi get <recording-id>

# Resolve presigned S3 download URL
pocket-axi audio-url <recording-id>

# Download audio stream to file
pocket-axi audio <recording-id> --out /tmp/call.mp3

# Ingest raw transcript note to Obsidian Second Brain
pocket-axi ingest <recording-id> --vault-dir "/home/jon/Obsidian/second-brain/0. Inbox"
pocket-axi ingest --latest --vault-dir "/home/jon/Obsidian/second-brain/0. Inbox"
```

---

## Authentication

### 1. Standalone (Open Source)
Set the API key in your environment or configuration:
```bash
export POCKET_API_KEY="your-api-key"
# Or in ~/.config/pocket-axi/config.json:
# {"apiKey": "your-api-key"}
```

### 2. Fleet / Agent Vault Broker Mode
When running inside an Arcs Health managed environment:
```bash
agent-vault fleet proxy-run -- pocket-axi list
agent-vault fleet proxy-run -- pocket-axi latest --transcript
```

---

## Obsidian Ingestion Standards
When ingesting Pocket recordings into the Second Brain:
- Always pull the raw dialogue transcript and review speaker turns.
- Write human-grade executive summaries and topic breakdowns ourselves.
- Verify zero em dashes (`—`) and zero en dashes (`–`) outside wikilinks and backticked code.
- Cross-reference participants in YAML frontmatter and link existing entity notes.
