/**
 * vibeflow-meta:
 * id: apps/dashboard/voice/voice.ts
 * task: REBUILD-V5
 * regions:
 *   - id: voice-adapter
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:voice-adapter */
export interface VoiceDirective {
  transcript: string;
  intent: string;
  confidence: number;
}

export interface VoiceAction {
  type: "create_task" | "request_status" | "handoff";
  payload: Record<string, unknown>;
}

export class VoiceInterface {
  private readonly threshold: number;

  constructor(threshold = 0.8) {
    this.threshold = threshold;
  }

  interpret(transcript: string): VoiceAction | null {
    const directive: VoiceDirective = this.detectIntent(transcript);
    if (directive.confidence < this.threshold) {
      return null;
    }

    switch (directive.intent) {
      case "create_task":
        return {
          type: "create_task",
          payload: {
            title: transcript,
            priority: "medium",
          },
        };
      case "request_status":
        return {
          type: "request_status",
          payload: {
            taskId: this.extractTaskId(transcript),
          },
        };
      default:
        return null;
    }
  }

  private detectIntent(transcript: string): VoiceDirective {
    const normalized = transcript.toLowerCase();
    if (normalized.includes("status")) {
      return { transcript, intent: "request_status", confidence: 0.92 };
    }
    if (normalized.includes("create") || normalized.includes("open")) {
      return { transcript, intent: "create_task", confidence: 0.87 };
    }
    return { transcript, intent: "unknown", confidence: 0.3 };
  }

  private extractTaskId(transcript: string): string | null {
    const matches = transcript.match(/task\s+(\w+)/i);
    return matches ? matches[1] : null;
  }
}
/* @endeditable */
