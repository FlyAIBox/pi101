import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Agent } from "@earendil-works/pi-agent-core";
import { lookupCustomerTool } from "../src/business/customer.js";
import { createDeepSeekRuntime } from "../src/model.js";
import { createAgentTraceRecorder, lastAssistantText } from "../src/trace.js";

/**
 * Lab 01：一个最小但完整的工具调用 Agent。
 *
 * ## 它做什么
 * 接收“分析客户续费风险”的自然语言任务。模型不能凭空编造客户事实，必须先调用
 * `lookup_customer` 查询数据，再根据工具结果生成结构化建议。
 *
 * ## 核心执行链路
 * 1. 加载环境变量并检查模型 API Key。
 * 2. 创建模型运行时和执行轨迹记录器。
 * 3. 创建 Agent，注入模型、工具、系统提示词和工具调用守卫。
 * 4. `agent.prompt(...)` 启动“模型判断 → 调用工具 → 读取结果 → 生成答案”的循环。
 * 5. 从消息历史中取出最终回答，并输出回答及轨迹文件位置。
 *
 * ## Agent 在这里的角色
 * `Agent` 来自 `@earendil-works/pi-agent-core`，可以把它理解为一个循环调度器：
 * 它维护会话状态，把消息交给模型，在模型请求工具时执行工具，再把工具结果送回模型，
 * 直到模型给出最终文本。业务事实由工具提供，行为边界由系统提示词和代码守卫共同约束。
 *
 * ## 阅读重点
 * 这个示例刻意展示三层约束：Prompt 规定“应该怎么做”，`tools` 限定“能够做什么”，
 * `beforeToolCall` 在执行前强制检查“这次调用是否允许”。生产系统不应只依赖 Prompt。
 */

// 本地运行时从项目根目录读取 .env；线上环境通常由部署平台直接注入环境变量。
if (existsSync(".env")) loadEnvFile(".env");

// 尽早失败，避免 Agent 启动后才因缺少凭据报出难以定位的模型请求错误。
if (process.env.DEEPSEEK_API_KEY?.trim() === undefined || process.env.DEEPSEEK_API_KEY.trim() === "") {
	throw new Error(
		"DEEPSEEK_API_KEY is required. Export it in your shell, then run `npm run lab:01`. Do not commit the key.",
	);
}

// `models` 提供实际的流式调用能力；`model` 是写入 Agent 状态的模型配置。
const { models, model } = createDeepSeekRuntime();

// 轨迹用于复盘每次模型输出、工具调用和状态变化。
// 默认不记录正文，只有显式设置 PI101_TRACE_CONTENT=1 才记录，以降低敏感数据泄露风险。
const trace = await createAgentTraceRecorder({
	includeContent: process.env.PI101_TRACE_CONTENT === "1",
});

// Agent 的配置同时描述了“推理能力”“可用工具”和“不可越过的执行边界”。
const agent = new Agent({
	// Agent 需要保持正确的 `this` 上下文，因此将 streamSimple 绑定到 models 实例。
	streamFn: models.streamSimple.bind(models),
	// 工具按顺序执行，让示例的行为和轨迹更容易理解、复现。
	toolExecution: "sequential",
	// 每次运行使用独立会话 ID，便于在日志或轨迹中区分不同实验。
	sessionId: `pi101-${Date.now()}`,
	initialState: {
		model,
		// 本实验任务较简单，使用较低思考等级以减少延迟和成本。
		thinkingLevel: "low",
		// 工具清单是能力白名单：模型只能看到并请求这里注册的工具。
		tools: [lookupCustomerTool],
		// 系统提示词定义输出契约与业务政策，但它属于“软约束”，不能替代代码校验。
		systemPrompt: [
			"你是客户运营 Agent。",
			"涉及客户事实时必须先调用 lookup_customer；不得猜测。",
			"输出：风险级别、三条证据、下一步动作、是否需要人工审批。",
			"不要发送邮件、修改 CRM 或承诺折扣。",
		].join("\n"),
	},
	// 工具执行前的“硬守卫”。即使模型请求了未授权工具，也会在真正执行前被拦截。
	// 当前 tools 中只有 lookup_customer；这里保留二次校验，示范纵深防御的工程做法。
	beforeToolCall: async ({ toolCall }) => {
		if (toolCall.name !== "lookup_customer") {
			return { block: true, reason: `Tool ${toolCall.name} is not allowed in this lab` };
		}
		return undefined;
	},
});

// 订阅全部 Agent 事件并写入轨迹，主业务流程无需感知具体的日志格式和存储方式。
agent.subscribe((event) => trace.record(event));

// prompt 会驱动完整 Agent 循环，而不只是发起一次普通的模型对话。
await agent.prompt("分析客户 ACME-042 的续费风险，并给出今天应该执行的下一步。只使用工具返回的事实。");

// 最终答案仍保存在 Agent 的消息历史中；辅助函数负责找到最后一条助手文本。
const answer = lastAssistantText(agent.state.messages);
if (answer === "") {
	// 空答案通常意味着模型或工具执行失败，优先透传 Agent 保存的错误信息。
	throw new Error(agent.state.errorMessage ?? "The agent produced no final text");
}

// 同时输出结果和轨迹位置：前者供用户消费，后者供工程师调试与审计。
console.log(answer);
console.log(`\nTrace: ${trace.path}`);
