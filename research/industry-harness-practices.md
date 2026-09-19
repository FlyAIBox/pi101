# Harness Agent / 生产级 Agent 工程实践调研

> 研究截止：2026-09-18（Asia/Shanghai）  
> 用途：为 pi101 系列提供模型无关的生产工程基线，不做模型横评。  
> 证据边界：正文只采用官方文档、官方工程博客、官方代码仓库、论文和当事人的公开 X 原帖。X 内容只作为“观点/线索”，不作为未经复核的事实依据。

## 结论摘要

1. **[事实] Harness 不是一个“循环调用模型和工具”的薄壳，而是 Agent 的控制面。** 它至少负责模型请求、工具调度、上下文投影、持久状态、权限、恢复、轨迹和停止条件。OpenAI 把 Codex harness 明确定义为 agent loop 与执行逻辑，并在 App Server 中再加入 thread 生命周期、持久化、认证、沙箱及扩展；DeepSeek Harness 则把 loop、session、tools、model adapter 都实现为可替换插件。[OpenAI：Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)（2026-01-23）、[OpenAI：Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/)（2026-02-04）、[DeepSeek Harness architecture 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/architecture.md)（提交于 2026-09-17）。**对 pi101 的启示：** 文章不能把 Harness 简化成 `while (toolCall)`；需要画出控制面及其稳定边界。

2. **[事实] 与业务结合的关键不是增加自治，而是选择正确的确定性边界。** Anthropic 建议已知路径用代码编排的 workflow，只有步骤不可预知时才让模型动态决策；OpenAI 的内部数据 Agent 把重复分析固化为可复用 workflow，并把已有数据权限原样透传。[Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)（2024-12-19）、[OpenAI：Inside our in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/)（2026-01-29）。**对 pi101 的启示：** 三个产品实战都要先画业务状态机，再标出“代码决定”和“模型决定”的边界。

3. **[事实] 持久 session、可替换 harness、可重建 sandbox 应是三个独立故障域。** Anthropic 的 Managed Agents 将 session 定义为追加式事件日志，并让 harness 与 sandbox 都可独立失败和替换；DeepSeek Harness 同样以 session log 作为模型上下文和恢复的事实源。[Anthropic：Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)（2026-04-08）、[DeepSeek Harness architecture 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/architecture.md)（2026-09-17）。**对 pi101 的启示：** 不应把运行状态只存在 Node 进程、模型上下文或容器文件系统里。

4. **[事实] 安全主边界应是确定性的环境隔离，审批是补充机制。** Anthropic 披露其用户约批准 93% 的权限请求，并将审批疲劳视为风险；OpenAI 同样把 sandbox、approval、network policy、credential storage 和审计分层处理。[Anthropic：How we contain Claude](https://www.anthropic.com/engineering/how-we-contain-claude)（2026-05-25）、[OpenAI：Running Codex safely at OpenAI](https://openai.com/index/running-codex-safely/)（2026-05-08）。**对 pi101 的启示：** 实操必须演示文件、网络、身份三个独立边界，以及拒绝后的安全恢复，不能只弹确认框。

5. **[事实] 观测与评测应共享同一条运行轨迹，但不能混为一谈。** AWS AgentCore Evaluations 直接消费采用 OpenTelemetry GenAI 语义的 traces；Anthropic 则把 eval harness 定义为运行任务、记录步骤、评分和聚合的基础设施。生产监控发现真实分布问题，离线 eval 负责可重复回归。[AWS：AgentCore Evaluations](https://aws.amazon.com/blogs/machine-learning/build-reliable-ai-agents-with-amazon-bedrock-agentcore-evaluations/)（2026-03-31）、[Anthropic：Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)（2026-01-09）。**对 pi101 的启示：** trace 是证据载体，grader 是判断器，业务 KPI 是最终结果；三者要分层建模。

6. **[事实] Agent 成本必须按“完成一个业务任务”核算。** Anthropic 报告普通 agent 约消耗聊天的 4 倍 token，多 Agent 约 15 倍；AWS 的生产建议把 task completion、latency、tool error、loop detection 和 cost per completed task 放在同一个系统级评估层。[Anthropic：Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)（2025-06-13）、[AWS：AgentOps](https://aws.amazon.com/blogs/machine-learning/agentops-operationalize-agentic-ai-at-scale-with-amazon-bedrock-agentcore/)（2026-06-01）。**对 pi101 的启示：** 不能只展示单次模型调用 token；要统计成功任务成本、失败浪费和人工接管成本。

7. **[事实] OpenTelemetry 是合适的厂商无关底座，但 GenAI/Agent 语义目前仍处于 Development。** 官方 Agent spans 已覆盖 `invoke_agent`、`invoke_workflow`、`plan`、`execute_tool` 等操作，但规范页面明确标注为 Development。[OpenTelemetry：GenAI agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)（持续更新；访问于 2026-09-18）。**对 pi101 的启示：** 采用 OTel trace/span/event/metric，同时用带版本的 `pi101.*` 字段补齐业务结果、预算、审批和恢复语义，避免把实验性字段写死成领域模型。

8. **[事实] 最新 DeepSeek 官方实践已经不只是模型 API：官方在 2026-08 开源了 DeepSeek Harness。** 截止研究日仓库为 developer preview，采用“everything is a plugin”，已有持久 session、工具管线、权限、沙箱、compaction、goal、workflow、重试和 OTel 日志导出；官方同时明确声明它未经安全审计、不能视作 production-ready。[DeepSeek Harness README 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/README.md)（快照提交于 2026-09-17）、[Safety 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/SAFETY.md)（2026-09-17）。**对 pi101 的启示：** 它适合作为 pi 的最新横向源码对照，不适合作为生产安全性证明。

## 1. Agent loop 与 Harness 边界

### 1.1 从最小循环到控制面

- **[事实] 最小 agent loop 是：组装输入 → 模型推理 → 执行工具 → 将结果放回上下文 → 重复，直到模型不再调用工具。** 一个 turn 可包含多个模型 step；上下文管理是 loop 的职责之一。[OpenAI：Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)（2026-01-23）。**pi101 启示：** 第一篇源码实验应记录 turn、step、model call、tool call 四级 ID，并验证停止条件。

- **[事实] 产品级 harness 还要管理 thread 的 create/resume/fork/archive、事件持久化、配置、认证、工具执行、sandbox、MCP 与 skills。** OpenAI 用双向 JSON-RPC App Server 将同一 Codex core 暴露给 CLI、IDE、桌面和 Web，而不是在每个 UI 重写 loop。[OpenAI：Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/)（2026-02-04）。**pi101 启示：** UI/渠道和 Harness 应通过事件协议连接，不能把 loop 嵌进某一个 CLI 或 HTTP handler。

- **[事实] DeepSeek Harness 将 model adapter、tool registry、session log、agent loop 都作为 Cordis 插件；事件分为 durable session events、live agent events 与 capability events。** 其 turn 流明确记录 `turn/start`、`step/start`、请求、流式响应、tool call/result 与 `turn/end`。[DeepSeek Harness architecture 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/architecture.md)（2026-09-17）。**pi101 启示：** 对 pi 的源码拆解应特别识别哪些是稳定 seam，哪些只是当前 loop 的实现细节。

- **[事实] AgentScope 2.0 同时提供模型驱动 ReAct 与固定 Pipeline，并把两者放在同一事件流、工具、上下文、权限、workspace 与部署系统中。** [AgentScope v2.0.8 README](https://github.com/agentscope-ai/agentscope/tree/v2.0.8)（2026-09-08）。**pi101 启示：** “固定 workflow”和“开放 agent”不应成为两套不可组合的基础设施。

### 1.2 推荐的 pi101 Harness 分层

```text
业务状态机 / SLA / 人工职责
            ↓
Agent policy：目标、预算、停止、升级、恢复
            ↓
Harness：turn/step、context、tools、state、events
            ↓
Provider adapter       Sandbox / identity / network
            ↓                     ↓
           Model                 External systems
```

**[综合判断]** 模型适配器只是底层端口；业务状态和 Harness 不应依赖某家模型的消息格式。该判断由 OpenAI 的 Codex core/App Server 分离、Anthropic 的 brain/session/hands 分离和 DeepSeek 的可替换 adapter seam 共同支持。**pi101 验收：** 更换 provider 时只修改 adapter/config，业务状态机、工具、轨迹和 eval 不修改。

## 2. 与业务工作流结合

- **[事实] Workflow 适合路径可预定义、成功条件明确的任务；Agent 适合步骤数量和工具选择无法预知的开放任务。** Agent 会用延迟和成本换取灵活性，复杂度只有在评测显示业务收益时才应加入。[Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)（2024-12-19）。**pi101 启示：** 每个案例先实现确定性主流程，只在“搜索、诊断、方案选择”等开放节点调用 Agent。

- **[事实] OpenAI 内部数据 Agent 的有效业务集成包含五层：组织语义与表级知识、按需检索、真实仓库查询、既有权限透传、可复用分析 workflow。** 它还发现暴露重叠工具会降低可靠性，因此合并并限制工具集。[OpenAI：Inside our in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/)（2026-01-29）。**pi101 启示：** OPC 客户运营案例不应直接把 CRM 全部 API 暴露给模型；应给少量按业务动作命名的工具，并继承当前用户权限。

- **[事实] OpenAI 的 agent-first 工程实验将 repo 内结构化文档作为事实源，以短 `AGENTS.md` 作为目录，通过可执行规则、CI 和周期性清理维护一致性。** 它强调 agent 看不到的 Slack、人的脑内知识或外部文档在运行时等于不存在。[OpenAI：Harness engineering](https://openai.com/index/harness-engineering/)（2026-02-11）。**pi101 启示：** 业务知识需要转成可检索、可版本化、可验证的 artifact；不能依赖超长 system prompt 或口头规则。

- **[事实] AgentScope 2.0 的 Agent Service 直接提供 multi-tenant/session、IM channels、资源共享、持久化、调度和 background task wakeup。** [AgentScope v2.0.8 README](https://github.com/agentscope-ai/agentscope/tree/v2.0.8)（2026-09-08）。**pi101 启示：** 企业案例必须展示租户、身份、渠道和后台任务，而不只是本地 CLI demo。

- **[事实] 阿里云 AgentRun 把模型 gateway、runtime、sandbox、tool hub、credential、observability 和 cost analysis 做成可选择的模块，并支持主流框架和 OpenAI-compatible 模型。** [Alibaba Cloud：What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)（更新于 2026-08-22）。**pi101 启示：** 产品架构要允许“只替换某层基础设施”，不要求整体迁移到封闭平台。

### 业务接入的最低模板

每个 pi101 产品案例至少声明：

1. 业务目标与可验证终态；
2. 确定性 workflow 与 Agent 决策点；
3. 操作对象、所有者和权限来源；
4. 可逆动作、不可逆动作及审批规则；
5. 超时、预算、重试、人工接管和补偿动作；
6. 业务 KPI、技术 SLI 与单位成功任务成本。

## 3. State 与 Context

- **[事实] Context engineering 是每次模型调用时对 system、tools、MCP、外部数据和历史的动态选择，而不是把所有资料一次塞入 prompt。** Anthropic 推荐 just-in-time 检索，用路径、查询和链接等轻量引用让 Agent 按需加载；长任务再组合 compaction、结构化笔记和多 Agent。[Anthropic：Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)（2025-09-29）。**pi101 启示：** 轨迹需记录“候选上下文 → 选择原因 → 最终投影”，才能诊断上下文污染。

- **[事实] 长任务的可靠交接可依靠 initializer、结构化 feature list、进度文件、git history 和每轮一个增量目标，而不是依赖旧对话仍在窗口中。** Anthropic 的实验要求端到端验证后才能将 feature 标为完成。[Anthropic：Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)（2025-11-26）。**pi101 启示：** 个人研究 Agent 与研发 Agent 都要产出结构化 checkpoint，重启后用 checkpoint 恢复而不是回放无限历史。

- **[事实] Anthropic 在托管 Agent 中将 session 定义为外置追加日志，harness 可以任意压缩或重置模型上下文，但不能破坏可恢复事实。** [Anthropic：Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)（2026-04-08）。**pi101 启示：** 区分四类状态：durable business state、append-only run ledger、可重建 context projection、临时 sandbox state。

- **[事实] DeepSeek Harness 的 session log 是模型可见历史的唯一事实源；compaction 用 durable start/summary/end 记录操作并保留 shadowed seq，崩溃中的 compaction 会留下可识别的 orphan lock。** [DeepSeek session/turn architecture](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/architecture.md) 与 [compaction](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/subsystems/compaction.md)（2026-09-17）。**pi101 启示：** compaction 本身也必须可审计和可恢复，不能静默覆盖历史。

- **[事实] 阿里云 AgentRun 将 session affinity、scale-to-zero、session history/state 与长期 memory 分开提供。** [Alibaba Cloud：What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)（2026-08-22）、[Memory storage](https://www.alibabacloud.com/help/en/functioncompute/create-and-manage-memory-storage)（更新于 2026-08）。**pi101 启示：** “同一会话路由到同一实例”是性能策略，不应成为状态正确性的前提。

## 4. Tools、Permissions 与 Sandbox

- **[事实] Codex 自带 sandbox 只约束 Codex 自带 shell；MCP 等外部工具必须自行实现 guardrails。** [OpenAI：Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)（2026-01-23）。**pi101 启示：** 每个 tool definition 必须声明执行位置、身份、网络、数据分类、幂等性、可逆性和审批策略，不能因它出现在统一工具表中就假设已隔离。

- **[事实] OpenAI 的内部部署把 sandbox boundary、approval policy、network allow/deny、keyring credentials、managed requirements 和 agent-native logs 分开治理。** [OpenAI：Running Codex safely at OpenAI](https://openai.com/index/running-codex-safely/)（2026-05-08）。**pi101 启示：** 权限不应只用一个 `dangerous: boolean`，而应由资源范围、动作风险、身份和当前授权共同决定。

- **[事实] Anthropic 的经验是文件系统隔离和网络隔离缺一不可；成熟 OS/VM 原语比自建代理边界更可靠。** 其 Claude Code sandbox 使用 Seatbelt/bubblewrap，并报告权限请求减少 84%。[Anthropic：Claude Code sandboxing](https://www.anthropic.com/engineering/claude-code-sandboxing)（2025-10-20）、[How we contain Claude](https://www.anthropic.com/engineering/how-we-contain-claude)（2026-05-25）。**pi101 启示：** 安全实验要分别验证写越界和数据外传，不能只验证 `rm` 被拦截。

- **[事实] 模型审批器适合作为纵深防御，不是 sandbox 替代品。** Claude Code auto mode 对工具输出做 prompt-injection 探测，对高风险动作做 transcript 分类；被拒绝后 Agent 可尝试安全替代路径，连续 3 次或累计 20 次拒绝才升级人工。官方同时公开其仍会放过约 17% 的 overeager action。[Anthropic：Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode)（2026-03-25）。**pi101 启示：** 展示 deny-and-continue 与 escalation budget；不要宣传“模型判断安全”。

- **[事实] DeepSeek Harness 的工具管线在 tool body 前后提供 pre-execute、不可放宽的 monotonic guard、approval、around-execute、post-execute 和最终不可变结果；审批无 answerer 时 fail closed。** [Tool execution pipeline](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/tool-execution-pipeline.md)、[User approval](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/subsystems/approval.md)（2026-09-17）。**pi101 启示：** 权限 guard 必须是单调收紧的独立层，普通 hook 不能在后续重新放开它。

- **[事实] DeepSeek Harness 的 sandbox 当前主要约束文件效果，明确不覆盖网络和进程可见性，并公开 `full/partial` enforcement；请求受限模式而无可用 backend 时必须 fail closed。** [Process sandbox](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/subsystems/sandbox.md)（2026-09-17）。**pi101 启示：** 必须对用户展示“约束范围”和“执行完整性”，不能只显示一个令人误解的 sandbox 图标。

## 5. Observability 与 OpenTelemetry

- **[事实] OTel 的 GenAI agent spans 已定义 `create_agent`、`invoke_agent`、`invoke_workflow`、`plan`、`execute_tool` 等操作，并建议 token usage 使用计费口径；但规范状态仍是 Development。** [OpenTelemetry GenAI agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md)（访问于 2026-09-18）。**pi101 启示：** 固定 OTel SDK 版本与 schema version，并保留迁移层。

- **[事实] AWS AgentCore 的 runtime、memory、gateway、built-in tools 和 identity 都提供 CloudWatch 指标；应用侧可用 ADOT 发出自定义 trace/metric，并能输出到其他兼容 OTel 的平台。** [AWS AgentCore observability docs](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)（持续更新；访问于 2026-09-18）。**pi101 启示：** trace 要跨越模型、工具、memory、identity 和 sandbox，而不是只包住 LLM API。

- **[事实] 阿里云 AgentRun 声明端到端 OTel trace，并按 user/session/agent 归集模型、向量检索和工具成本；ARMS probe 可观测调用、token、cost、trace 和 session。** [AgentRun overview](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)（2026-08-22）、[ARMS Python Agent](https://www.alibabacloud.com/help/en/agentrun/installing-the-arms-probe-for-python-agent-applications-1)（2026-08-11）。**pi101 启示：** `tenant_id`、`business_case`、`session_id`、`agent_id` 和 `task_outcome` 是成本分摊的必要维度。

- **[事实] OpenAI Agents SDK 默认记录 run、turn、agent、generation、function、guardrail 和 handoff span，并允许自定义 processor；敏感输入输出可关闭。** [OpenAI Agents SDK tracing](https://openai.github.io/openai-agents-python/tracing/)（持续更新；访问于 2026-09-18）。**pi101 启示：** 默认采元数据，内容采集需显式策略；测试与生产的 export policy 分开。

- **[事实] DeepSeek Harness 的 OTel 后端当前是“显式反馈后导出 session ledger”的日志管线，不是自动生产 trace。** `FEEDBACK_ONLY` 会释放反馈点之前的完整前缀，部署方自行承担 redaction；且没有 durable outbox 或 delivery guarantee。[DeepSeek session telemetry OTel 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/session/session-telemetry-otel/README.md)（2026-09-17）。**pi101 启示：** 借鉴其 canonical event 和 dedupe key，但另建常开、脱敏、可采样的 production trace exporter。

### pi101 建议的最小 trace

```text
agent.task                         # 一个业务任务，最终记录 outcome
├─ agent.turn                      # 人/系统的一轮输入
│  ├─ agent.context.build          # 上下文选择、裁剪、压缩
│  ├─ gen_ai.*                     # 模型调用，沿用 OTel GenAI 字段
│  ├─ agent.tool.execute           # 工具、权限、审批、sandbox、重试
│  └─ agent.checkpoint             # durable state / artifact 提交
├─ agent.human_intervention        # 请求、等待、决定、恢复
└─ agent.evaluation                # grader、分数、证据版本
```

自定义字段至少包括 `pi101.schema.version`、`task.id`、`business.outcome`、`budget.*`、`approval.*`、`recovery.*`、`cost.estimated`。内容默认不进入 span attribute；大 payload 进入受控 artifact store，只在 trace 中保存摘要和引用。

## 6. Evaluation

- **[事实] Agent eval 评测的是 harness 与 model 的组合；evaluation harness 负责并发运行、轨迹记录、评分和聚合。** Anthropic 要求 trial 从清洁隔离环境开始、阅读 transcript 校准 grader，并组合离线 eval、生产监控、A/B、用户反馈和人工研究。[Anthropic：Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)（2026-01-09）。**pi101 启示：** 真实 API 是行为评测必需项，但确定性的 Harness 单测仍应用 scripted/faux provider；两者回答不同问题。

- **[事实] OpenAI 的内部数据 Agent 用人工编写的 golden SQL 生成预期结果，再同时比较 SQL 与实际结果，避免字符串不同却业务等价时误判。** [OpenAI：Inside our in-house data agent](https://openai.com/index/inside-our-in-house-data-agent/)（2026-01-29）。**pi101 启示：** grader 应优先核对最终系统状态、数据库结果和 artifact，而不是只评分自然语言答案。

- **[事实] AWS 建议同一场景重复多次，因为单次通过只能说明“可能成功”，不能代表典型行为；评测需覆盖 tool、turn、session outcome、system 四层。** [AWS：AgentCore Evaluations](https://aws.amazon.com/blogs/machine-learning/build-reliable-ai-agents-with-amazon-bedrock-agentcore-evaluations/)（2026-03-31）、[AWS：AgentOps](https://aws.amazon.com/blogs/machine-learning/agentops-operationalize-agentic-ai-at-scale-with-amazon-bedrock-agentcore/)（2026-06-01）。**pi101 启示：** 每个关键样本运行 N 次并报告通过率与置信区间；不能只选成功轨迹展示。

- **[事实] Amazon 在内部大规模 Agent 实践中把质量、性能、责任与成本放入同一评估框架，并明确计入模型、tool、数据处理、人工和错误修复成本。** [AWS：Evaluating AI agents](https://aws.amazon.com/blogs/machine-learning/evaluating-ai-agents-real-world-lessons-from-building-agentic-systems-at-amazon/)（2026-02-18）。**pi101 启示：** KPI 顶层是 task success、人工接管、处理周期和成功任务成本，模型分数只是诊断指标。

- **[事实] AgentScope 提供带持久 storage、分布式 Ray 执行和中断续跑的 task/benchmark/metric/evaluator 结构。** [AgentScope：Evaluation](https://doc.agentscope.io/tutorial/task_eval.html)（访问于 2026-09-18）。**pi101 启示：** eval runner 本身也要可恢复，避免长批次失败后全部重跑。

- **[事实/缺口] 截止固定提交，DeepSeek Harness 有大量确定性测试和性能 benchmark，但官方仓库未提供面向业务行为的通用 eval subsystem。** [DeepSeek Harness 固定提交](https://github.com/deepseek-ai/deepseek-harness/tree/ddefc45fbc7f8e46dd73185e68295696d1297887)（2026-09-17）。**pi101 启示：** 不应把测试覆盖率或 loop benchmark 当成任务质量评测；需单独构建 eval harness。

### 建议的指标层级

| 层级 | 必测指标 | 目的 |
|---|---|---|
| 业务结果 | 完成率、正确终态、人工接管率、周期、单位成功任务成本 | 判断产品是否值得运行 |
| Session | goal 达成、轮数、恢复次数、重复劳动、用户中断 | 判断 Harness 是否收敛 |
| Tool | 选择/参数准确率、成功率、P95、幂等与补偿 | 定位执行问题 |
| Model | token、TTFT、输出延迟、格式失败、缓存命中 | 诊断 provider 行为 |
| 安全 | 越权、外传、误批、拒绝恢复、审计完整性 | 控制 blast radius |
| 运维 | crash recovery、queue age、sandbox 冷启动、trace 丢失率 | 判断生产稳定性 |

## 7. Reliability、Recovery 与 Human-in-the-loop

- **[事实] Anthropic 的“brain / hands / session”拆分让 sandbox 死亡表现为普通 tool error，可重新 provision；harness 崩溃后可从外部 session log 重建。** [Anthropic：Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)（2026-04-08）。**pi101 启示：** 故障恢复必须以 durable events 和 idempotency key 为基础，而不是 try/catch 后从头再跑。

- **[事实] OpenAI Agents SDK 的 `RunState` 是可序列化的 HITL pause/resume 边界，保留 response、generated items、approval 和 conversation 标识；官方还提供 Dapr、Temporal、Restate、DBOS 的 durable execution 集成。** [OpenAI：Human in the loop](https://openai.github.io/openai-agents-python/human_in_the_loop/)、[Running agents](https://openai.github.io/openai-agents-python/running_agents/)（持续更新；访问于 2026-09-18）。**pi101 启示：** 人工等待不能占着进程或内存；暂停状态必须可跨部署恢复。

- **[事实] DeepSeek Harness 的模型重试遵循“durable before wait”：先记录 retry 与 delay，再等待并重跑同一 open step；默认有限重试，而 `always` 模式可能无限产生计费请求。** [DeepSeek llm-retry 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/llm/llm-retry/README.md)（2026-09-17）。**pi101 启示：** 所有重试都要受 attempt、elapsed time 和 cost 三重预算，且永久错误不应重试。

- **[事实] DeepSeek Harness 的同 session goal 使用 revision/CAS、durable phase、round cap 和 process-local activation；恢复后的 active goal 默认 disarmed，需新的用户授权才能继续。** [DeepSeek same-session goals 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/subsystems/goal.md)（2026-09-17）。**pi101 启示：** “状态为 active”不等于“当前有执行授权”；持久意图与现场执行权要分开。

- **[事实] AgentScope 2.0 支持实时 interrupt/resume、tool confirmation、scheduled wakeup 和后台工具完成后唤醒会话。** [AgentScope v2.0.8 README](https://github.com/agentscope-ai/agentscope/tree/v2.0.8)（2026-09-08）。**pi101 启示：** 产品案例要覆盖用户打断、长工具后台化和结果回流，不只覆盖同步 happy path。

### 必做故障注入

1. 模型 429/5xx、超时、流中断与空响应；
2. tool 超时、重复回包、部分成功和不可逆副作用；
3. Harness 在 tool 执行前、执行后、结果落盘前崩溃；
4. sandbox 丢失、冷启动失败、workspace 不一致；
5. 审批等待期间进程重启、用户拒绝、审批过期；
6. context overflow、compaction 失败、checkpoint 损坏；
7. trace exporter 不可用且不能拖垮主 loop。

## 8. Cost、Latency 与 Operations

- **[事实] 多 Agent 不是默认优化：Anthropic 的研究场景中 multi-agent 使用约为 chat 的 15 倍 token，只有高价值、可并行且单上下文装不下的任务才值得。** [Anthropic：Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)（2025-06-13）。**pi101 启示：** subagent fan-out 必须由预估价值、并行度和预算 gate 控制。

- **[事实] 将 harness 从 sandbox 容器移出可减少每个“brain”都等待容器 provision 的 TTFT，并允许多个 brain 共用或延迟创建 hands。** [Anthropic：Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents)（2026-04-08）。**pi101 启示：** 只有真正调用 shell/browser 时才创建 sandbox；把模型推理和执行环境扩缩容分开。

- **[事实] AWS 建议先按业务场景设 performance budget，再用 trace 找无限 loop、tool error、token 过长和 memory 增长；“正确但慢”仍是生产故障。** [AWS：Optimizing production agents](https://aws.amazon.com/blogs/machine-learning/optimizing-production-agents-with-amazon-bedrock-agentcore-observability/)（2026-07-31）。**pi101 启示：** 每个案例声明 TTFT、P95、总时长、最大 step、最大 token 与最大费用。

- **[事实] AgentRun 提供 model fallback、load balancing、concurrency/timeout control、retry、token rate limit、scale-to-zero 和按 user/session/agent 的成本分析。** [Alibaba Cloud：What is AgentRun](https://www.alibabacloud.com/help/en/agentrun/what-is-agentrun)（2026-08-22）。**pi101 启示：** 运维章节应把成本控制实现为 admission control、runtime budget 和事后归因，而不是只做报表。

- **[事实] DeepSeek Harness 明确指出每次 LLM retry 都是新的计费请求，`always` 模式会一直运行到成功、取消或卸载。** [DeepSeek llm-retry 固定提交](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/llm/llm-retry/README.md)（2026-09-17）。**pi101 启示：** retry 策略是成本策略；必须在轨迹中记录 retry reason、backoff、重复 input token 与累计费用。

### 建议的任务预算信封

```ts
type TaskBudget = {
  maxWallTimeMs: number;
  maxModelCalls: number;
  maxToolCalls: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  maxHumanWaitMs: number;
};
```

预算到达时必须产生明确的 terminal reason，例如 `completed`、`needs_human`、`budget_exhausted`、`policy_denied`、`failed_recoverable`、`failed_terminal`，不能让自然语言“我完成了”成为唯一结束信号。

## 9. 厂商实践快照

| 来源 | 当前突出实践 | 需要保留的限制 |
|---|---|---|
| Anthropic / Claude | workflow 与 agent 选择、context engineering、长任务 handoff、brain/session/hands 解耦、containment、agent eval | 多 Agent 成本高；模型审批器有漏判；部分结论来自自家模型行为 |
| OpenAI | Codex loop/App Server、repo-as-system-of-record、sandbox+policy+audit、可序列化 HITL、Agents API | 托管 API 与自建 Harness 边界不同；SDK 自带 trace 默认目的地需审查数据策略 |
| AWS | AgentCore 模块化 runtime/memory/identity/gateway/observability/eval、OTel、四层评估、AgentOps | 产品能力较多，需区分通用原则和 AWS 特定实现；不要把 CloudWatch 等同于质量评测 |
| 阿里云 / AgentScope | AgentScope 2.0 的 loop/pipeline/context/permission/workspace/service；AgentRun 的 serverless、MicroVM、gateway、cost attribution | AgentScope Runtime 旧文档已提示迁移到 2.0；新平台能力需以具体区域和版本验证 |
| DeepSeek | 官方开源 DeepSeek Harness：插件化 seam、durable session、tool pipeline、goal/workflow、sandbox、retry | developer preview、无安全审计；sandbox 不覆盖网络；OTel 后端是反馈导出的 ledger，不是完整生产 tracing；缺通用业务 eval subsystem |

## 10. 可验证的 X / Twitter 一线观点

以下内容只作为实践线索；能与官方材料交叉验证的部分已在前文使用官方来源落地。

- **[观点] 长任务 Harness 的主要失败模式是上下文耗尽、计划偏移、验证偷懒和仓库熵增；建议新鲜上下文交接、独立验证器、频繁检查和完整 telemetry。** 这是生产工具构建者 sysls 的个人总结，不是对所有模型的统计结论。[X 原帖](https://x.com/systematicls/status/2038241033755168959)（2026-03-29）。**pi101 启示：** 将这些作为故障假设加入实验，而不是写成既定事实；用运行轨迹和 eval 证明其是否适用于 pi 案例。

- **[观点] 托管长任务 Agent 的产品边界正在收敛为“用户提供 agent config/task，平台负责 harness 与 managed infrastructure”。** Anthropic 工程成员 Lance Martin 对 Managed Agents 的公开概括与官方 brain/session/hands 架构一致。[X 原帖](https://x.com/RLanceMartin/status/2041930946019295245)（2026-04-08）。**pi101 启示：** 系列应明确区分“构建业务 Agent”与“自建整个运行基础设施”两种产品选择。

- **[观点/当事人经验] 远程 coding-agent sandbox 除隔离外还需要稳定 PTY、长命令流、快照与分支；这些能力直接影响环境启动和恢复体验。** cto.new 称其在大规模真实使用后从自建 Firecracker 迁移，并将 PTY 稳定性和 snapshot branching 作为核心选型项。[X 原帖](https://x.com/ctodotnew/status/2017271423782494590)（2026-01-30）。**pi101 启示：** 企业研发 Agent 的 sandbox lab 应测交互命令、流截断、快照恢复和分支环境，而不只测一次性 `exec`。

> 检索说明：本机 `agent-reach` 主命令不可用，Twitter cookie 也未配置；以上链接通过公开网页索引读取，并保留直接 X URL。未能直接读取或回溯原帖的转述内容未纳入结论。

## 11. 对 pi101 系列的落地要求

### 11.1 公共 Harness 必须具备

1. provider-neutral model adapter；
2. 明确的 turn/step/tool 状态机与停止原因；
3. append-only run ledger 与可重建 context projection；
4. tool metadata、monotonic policy guard、HITL pause/resume；
5. 文件、网络、凭据分离的 sandbox/identity 边界；
6. checkpoint、幂等 key、补偿、有限 retry 和 crash recovery；
7. OTel trace/span/event/metric 与版本化 `pi101.*` 语义；
8. task/session/tool/model/security/ops 六层 eval；
9. wall time、step、token、tool、cost、human wait 预算；
10. 业务结果、人工接管和单位成功任务成本 dashboard。

### 11.2 每篇实操的证据包

每篇文章的运行结果至少保存：

- 任务输入、业务目标和预期终态；
- 锁定的代码、配置、prompt、tool schema 与模型元数据；
- 完整 Agent 轨迹及脱敏策略；
- 最终系统状态或 artifact，而非只有自然语言回答；
- 多次真实 API 运行的成功/失败分布；
- latency、token、重试、人工等待和 cost；
- 一个失败注入、恢复过程和恢复后的业务结果；
- provider 替换时不变的 Harness/业务接口证明。

### 11.3 适合写入 12 篇系列的关键实验

1. 最小 loop 与完整控制面的差异；
2. 固定 workflow 与开放 agent 的边界实验；
3. session ledger、context projection 与 compaction；
4. tool contract、权限与 sandbox；
5. OTel Agent trace 与脱敏；
6. 从 transcript 到业务 outcome 的 eval harness；
7. retry、checkpoint、crash recovery 与幂等；
8. HITL 的持久暂停、恢复与升级；
9. token/latency/cost budget 和 admission control；
10. 个人研究与内容 Agent；
11. OPC 客户运营 Agent；
12. 企业研发任务 Agent 与生产化清单。

## 12. 研究中确认的空白与后续验证

- **DeepSeek Harness 仍是 alpha/developer preview。** 在 pi101 中只作为横向架构研究，不把其安全或 API 稳定性当作前提。
- **OTel GenAI Agent semantic conventions 尚未稳定。** 实现时锁定版本并保留 schema migration。
- **真实 API 行为仍需实验。** 本文研究架构与公开实践，不替代使用选定 DeepSeek 模型完成多轮、工具、超时、长上下文和成本实验。
- **云平台能力需验证区域、配额与价格。** 文中只提取模型无关的架构原则，不把某项托管能力设为 pi101 必选依赖。
- **X 观点样本有限。** 后续若取得直接 Twitter 只读访问，可继续跟踪一线实践，但核心结论仍需回溯代码、文档或可复现实验。

