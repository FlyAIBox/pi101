import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AgentEvent, AgentMessage } from "@earendil-works/pi-agent-core";

export interface TraceOptions {
	outputPath?: string;
	includeContent?: boolean;
	now?: () => number;
}

export interface TraceEntry {
	timestamp: string;
	elapsedMs: number;
	event: AgentEvent["type"];
	attributes: Record<string, unknown>;
}

export interface AgentTraceRecorder {
	path: string;
	record(event: AgentEvent): Promise<void>;
}

function messageAttributes(message: AgentMessage, includeContent: boolean): Record<string, unknown> {
	if (message.role === "assistant") {
		const text = message.content
			.filter((part) => part.type === "text")
			.map((part) => part.text)
			.join("\n");
		const toolNames = message.content.filter((part) => part.type === "toolCall").map((part) => part.name);
		return {
			role: message.role,
			provider: message.provider,
			model: message.model,
			stopReason: message.stopReason,
			toolNames,
			usage: message.usage,
			...(message.errorMessage === undefined ? {} : { error: message.errorMessage }),
			...(includeContent ? { text } : { textLength: text.length }),
		};
	}

	if (message.role === "toolResult") {
		return {
			role: message.role,
			toolName: message.toolName,
			toolCallId: message.toolCallId,
			isError: message.isError,
			...(includeContent ? { content: message.content, details: message.details } : {}),
		};
	}

	const text = "content" in message
		? typeof message.content === "string"
			? message.content
			: JSON.stringify(message.content)
		: "";
	return {
		role: message.role,
		...(includeContent ? { text } : { textLength: text.length }),
	};
}

export function eventAttributes(event: AgentEvent, includeContent = false): Record<string, unknown> {
	switch (event.type) {
		case "agent_start":
		case "turn_start":
			return {};
		case "agent_end":
			return { messageCount: event.messages.length };
		case "turn_end":
			return {
				message: messageAttributes(event.message, includeContent),
				toolResultCount: event.toolResults.length,
			};
		case "message_start":
		case "message_end":
			return { message: messageAttributes(event.message, includeContent) };
		case "message_update":
			return {
				message: messageAttributes(event.message, includeContent),
				streamEvent: event.assistantMessageEvent.type,
			};
		case "tool_execution_start":
			return {
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				...(includeContent ? { args: event.args } : {}),
			};
		case "tool_execution_update":
			return {
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				...(includeContent ? { partialResult: event.partialResult } : {}),
			};
		case "tool_execution_end":
			return {
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				isError: event.isError,
				...(includeContent ? { result: event.result } : {}),
			};
	}
}

export async function createAgentTraceRecorder(options: TraceOptions = {}): Promise<AgentTraceRecorder> {
	const now = options.now ?? Date.now;
	const startedAt = now();
	const outputPath = resolve(options.outputPath ?? `artifacts/agent-trace-${startedAt}.jsonl`);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, "", "utf8");

	return {
		path: outputPath,
		async record(event) {
			const current = now();
			const entry: TraceEntry = {
				timestamp: new Date(current).toISOString(),
				elapsedMs: current - startedAt,
				event: event.type,
				attributes: eventAttributes(event, options.includeContent ?? false),
			};
			await appendFile(outputPath, `${JSON.stringify(entry)}\n`, "utf8");
		},
	};
}

export function lastAssistantText(messages: readonly AgentMessage[]): string {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message?.role !== "assistant") continue;
		return message.content
			.filter((part) => part.type === "text")
			.map((part) => part.text)
			.join("\n");
	}
	return "";
}
