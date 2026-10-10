---
name: pocket-axi
description: Read, search, list, transcribe, download, and ingest Pocket AI (heypocketai.com) meeting recordings, transcripts, summaries, and action items. Use when the user asks to check Pocket recordings, ingest recent calls from Pocket, download call audio, or extract meeting action items.
---

# pocket-axi

The AXI-standard CLI for interacting with Pocket AI meeting recordings, AI summaries, mind maps, and raw audio streams.

## Quick Reference

```bash
# List recent recordings (human table)
pocket-axi list --limit 10

# Output raw JSON for agent parsing
pocket-axi list --limit 10 --json

# Inspect latest recording
pocket-axi latest
pocket-axi latest --summary
pocket-axi latest --actions
pocket-axi latest --transcript

# Inspect specific recording
pocket-axi get <recording-id>
pocket-axi get <recording-id> --json

# Resolve presigned S3 download URL
pocket-axi audio-url <recording-id>

# Download audio stream to file
pocket-axi audio <recording-id> --out /tmp/call.mp3

# Ingest to Obsidian Second Brain note
pocket-axi ingest <recording-id> --vault-dir "/home/jon/Obsidian/second-brain/0. Inbox"
pocket-axi ingest --latest --vault-dir "/home/jon/Obsidian/second-brain/0. Inbox"
```

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
agent-vault fleet proxy-run -- pocket-axi latest
```

## Obsidian Ingestion Standards
When ingesting Pocket recordings into the Second Brain:
- Store transcripts under `attachments/` or embedded in the note.
- Check and enforce zero em dashes or en dashes outside wikilinks and backticked code.
- Always cross-reference participants in YAML frontmatter.
