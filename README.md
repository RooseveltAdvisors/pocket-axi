# pocket-axi

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![AXI Standard](https://img.shields.io/badge/standard-axi-purple.svg)](https://axi.md)

An agent-ergonomic CLI and TypeScript SDK for [Pocket AI](https://heypocketai.com) meeting recordings, transcripts, and raw audio downloads.

Built according to the [AXI standard](https://axi.md) for direct consumption by autonomous agents (Pi, Codex, Claude Code, Antigravity) and human operators.

---

## Core Philosophy: Dialogue-First Ingestion

Vendor AI summarization tools often hallucinate names, misattribute dialogue turns, or garble domain calculations. `pocket-axi` prioritizes high-fidelity extraction of the **raw transcript segments, timestamps, and audio streams**, giving agents and downstream LLMs the pristine source truth required to synthesize accurate executive summaries.

---

## Features

- **Agent-First CLI:** Full JSON output (`--json`) across all commands for structured tool integration.
- **Direct Transcript Pull:** Extract raw transcript text directly (`--transcript`) for high-context agent summarization.
- **Audio Download:** Resolve presigned S3 URLs (`audio-url`) or stream full audio recordings (`.mp3`) directly to disk.
- **Obsidian Second Brain Ingestion:** `pocket-axi ingest <id|--latest>` converts any recording into a clean, timestamped Obsidian markdown transcript note with YAML frontmatter.
- **Dual Authentication Modes:** Works standalone with an API key, or transparently through the Agent Vault fleet proxy.

---

## Installation

### From Source

```bash
git clone https://github.com/RooseveltAdvisors/pocket-axi.git
cd pocket-axi
bun install
bun run build
```

Link or copy the CLI to your path:
```bash
ln -sf $(pwd)/dist/cli.js ~/.local/bin/pocket-axi
```

---

## Authentication

### 1. Environment Variable
```bash
export POCKET_API_KEY="your_api_key_here"
```

### 2. Configuration File
Place your key in `~/.config/pocket-axi/config.json`:
```json
{
  "apiKey": "your_api_key_here"
}
```

### 3. Agent Vault Broker Mode (Enterprise / Fleet)
When operating inside an Agent Vault fleet environment, `pocket-axi` automatically detects the proxy session or runs via:
```bash
agent-vault fleet proxy-run -- pocket-axi list
```

---

## CLI Usage

### List Recordings
```bash
# Formatted table of recent recordings
pocket-axi list --limit 10

# Raw JSON output for agents
pocket-axi list --limit 10 --json
```

### Extract Transcripts for Local Synthesis
```bash
# Pull raw transcript text of the latest recording
pocket-axi latest --transcript

# Pull transcript of a specific recording
pocket-axi get <recording-id> --transcript
```

### Inspect Metadata
```bash
# Full overview (metadata + segments)
pocket-axi latest
pocket-axi get <recording-id>
pocket-axi get <recording-id> --json
```

### Audio Streams & Downloads
```bash
# Get presigned S3 download URL
pocket-axi audio-url <recording-id>

# Download audio stream to file
pocket-axi audio <recording-id> --out /tmp/recording.mp3
```

### Obsidian Second Brain Ingestion
```bash
# Ingest latest recording directly into a vault directory as a timestamped transcript note
pocket-axi ingest --latest --vault-dir "$HOME/Obsidian/second-brain/0. Inbox"

# Ingest specific recording
pocket-axi ingest <recording-id> --vault-dir "$HOME/Obsidian/second-brain/1. Projects/My Project"
```

---

## TypeScript SDK Usage

You can also import `PocketClient` directly into your TypeScript or Node.js applications:

```typescript
import { PocketClient } from "pocket-axi";

const client = new PocketClient({
  apiKey: process.env.POCKET_API_KEY,
});

// List recordings
const recordings = await client.listRecordings({ limit: 5 });

// Fetch latest recording transcript
const latest = await client.getLatestRecording();
console.log(latest?.transcript?.text);

// Download raw audio
await client.downloadAudio(latest!.id, "/tmp/call.mp3");
```

---

## Agent Skill

This repository includes a pre-packaged agent skill in [`skills/pocket-axi/SKILL.md`](skills/pocket-axi/SKILL.md). Install it to your agent directory:

```bash
mkdir -p ~/.agents/skills/pocket-axi
cp skills/pocket-axi/SKILL.md ~/.agents/skills/pocket-axi/
```

---

## License

MIT (c) 2026 Roosevelt Advisors LLC. See [LICENSE](LICENSE) for details.
