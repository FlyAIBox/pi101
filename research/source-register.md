# 证据源登记表

更新时间：2026-09-25。优先级为固定版本源码/官方文档 > 官方工程文章 > 论文 > 当事人 X 原帖 > 社区观点。

## pi

- [pi 文档 latest](https://pi.dev/docs/latest)
- [pi SDK](https://pi.dev/docs/latest/sdk)
- [pi Providers](https://pi.dev/docs/latest/providers)
- [pi v0.85.1 release](https://github.com/earendil-works/pi/releases/tag/v0.85.1)
- [pi v0.85.1 Agent 源码](https://github.com/earendil-works/pi/tree/v0.85.1/packages/agent)
- [Tool durability](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/docs/tool-durability.md)
- [Assistant durability](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/docs/assistant-durability.md)

## Pi Voice

- [@earendil-works/pi-voice on npm](https://www.npmjs.com/package/@earendil-works/pi-voice)
- [Pi Voice README 固定提交](https://github.com/earendil-works/pi-voice/blob/f28e440bcc82ddad134cc6e54c8cc3f3f45eccdd/README.md)
- [Pi Voice 扩展入口固定提交](https://github.com/earendil-works/pi-voice/blob/f28e440bcc82ddad134cc6e54c8cc3f3f45eccdd/src/index.ts)
- [Pi Voice 文件转写固定提交](https://github.com/earendil-works/pi-voice/blob/f28e440bcc82ddad134cc6e54c8cc3f3f45eccdd/src/file-transcription.ts)

## Anthropic / Claude

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)

## OpenAI

- [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)
- [Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/)
- [Harness engineering](https://openai.com/index/harness-engineering/)
- [Inside our in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/)
- [Agents SDK tracing](https://openai.github.io/openai-agents-js/guides/tracing/)
- [Agents SDK testing](https://openai.github.io/openai-agents-js/guides/testing/)
- [A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)

## AWS

- [AgentCore Evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/how-it-works-evaluations.html)
- [AgentCore observability](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)
- [AgentOps](https://aws.amazon.com/blogs/machine-learning/agentops-operationalize-agentic-ai-at-scale-with-amazon-bedrock-agentcore/)

## 阿里云 / AgentScope

- [AgentScope 2.0](https://github.com/agentscope-ai/agentscope)
- [AgentScope Evaluation](https://doc.agentscope.io/tutorial/task_eval.html)
- [Alibaba Cloud AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)

## DeepSeek

- [DeepSeek API tool calls](https://api-docs.deepseek.com/guides/tool_calls/)
- [DeepSeek context caching](https://api-docs.deepseek.com/guides/kv_cache/)
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [DeepSeek Harness architecture 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/architecture.md)

## OpenTelemetry

- [GenAI attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/)
- [GenAI agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)

## X / Twitter 发现线索

X 只用于发现议题，除当事人经验外不单独支持事实结论：

- [sysls：long-running harness failure modes](https://x.com/systematicls/status/2038241033755168959)
- [Lance Martin：managed agents](https://x.com/RLanceMartin/status/2041930946019295245)
- [cto.new：remote agent sandbox](https://x.com/ctodotnew/status/2017271423782494590)

直接 Twitter 只读凭据在本次研究环境中不可用；以上链接通过公开索引发现，并已用官方代码或工程文章交叉核验可核验的部分。
