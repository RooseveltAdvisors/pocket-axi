export interface PocketRecordingSummary {
  id: string;
  title: string;
  folder_id?: string | null;
  duration: number;
  state: string;
  language?: string;
  recording_at?: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];
}

export interface PocketSegment {
  start: number;
  end: number;
  text: string;
  originalText?: string;
}

export interface PocketTranscript {
  metadata?: Record<string, unknown>;
  segments: PocketSegment[];
  text: string;
}

export interface PocketMindMapNode {
  node_id: string;
  parent_node_id: string;
  title: string;
  color?: string;
}

export interface PocketActionItem {
  id: string;
  label: string;
  assignee?: string;
  context?: string;
  priority?: string;
  status?: string;
  type?: string;
  isCompleted?: boolean;
}

export interface PocketSummarizationV2 {
  summary?: {
    markdown?: string;
  };
  mindMap?: {
    nodes?: PocketMindMapNode[];
  };
  actionItems?: {
    actions?: PocketActionItem[];
  };
}

export interface PocketSummarization {
  id: string;
  summarizationId?: string;
  processingStatus?: string;
  v2?: PocketSummarizationV2;
}

export interface PocketRecordingDetails extends PocketRecordingSummary {
  transcript?: PocketTranscript;
  speakers?: Record<string, unknown>;
  summarizations?: Record<string, PocketSummarization>;
}

export interface PocketListResponse {
  success: boolean;
  data: PocketRecordingSummary[];
  cursor?: string | null;
}

export interface PocketDetailResponse {
  success: boolean;
  data: PocketRecordingDetails;
}

export interface PocketAudioUrlResponse {
  success: boolean;
  data: {
    signed_url: string;
    expires_in: number;
    expires_at: string;
  };
}

export interface PocketClientOptions {
  apiKey?: string;
  baseUrl?: string;
  proxySessionPath?: string;
}
