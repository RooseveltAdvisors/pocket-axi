import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  PocketAudioUrlResponse,
  PocketClientOptions,
  PocketDetailResponse,
  PocketListResponse,
  PocketRecordingDetails,
  PocketRecordingSummary,
} from "./types.js";

export class PocketClient {
  private apiKey?: string;
  private baseUrl: string;

  constructor(options: PocketClientOptions = {}) {
    this.baseUrl = (
      options.baseUrl ||
      process.env.POCKET_BASE_URL ||
      "https://public.heypocketai.com/api/v1/public"
    ).replace(/\/+$/, "");

    this.apiKey = options.apiKey || process.env.POCKET_API_KEY || this.loadConfigApiKey();
  }

  private loadConfigApiKey(): string | undefined {
    const configPath = join(homedir(), ".config", "pocket-axi", "config.json");
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (typeof parsed.apiKey === "string" && parsed.apiKey.trim()) {
          return parsed.apiKey.trim();
        }
      } catch {
        // Ignore unreadable or corrupt config
      }
    }
    return undefined;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const headers = {
      ...this.getHeaders(),
      ...(init?.headers as Record<string, string>),
    };

    const res = await fetch(url, {
      ...init,
      headers,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Pocket AI Authentication Failed (HTTP ${res.status}): Please provide a valid POCKET_API_KEY or run via Agent Vault proxy.`
        );
      }
      throw new Error(`Pocket AI API error (HTTP ${res.status} on ${endpoint}): ${errText}`);
    }

    return (await res.json()) as T;
  }

  /**
   * List recordings with optional pagination cursor and limit.
   */
  async listRecordings(options: { limit?: number; cursor?: string } = {}): Promise<PocketListResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.cursor) params.set("cursor", options.cursor);

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<PocketListResponse>(`/recordings${query}`);
  }

  /**
   * Get the single most recent recording.
   */
  async getLatestRecording(): Promise<PocketRecordingDetails | null> {
    const list = await this.listRecordings({ limit: 1 });
    if (!list.data || list.data.length === 0) {
      return null;
    }
    return this.getRecording(list.data[0].id);
  }

  /**
   * Fetch full recording details including segments, AI summaries, mindmap, and action items.
   */
  async getRecording(recordingId: string): Promise<PocketRecordingDetails> {
    const res = await this.request<PocketDetailResponse>(`/recordings/${encodeURIComponent(recordingId)}`);
    return res.data;
  }

  /**
   * Get presigned S3 audio download URL.
   */
  async getAudioUrl(recordingId: string): Promise<PocketAudioUrlResponse["data"]> {
    const res = await this.request<PocketAudioUrlResponse>(
      `/recordings/${encodeURIComponent(recordingId)}/audio-url`
    );
    return res.data;
  }

  /**
   * Download the raw audio recording to a local file path.
   */
  async downloadAudio(recordingId: string, destPath: string): Promise<{ destPath: string; bytes: number }> {
    const audioInfo = await this.getAudioUrl(recordingId);
    const audioRes = await fetch(audioInfo.signed_url);
    if (!audioRes.ok) {
      throw new Error(`Failed to download audio from presigned URL (HTTP ${audioRes.status})`);
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");

    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, buffer);

    return { destPath, bytes: buffer.length };
  }
}
