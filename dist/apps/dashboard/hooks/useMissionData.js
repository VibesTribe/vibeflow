import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseEventsLog, deriveQualityMap } from "../../../src/utils/events";
import { buildStatusSummary, deriveSlices, mapAgent } from "../utils/mission";
import { adaptVibePilotToDashboard } from "../lib/vibepilotAdapter";
// Governor API URL — auto-detect based on where the dashboard is running.
// localhost: use direct connection. Deployed (Vercel/etc): use Cloudflare tunnel.
function resolveGovernorAPI() {
    if (import.meta.env.VITE_GOVERNOR_API) {
        return import.meta.env.VITE_GOVERNOR_API;
    }
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return "https://webhooks.vibestribe.rocks";
    }
    return "http://localhost:8080";
}
const GOVERNOR_API = resolveGovernorAPI();
const SSE_STREAM_PATH = "/api/dashboard/stream";
const FALLBACK_POLL_MS = 15000; // fallback if SSE fails
// ETag cache — avoids re-fetching 181KB when nothing changed
let lastEtag = null;
let cachedGovData = null;
function resolveDashboardPath(path) {
    const base = import.meta.env.BASE_URL ?? "/";
    const normalized = path.startsWith("/") ? path.slice(1) : path;
    if (base === "/") {
        return `/${normalized}`;
    }
    return `${base.replace(/\/$/, "")}/${normalized}`;
}
const initialSnapshot = {
    tasks: [],
    agents: [],
    failures: [],
    mergeCandidates: [],
    metrics: {},
    sliceCatalog: [],
    updatedAt: new Date().toISOString(),
};
const initialRunMetrics = {
    runs: [],
    updated_at: new Date().toISOString(),
};
async function fetchFromGovernor() {
    try {
        const headers = {};
        if (lastEtag) {
            headers["If-None-Match"] = lastEtag;
        }
        const res = await fetch(`${GOVERNOR_API}/api/dashboard`, {
            cache: "no-store",
            headers,
        });
        if (res.status === 304) {
            // Nothing changed — reuse cached data
            return cachedGovData;
        }
        if (!res.ok) {
            console.warn(`[mission-data] governor returned ${res.status}`);
            return cachedGovData; // Fall back to cache on error
        }
        const etag = res.headers.get("ETag");
        if (etag)
            lastEtag = etag;
        const data = await res.json();
        cachedGovData = data;
        return data;
    }
    catch (err) {
        console.warn("[mission-data] governor fetch failed, using cache", err);
        return cachedGovData; // Use cached data on network error
    }
}
export function useMissionData() {
    const [snapshot, setSnapshot] = useState(initialSnapshot);
    const [runMetrics, setRunMetrics] = useState(initialRunMetrics);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState({ snapshot: true, metrics: true, events: true });
    const mountedRef = useRef(true);
    const esRef = useRef(null);
    const fallbackPollRef = useRef(null);
    useEffect(() => () => {
        mountedRef.current = false;
        if (esRef.current)
            esRef.current.close();
        if (fallbackPollRef.current)
            clearInterval(fallbackPollRef.current);
    }, []);
    const fetchData = useCallback(async () => {
        if (!mountedRef.current)
            return;
        setLoading((prev) => ({ ...prev, snapshot: true, events: true }));
        // Primary: Governor API (local PG)
        const gov = await fetchFromGovernor();
        if (!mountedRef.current)
            return;
        if (gov) {
            // Adapt governor data through the same adapter the dashboard was built for
            const adapted = adaptVibePilotToDashboard(gov.tasks || [], gov.task_runs || [], gov.models || [], gov.platforms || [], gov.system_counters);
            setSnapshot({
                tasks: adapted.tasks,
                agents: adapted.agents,
                failures: [],
                mergeCandidates: [],
                metrics: adapted.metrics,
                sliceCatalog: adapted.slices,
                roi: adapted.roi,
                systemCounters: adapted.system_counters,
                updatedAt: adapted.updated_at,
            });
            // Build unified pipeline timeline from all sources
            const pipelineEvents = [];
            // 1. Orchestrator events (approvals, failures, routing)
            if (gov.orchestrator_events) {
                for (const row of gov.orchestrator_events) {
                    pipelineEvents.push({
                        id: row.id,
                        taskId: row.task_id || "unknown",
                        type: row.event_type || "unknown",
                        timestamp: row.created_at || new Date().toISOString(),
                        reasonCode: row.reason || undefined,
                        details: {
                            ...(row.details || {}),
                            runnerId: row.runner_id,
                            fromRunnerId: row.from_runner_id,
                            toRunnerId: row.to_runner_id,
                            modelId: row.model_id,
                            source: "orchestrator",
                        },
                    });
                }
            }
            // 2. Task state transitions (PRD committed → available → in_progress → review → complete)
            if (gov.tasks) {
                for (const task of gov.tasks) {
                    const taskId = task.id;
                    const title = task.title || "Untitled";
                    // Task creation = PRD committed
                    if (task.created_at) {
                        pipelineEvents.push({
                            id: `${taskId}-created`,
                            taskId,
                            type: "prd_committed",
                            timestamp: task.created_at,
                            details: { message: `PRD: ${title}`, phase: task.phase, source: "task" },
                        });
                    }
                    // Task started
                    if (task.started_at) {
                        pipelineEvents.push({
                            id: `${taskId}-started`,
                            taskId,
                            type: "task_started",
                            timestamp: task.started_at,
                            reasonCode: task.status === "in_progress" ? "in_progress" : undefined,
                            details: { message: `Agent dispatched: ${task.assigned_to || "unknown"}`, source: "task" },
                        });
                    }
                    // Task completed
                    if (task.completed_at) {
                        const isFailed = task.status === "failed" || task.failure_notes;
                        pipelineEvents.push({
                            id: `${taskId}-completed`,
                            taskId,
                            type: isFailed ? "task_failed" : "task_completed",
                            timestamp: task.completed_at,
                            reasonCode: task.failure_notes || undefined,
                            details: {
                                message: isFailed ? `Failed: ${task.failure_notes || "unknown error"}` : `Completed: ${title}`,
                                status: task.status,
                                source: "task",
                            },
                        });
                    }
                }
            }
            // 3. Plans (planner output, supervisor review)
            if (gov.plans) {
                for (const plan of gov.plans) {
                    const taskId = plan.prd_path || plan.id;
                    // Plan created = planner finished
                    if (plan.created_at) {
                        pipelineEvents.push({
                            id: `plan-${plan.id}-created`,
                            taskId,
                            type: "plan_created",
                            timestamp: plan.created_at,
                            details: {
                                message: `Plan v${plan.plan_version || "?"} created`,
                                complexity: plan.complexity,
                                councilMode: plan.council_mode,
                                source: "plan",
                            },
                        });
                    }
                    // Plan approved/rejected
                    if (plan.approved_at) {
                        const isRejected = plan.human_decision === "rejected" || plan.human_decision === "revision_needed";
                        pipelineEvents.push({
                            id: `plan-${plan.id}-reviewed`,
                            taskId,
                            type: isRejected ? "plan_rejected" : "plan_approved",
                            timestamp: plan.approved_at,
                            reasonCode: plan.human_decision || undefined,
                            details: {
                                message: isRejected
                                    ? `Plan ${plan.human_decision}: ${plan.council_consensus || ""}`
                                    : `Plan approved (v${plan.plan_version})`,
                                councilConsensus: plan.council_consensus,
                                source: "plan",
                            },
                        });
                    }
                }
            }
            // 4. Council reviews (individual reviewer votes)
            if (gov.council_reviews) {
                for (const review of gov.council_reviews) {
                    pipelineEvents.push({
                        id: `review-${review.id}`,
                        taskId: review.plan_id,
                        type: review.vote === "reject" ? "council_rejected" : "council_approved",
                        timestamp: review.created_at,
                        details: {
                            message: `${review.lens || "Reviewer"}: ${review.vote} (confidence: ${review.confidence || "?"})`,
                            model: review.model_id,
                            concerns: review.concerns,
                            suggestions: review.suggestions,
                            source: "council",
                        },
                    });
                }
            }
            // 5. Task runs (agent execution results)
            if (gov.task_runs) {
                for (const run of gov.task_runs) {
                    if (run.completed_at) {
                        const isFailed = run.status === "failed";
                        pipelineEvents.push({
                            id: `run-${run.id}`,
                            taskId: run.task_id,
                            type: isFailed ? "run_failed" : "run_completed",
                            timestamp: run.completed_at,
                            reasonCode: run.error || undefined,
                            details: {
                                message: isFailed
                                    ? `Run failed: ${run.error || "unknown"}`
                                    : `Run completed (${run.tokens_used || 0} tokens)`,
                                model: run.model_id,
                                platform: run.platform,
                                courier: run.courier,
                                chatUrl: run.chat_url,
                                source: "task_run",
                            },
                        });
                    }
                }
            }
            // 6. Test results
            if (gov.test_results) {
                for (const test of gov.test_results) {
                    pipelineEvents.push({
                        id: `test-${test.id}`,
                        taskId: test.task_id,
                        type: test.passed ? "test_passed" : "test_failed",
                        timestamp: test.created_at,
                        details: {
                            message: test.passed ? "Tests passed" : `Tests failed: ${test.error || ""}`,
                            source: "test",
                        },
                    });
                }
            }
            // 7. Failure records (quality issues, broken output, routing failures)
            if (gov.failure_records) {
                for (const fail of gov.failure_records) {
                    pipelineEvents.push({
                        id: `failure-${fail.id}`,
                        taskId: fail.task_id || fail.task_run_id || "system",
                        type: "failure_detected",
                        timestamp: fail.created_at,
                        reasonCode: fail.failure_type || undefined,
                        details: {
                            message: `Failure: ${fail.failure_type || "unknown"} (${fail.failure_category || "unknown"})`,
                            model: fail.model_id,
                            platform: fail.platform,
                            durationSec: fail.duration_sec,
                            tokensUsed: fail.tokens_used,
                            source: "failure_record",
                        },
                    });
                }
            }
            // 8. Maintenance commands (branch create/merge, cleanup operations)
            if (gov.maintenance_commands) {
                for (const cmd of gov.maintenance_commands) {
                    const payload = typeof cmd.payload === "string" ? JSON.parse(cmd.payload || "{}") : (cmd.payload || {});
                    const isCompleted = cmd.status === "completed";
                    const isFailed = cmd.status === "failed";
                    pipelineEvents.push({
                        id: `maint-${cmd.id}`,
                        taskId: payload.source?.replace("task/", "") || cmd.id,
                        type: isFailed ? "maintenance_failed" : isCompleted ? "maintenance_completed" : "maintenance_started",
                        timestamp: cmd.approved_at || cmd.created_at,
                        reasonCode: cmd.error_message || undefined,
                        details: {
                            message: `${cmd.command_type}: ${isCompleted ? "done" : isFailed ? `failed — ${cmd.error_message || "unknown"}` : cmd.status}`,
                            commandType: cmd.command_type,
                            payload,
                            approvedBy: cmd.approved_by,
                            retryCount: cmd.retry_count,
                            source: "maintenance",
                        },
                    });
                }
            }
            // Sort all events by timestamp (newest first)
            pipelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setEvents(pipelineEvents);
            setLoading((prev) => ({ ...prev, snapshot: false, events: false }));
            return;
        }
        // Fallback: mock data files
        try {
            const [snapshotRes, eventsRes] = await Promise.all([
                fetch(resolveDashboardPath("data/state/dashboard.mock.json"), { cache: "no-store" }),
                fetch(resolveDashboardPath("data/state/events.log.jsonl"), { cache: "no-store" }),
            ]);
            if (snapshotRes.ok) {
                const parsed = await snapshotRes.json();
                if (mountedRef.current) {
                    setSnapshot({
                        tasks: parsed.tasks ?? [],
                        agents: parsed.agents ?? [],
                        failures: parsed.failures ?? [],
                        mergeCandidates: parsed.merge_candidates ?? [],
                        metrics: parsed.metrics ?? {},
                        sliceCatalog: Array.isArray(parsed.slices) ? parsed.slices : [],
                        updatedAt: parsed.updated_at ?? new Date().toISOString(),
                    });
                }
            }
            if (eventsRes.ok) {
                const raw = await eventsRes.text();
                if (mountedRef.current) {
                    setEvents(parseEventsLog(raw));
                }
            }
        }
        catch (error) {
            console.warn("[mission-data] mock data fetch failed", error);
        }
        if (mountedRef.current) {
            setLoading((prev) => ({ ...prev, snapshot: false, events: false }));
        }
    }, []);
    useEffect(() => {
        fetchData();
        // SSE: server pushes notifications when PG tables change.
        // On notification, do a targeted re-fetch (ETag caching still applies).
        // EventSource auto-reconnects on disconnect.
        const sseUrl = `${GOVERNOR_API}${SSE_STREAM_PATH}`;
        let sseFailed = false;
        try {
            const es = new EventSource(sseUrl);
            esRef.current = es;
            es.addEventListener("change", () => {
                // Server says something changed — re-fetch the full dashboard payload.
                // ETag ensures we skip if data hasn't actually changed.
                if (mountedRef.current)
                    fetchData();
            });
            es.addEventListener("error", () => {
                // SSE connection failed or dropped — EventSource will auto-retry,
                // but also start a fallback poll as safety net.
                if (!sseFailed && mountedRef.current) {
                    sseFailed = true;
                    console.warn("[mission-data] SSE failed, falling back to polling");
                    fallbackPollRef.current = setInterval(() => {
                        if (mountedRef.current)
                            fetchData();
                    }, FALLBACK_POLL_MS);
                }
            });
        }
        catch {
            // EventSource constructor failed (e.g. old browser)
            sseFailed = true;
            fallbackPollRef.current = setInterval(() => {
                if (mountedRef.current)
                    fetchData();
            }, FALLBACK_POLL_MS);
        }
        return () => {
            if (esRef.current) {
                esRef.current.close();
                esRef.current = null;
            }
            if (fallbackPollRef.current) {
                clearInterval(fallbackPollRef.current);
                fallbackPollRef.current = null;
            }
        };
    }, [fetchData]);
    const mappedAgents = useMemo(() => snapshot.agents.map(mapAgent), [snapshot.agents]);
    const slices = useMemo(() => deriveSlices(snapshot.tasks, events, snapshot.agents, snapshot.sliceCatalog), [snapshot.tasks, events, snapshot.agents, snapshot.sliceCatalog]);
    const statusSummary = useMemo(() => buildStatusSummary(snapshot.tasks), [snapshot.tasks]);
    const qualityByTask = useMemo(() => deriveQualityMap(events), [events]);
    const tokenUsage = useMemo(() => {
        if (typeof snapshot.metrics?.tokens_used === "number") {
            return snapshot.metrics.tokens_used;
        }
        const totalRuns = runMetrics.runs.length;
        return totalRuns * 1_000;
    }, [snapshot.metrics, runMetrics.runs]);
    const refresh = useCallback(() => {
        fetchData();
    }, [fetchData]);
    return {
        snapshot,
        events,
        runMetrics,
        slices,
        agents: mappedAgents,
        statusSummary,
        qualityByTask,
        tokenUsage,
        roi: snapshot.roi || null,
        systemCounters: snapshot.systemCounters || null,
        loading,
        refresh,
    };
}
