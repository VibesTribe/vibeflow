/**
 * vibeflow-meta:
 * id: src/agents/supervisorAgent.ts
 * task: REBUILD-V5
 * regions:
 *   - id: supervisor-agent
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:supervisor-agent */
import { promises as fs } from "fs";
import path from "path";
import Ajv, { type ValidateFunction } from "ajv";
import { TaskPacket } from "@core/types";
import { saveTaskState, TaskState } from "@core/taskState";
import { TesterAgent, TesterOutcome } from "./testerAgent";

const STATE_PATH = path.resolve("data/state/task.state.json");
const SCHEMA_PATH = path.resolve("contracts/task_state.schema.json");

export class SupervisorAgent {
  private validatorPromise: Promise<ValidateFunction<TaskState>> | null = null;

  constructor(private readonly tester = new TesterAgent()) {}

  async execute(packet: TaskPacket) {
    const outputPath = this.resolveOutputPath(packet);
    const raw = await this.readOutput(outputPath);
    const parsed = this.parseState(raw, outputPath);

    const validate = await this.getValidator();
    if (!validate(parsed)) {
      const message = this.formatValidationErrors(validate);
      throw new Error(`SupervisorAgent: task state validation failed — ${message}`);
    }

    await saveTaskState(parsed);
    const testerOutcome = await this.runTester(packet, parsed);

    return {
      summary: `Supervisor validated state for ${packet.taskId}`,
      confidence: packet.confidence,
      deliverables: [this.toRelative(STATE_PATH)],
      metadata: {
        source: this.toRelative(outputPath),
        tasks: parsed.tasks?.length ?? 0,
        tester: testerOutcome,
      },
    };
  }

  private resolveOutputPath(packet: TaskPacket): string {
    const candidate = [
      typeof packet.metadata?.supervisorOutput === "string"
        ? (packet.metadata?.supervisorOutput as string)
        : undefined,
      ...packet.deliverables,
    ].find((value): value is string => Boolean(value));

    if (!candidate) {
      throw new Error("SupervisorAgent: deliverables did not include a state output path");
    }

    return path.resolve(candidate);
  }

  private async readOutput(outputPath: string): Promise<string> {
    try {
      return await fs.readFile(outputPath, "utf8");
    } catch (error) {
      throw new Error(
        `SupervisorAgent: unable to read output at ${this.toRelative(outputPath)} — ${
          (error as Error).message
        }`
      );
    }
  }

  private parseState(raw: string, outputPath: string): TaskState {
    try {
      return JSON.parse(raw) as TaskState;
    } catch {
      throw new Error(
        `SupervisorAgent: output at ${this.toRelative(outputPath)} is not valid JSON`
      );
    }
  }

  private async getValidator(): Promise<ValidateFunction<TaskState>> {
    if (!this.validatorPromise) {
      this.validatorPromise = this.loadValidator();
    }
    return this.validatorPromise;
  }

  private async loadValidator(): Promise<ValidateFunction<TaskState>> {
    const schemaRaw = await fs.readFile(SCHEMA_PATH, "utf8");
    const schema = JSON.parse(schemaRaw);
    const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
    return ajv.compile<TaskState>(schema);
  }

  private formatValidationErrors(validate: ValidateFunction<unknown>): string {
    if (!validate.errors || validate.errors.length === 0) {
      return "unknown schema violation";
    }

    return validate.errors
      .map((err) => {
        const pathSegment = err.instancePath || err.schemaPath;
        return `${pathSegment} ${err.message ?? "failed validation"}`.trim();
      })
      .join("; ");
  }

  private toRelative(targetPath: string): string {
    const relative = path.relative(process.cwd(), targetPath);
    return relative || targetPath;
  }

  private async runTester(packet: TaskPacket, state: TaskState): Promise<TesterOutcome> {
    try {
      return await this.tester.execute({ packet, state });
    } catch (error) {
      return {
        status: "error",
        reason: (error as Error).message,
      };
    }
  }
}
/* @endeditable */
