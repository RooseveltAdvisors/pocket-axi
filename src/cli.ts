#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PocketClient } from "./client.js";
import type { PocketRecordingDetails, PocketRecordingSummary } from "./types.js";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`pocket-axi v${VERSION} — AXI-standard CLI for Pocket AI meeting recordings

USAGE:
  pocket-axi <command> [arguments...] [options...]

COMMANDS:
  list                      List recent Pocket recordings
  latest                    Get the most recent recording
  get <id>                  Get full details for a recording
  audio-url <id>            Get presigned S3 audio download URL
  audio <id>                Download recording audio (.mp3)
  ingest <id|--latest>      Ingest recording to Obsidian markdown format

OPTIONS:
  --json                    Output raw JSON (agent-ergonomic)
  --transcript              Extract transcript text only
  --summary                 Extract AI summary markdown only
  --actions                 Extract action items only
  --mindmap                 Extract mindmap outline only
  --limit <N>               Max items to list (default: 20)
  --cursor <str>            Pagination cursor
  --out <file>              Destination file path for audio or export
  --vault-dir <path>        Target Obsidian directory for ingest
  --api-key <key>           Explicit API key (overrides POCKET_API_KEY)
  -v, --version             Print version and exit
  -h, --help                Show this help message

AUTHENTICATION:
  1. Set POCKET_API_KEY environment variable, or
  2. Put {"apiKey": "..."} in ~/.config/pocket-axi/config.json, or
  3. Run via Agent Vault proxy: agent-vault fleet proxy-run -- pocket-axi ...
`);
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s}s`;
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    return d.toISOString().replace("T", " ").substring(0, 19) + " UTC";
  } catch {
    return isoStr;
  }
}

function getPrimarySummary(rec: PocketRecordingDetails): {
  markdown?: string;
  mindMapNodes?: Array<{ node_id: string; title: string }>;
  actionItems?: Array<{ label: string; assignee?: string; status?: string }>;
} {
  const summMap = rec.summarizations || {};
  const firstSumm = Object.values(summMap)[0];
  if (!firstSumm?.v2) return {};

  return {
    markdown: firstSumm.v2.summary?.markdown,
    mindMapNodes: firstSumm.v2.mindMap?.nodes?.map((n) => ({
      node_id: n.node_id,
      title: n.title,
    })),
    actionItems: firstSumm.v2.actionItems?.actions?.map((a) => ({
      label: a.label,
      assignee: a.assignee,
      status: a.status,
    })),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("-h") || args.includes("--help") || args[0] === "help") {
    printHelp();
    process.exit(0);
  }

  if (args.includes("-v") || args.includes("--version") || args[0] === "version") {
    console.log(`pocket-axi v${VERSION}`);
    process.exit(0);
  }

  // Parse global flags
  const jsonMode = args.includes("--json");
  const transcriptOnly = args.includes("--transcript");
  const summaryOnly = args.includes("--summary");
  const actionsOnly = args.includes("--actions");
  const mindmapOnly = args.includes("--mindmap");

  const apiKeyIdx = args.indexOf("--api-key");
  const apiKey = apiKeyIdx !== -1 && args[apiKeyIdx + 1] ? args[apiKeyIdx + 1] : undefined;

  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : 20;

  const cursorIdx = args.indexOf("--cursor");
  const cursor = cursorIdx !== -1 && args[cursorIdx + 1] ? args[cursorIdx + 1] : undefined;

  const outIdx = args.indexOf("--out");
  const outFile = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : undefined;

  const vaultIdx = args.indexOf("--vault-dir");
  const vaultDir = vaultIdx !== -1 && args[vaultIdx + 1] ? args[vaultIdx + 1] : undefined;

  const client = new PocketClient({ apiKey });
  const command = args[0];

  try {
    switch (command) {
      case "list": {
        const list = await client.listRecordings({ limit, cursor });
        if (jsonMode) {
          console.log(JSON.stringify(list, null, 2));
          return;
        }

        if (!list.data || list.data.length === 0) {
          console.log("No recordings found.");
          return;
        }

        console.log(`\nFound ${list.data.length} recording(s):\n`);
        console.log(
          "ID".padEnd(38) +
            "DATE".padEnd(22) +
            "DURATION".padEnd(12) +
            "TITLE"
        );
        console.log("-".repeat(95));

        for (const r of list.data) {
          const id = r.id.padEnd(38);
          const date = formatDate(r.recording_at || r.created_at).padEnd(22);
          const dur = formatDuration(r.duration).padEnd(12);
          const title = r.title || "(Untitled)";
          console.log(`${id}${date}${dur}${title}`);
        }
        console.log();
        if (list.cursor) {
          console.log(`Next page cursor: ${list.cursor}`);
        }
        break;
      }

      case "latest": {
        const rec = await client.getLatestRecording();
        if (!rec) {
          console.error("No recordings found in account.");
          process.exit(1);
        }

        if (jsonMode) {
          console.log(JSON.stringify(rec, null, 2));
          return;
        }

        const summary = getPrimarySummary(rec);

        if (transcriptOnly) {
          console.log(rec.transcript?.text || "(No transcript text)");
          return;
        }

        if (summaryOnly) {
          console.log(summary.markdown || "(No AI summary available)");
          return;
        }

        if (actionsOnly) {
          console.log(JSON.stringify(summary.actionItems || [], null, 2));
          return;
        }

        console.log(`\n=== Pocket Recording: ${rec.title} ===`);
        console.log(`ID:       ${rec.id}`);
        console.log(`Date:     ${formatDate(rec.recording_at || rec.created_at)}`);
        console.log(`Duration: ${formatDuration(rec.duration)} (${rec.duration}s)`);
        console.log(`State:    ${rec.state}`);
        console.log("=========================================\n");

        if (summary.markdown) {
          console.log("## Summary\n");
          console.log(summary.markdown);
          console.log("\n-----------------------------------------\n");
        }

        if (summary.actionItems && summary.actionItems.length > 0) {
          console.log("## Action Items\n");
          for (const a of summary.actionItems) {
            console.log(`* [ ] ${a.label}${a.assignee ? ` (@${a.assignee})` : ""}`);
          }
          console.log("\n-----------------------------------------\n");
        }

        console.log(`Transcript preview (${rec.transcript?.segments?.length || 0} segments):`);
        const preview = (rec.transcript?.text || "").substring(0, 300);
        console.log(preview + (preview.length >= 300 ? "..." : ""));
        break;
      }

      case "get": {
        const id = args[1];
        if (!id || id.startsWith("-")) {
          console.error("Error: Missing recording ID. Usage: pocket-axi get <id>");
          process.exit(1);
        }

        const rec = await client.getRecording(id);
        if (jsonMode) {
          console.log(JSON.stringify(rec, null, 2));
          return;
        }

        const summary = getPrimarySummary(rec);

        if (transcriptOnly) {
          console.log(rec.transcript?.text || "(No transcript text)");
          return;
        }

        if (summaryOnly) {
          console.log(summary.markdown || "(No AI summary available)");
          return;
        }

        if (actionsOnly) {
          console.log(JSON.stringify(summary.actionItems || [], null, 2));
          return;
        }

        if (mindmapOnly) {
          console.log(JSON.stringify(summary.mindMapNodes || [], null, 2));
          return;
        }

        console.log(`\n=== Pocket Recording: ${rec.title} ===`);
        console.log(`ID:       ${rec.id}`);
        console.log(`Date:     ${formatDate(rec.recording_at || rec.created_at)}`);
        console.log(`Duration: ${formatDuration(rec.duration)}`);
        console.log("=========================================\n");

        if (summary.markdown) {
          console.log("## AI Summary\n");
          console.log(summary.markdown);
          console.log("\n-----------------------------------------\n");
        }

        if (summary.actionItems && summary.actionItems.length > 0) {
          console.log("## Action Items\n");
          for (const a of summary.actionItems) {
            console.log(`* [ ] ${a.label}${a.assignee ? ` (@${a.assignee})` : ""}`);
          }
          console.log("\n-----------------------------------------\n");
        }

        console.log(`Segments: ${rec.transcript?.segments?.length || 0}`);
        break;
      }

      case "audio-url": {
        const id = args[1];
        if (!id || id.startsWith("-")) {
          console.error("Error: Missing recording ID. Usage: pocket-axi audio-url <id>");
          process.exit(1);
        }

        const audio = await client.getAudioUrl(id);
        if (jsonMode) {
          console.log(JSON.stringify(audio, null, 2));
          return;
        }
        console.log(audio.signed_url);
        break;
      }

      case "audio": {
        const id = args[1];
        if (!id || id.startsWith("-")) {
          console.error("Error: Missing recording ID. Usage: pocket-axi audio <id> [--out <path>]");
          process.exit(1);
        }

        const targetFile = outFile || `/tmp/pocket_${id}.mp3`;
        console.log(`Downloading recording ${id} to ${targetFile}...`);
        const res = await client.downloadAudio(id, targetFile);
        console.log(`Downloaded ${res.bytes} bytes successfully to ${res.destPath}`);
        break;
      }

      case "ingest": {
        let recId = args[1];
        let rec: PocketRecordingDetails | null;

        if (recId === "--latest" || !recId) {
          rec = await client.getLatestRecording();
          if (!rec) {
            console.error("No recordings found in account.");
            process.exit(1);
          }
          recId = rec.id;
        } else {
          rec = await client.getRecording(recId);
        }

        const targetDir = vaultDir || process.cwd();
        const dateStr = (rec.recording_at || rec.created_at || "").substring(0, 10) || "undated";
        const safeTitle = (rec.title || "recording")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const filename = `${dateStr}-pocket-${safeTitle}-${rec.id.substring(0, 8)}.md`;
        const fullPath = join(targetDir, filename);

        const summary = getPrimarySummary(rec);

        const mdLines: string[] = [
          "---",
          `title: "${rec.title.replace(/"/g, '\\"')}"`,
          "type: meeting-note",
          "tags:",
          "  - pocket-ai",
          "  - audio",
          "  - recording",
          `date: ${dateStr}`,
          `source: "pocket-ai (${rec.id})"`,
          `duration: "${formatDuration(rec.duration)}"`,
          "---",
          "",
          `# ${rec.title}`,
          "",
          `- **Date:** ${formatDate(rec.recording_at || rec.created_at)}`,
          `- **Duration:** ${formatDuration(rec.duration)} (${rec.duration} seconds)`,
          `- **Recording ID:** \`${rec.id}\``,
          "",
          "---",
          "",
          "## Executive Summary",
          "",
          summary.markdown || "(No AI summary available)",
          "",
        ];

        if (summary.actionItems && summary.actionItems.length > 0) {
          mdLines.push("## Action Items", "");
          for (const a of summary.actionItems) {
            mdLines.push(`- [ ] ${a.label}${a.assignee ? ` (@${a.assignee})` : ""}`);
          }
          mdLines.push("", "---", "");
        }

        if (rec.transcript?.segments && rec.transcript.segments.length > 0) {
          mdLines.push("## Transcript", "");
          for (const seg of rec.transcript.segments) {
            const m = Math.floor(seg.start / 60);
            const s = Math.floor(seg.start % 60);
            const ts = `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
            mdLines.push(`${ts} ${seg.text}`, "");
          }
        }

        mkdirSync(targetDir, { recursive: true });
        writeFileSync(fullPath, mdLines.join("\n"));

        if (jsonMode) {
          console.log(JSON.stringify({ status: "success", path: fullPath, recordingId: rec.id }, null, 2));
        } else {
          console.log(`Ingested recording to Obsidian note: ${fullPath}`);
        }
        break;
      }

      default:
        console.error(`Unknown command: "${command}". Run pocket-axi --help for available commands.`);
        process.exit(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (jsonMode) {
      console.error(JSON.stringify({ error: msg }, null, 2));
    } else {
      console.error(`Error: ${msg}`);
    }
    process.exit(1);
  }
}

main();
