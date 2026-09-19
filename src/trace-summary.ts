import type { TraceEntry } from "./trace.js";

export interface TraceSummary {
	durationMs: number;
	events: Record<string, number>;
	tools: Record<string, { calls: number; errors: number }>;
	models: string[];
	usage: {
		input: number;
		output: number;
		cacheRead: number;
		cacheWrite: number;
		totalTokens: number;
		costUsd: number;
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberFrom(record: Record<string, unknown>, key: string): number {
	const value = record[key];
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function parseTrace(content: string): TraceEntry[] {
	return content
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line, index) => {
			const parsed: unknown = JSON.parse(line);
			if (
				!isRecord(parsed) ||
				typeof parsed.timestamp !== "string" ||
				typeof parsed.elapsedMs !== "number" ||
				typeof parsed.event !== "string" ||
				!isRecord(parsed.attributes)
			) {
				throw new Error(`Invalid trace entry at line ${index + 1}`);
			}
			return parsed as unknown as TraceEntry;
		});
}

export function summarizeTrace(entries: readonly TraceEntry[]): TraceSummary {
	const events: Record<string, number> = {};
	const tools: Record<string, { calls: number; errors: number }> = {};
	const models = new Set<string>();
	const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, costUsd: 0 };
	let durationMs = 0;

	for (const entry of entries) {
		durationMs = Math.max(durationMs, entry.elapsedMs);
		events[entry.event] = (events[entry.event] ?? 0) + 1;

		if (entry.event === "tool_execution_end") {
			const toolName = entry.attributes.toolName;
			if (typeof toolName === "string") {
				const aggregate = tools[toolName] ?? { calls: 0, errors: 0 };
				aggregate.calls += 1;
				if (entry.attributes.isError === true) aggregate.errors += 1;
				tools[toolName] = aggregate;
			}
		}

		if (entry.event !== "message_end" || !isRecord(entry.attributes.message)) continue;
		const message = entry.attributes.message;
		if (message.role !== "assistant") continue;
		if (typeof message.provider === "string" && typeof message.model === "string") {
			models.add(`${message.provider}/${message.model}`);
		}
		if (!isRecord(message.usage)) continue;
		usage.input += numberFrom(message.usage, "input");
		usage.output += numberFrom(message.usage, "output");
		usage.cacheRead += numberFrom(message.usage, "cacheRead");
		usage.cacheWrite += numberFrom(message.usage, "cacheWrite");
		usage.totalTokens += numberFrom(message.usage, "totalTokens");
		if (isRecord(message.usage.cost)) usage.costUsd += numberFrom(message.usage.cost, "total");
	}

	return { durationMs, events, tools, models: [...models].sort(), usage };
}
