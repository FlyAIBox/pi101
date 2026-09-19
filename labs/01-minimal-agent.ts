import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Agent } from "@earendil-works/pi-agent-core";
import { lookupCustomerTool } from "../src/business/customer.js";
import { createDeepSeekRuntime } from "../src/model.js";
import { createAgentTraceRecorder, lastAssistantText } from "../src/trace.js";

if (existsSync(".env")) loadEnvFile(".env");

if (process.env.DEEPSEEK_API_KEY?.trim() === undefined || process.env.DEEPSEEK_API_KEY.trim() === "") {
	throw new Error(
		"DEEPSEEK_API_KEY is required. Export it in your shell, then run `npm run lab:01`. Do not commit the key.",
	);
}

const { models, model } = createDeepSeekRuntime();
const trace = await createAgentTraceRecorder({
	includeContent: process.env.PI101_TRACE_CONTENT === "1",
});

const agent = new Agent({
	streamFn: models.streamSimple.bind(models),
	toolExecution: "sequential",
	sessionId: `pi101-${Date.now()}`,
	initialState: {
		model,
		thinkingLevel: "low",
		tools: [lookupCustomerTool],
		systemPrompt: [
			"你是客户运营 Agent。",
			"涉及客户事实时必须先调用 lookup_customer；不得猜测。",
			"输出：风险级别、三条证据、下一步动作、是否需要人工审批。",
			"不要发送邮件、修改 CRM 或承诺折扣。",
		].join("\n"),
	},
	beforeToolCall: async ({ toolCall }) => {
		if (toolCall.name !== "lookup_customer") {
			return { block: true, reason: `Tool ${toolCall.name} is not allowed in this lab` };
		}
		return undefined;
	},
});

agent.subscribe((event) => trace.record(event));

await agent.prompt("分析客户 ACME-042 的续费风险，并给出今天应该执行的下一步。只使用工具返回的事实。");

const answer = lastAssistantText(agent.state.messages);
if (answer === "") {
	throw new Error(agent.state.errorMessage ?? "The agent produced no final text");
}

console.log(answer);
console.log(`\nTrace: ${trace.path}`);
