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
import Ajv from "ajv";
import { saveTaskState } from "@core/taskState";
import { TesterAgent } from "./testerAgent";
const STATE_PATH = path.resolve("data/state/task.state.json");
const SCHEMA_PATH = path.resolve("contracts/task_state.schema.json");
export class SupervisorAgent {
    constructor(tester = new TesterAgent()) {
        this.tester = tester;
        this.validatorPromise = null;
    }
    async execute(packet) {
        const outputPath = this.resolveOutputPath(packet);
        const raw = await this.readOutput(outputPath);
        const parsed = this.parseState(raw, outputPath);
        const validate = await this.getValidator();
        if (!validate(parsed)) {
            const message = this.formatValidationErrors(validate);
            throw new Error(`SupervisorAgent: task state validation failed - ${message}`);
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
    resolveOutputPath(packet) {
        const candidate = [
            typeof packet.metadata?.supervisorOutput === "string" ? packet.metadata?.supervisorOutput : undefined,
            ...packet.deliverables,
        ].find((value) => Boolean(value));
        if (!candidate) {
            throw new Error("SupervisorAgent: deliverables did not include a state output path");
        }
        return path.resolve(candidate);
    }
    async readOutput(outputPath) {
        try {
            return await fs.readFile(outputPath, "utf8");
        }
        catch (error) {
            throw new Error(`SupervisorAgent: unable to read output at ${this.toRelative(outputPath)} - ${error.message}`);
        }
    }
    parseState(raw, outputPath) {
        try {
            return JSON.parse(raw);
        }
        catch (error) {
            throw new Error(`SupervisorAgent: output at ${this.toRelative(outputPath)} is not valid JSON`);
        }
    }
    async getValidator() {
        if (!this.validatorPromise) {
            this.validatorPromise = this.loadValidator();
        }
        return this.validatorPromise;
    }
    async loadValidator() {
        const schemaRaw = await fs.readFile(SCHEMA_PATH, "utf8");
        const schema = JSON.parse(schemaRaw);
        const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
        return ajv.compile(schema);
    }
    formatValidationErrors(validate) {
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
    toRelative(targetPath) {
        const relative = path.relative(process.cwd(), targetPath);
        return relative || targetPath;
    }
    async runTester(packet, state) {
        try {
            return await this.tester.execute({ packet, state });
        }
        catch (error) {
            return {
                status: "error",
                reason: error.message,
            };
        }
    }
}
/* @endeditable */
