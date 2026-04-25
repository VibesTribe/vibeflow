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
export class VoiceInterface {
    constructor(threshold = 0.8) {
        this.threshold = threshold;
    }
    interpret(transcript) {
        const directive = this.detectIntent(transcript);
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
    detectIntent(transcript) {
        const normalized = transcript.toLowerCase();
        if (normalized.includes("status")) {
            return { transcript, intent: "request_status", confidence: 0.92 };
        }
        if (normalized.includes("create") || normalized.includes("open")) {
            return { transcript, intent: "create_task", confidence: 0.87 };
        }
        return { transcript, intent: "unknown", confidence: 0.3 };
    }
    extractTaskId(transcript) {
        const matches = transcript.match(/task\s+(\w+)/i);
        return matches ? matches[1] : null;
    }
}
/* @endeditable */
