# pi v0.85.1 Harness 源码地图

研究基线：`v0.85.1`，commit `d981de1229ef899957bbe968bc8dcda02a21f477`，2026-09-05 发布。本文的源码链接全部固定到该 tag，避免 `main` 漂移。

## 一句话结论

pi 不是一个 `while (toolCall)` 包装器。它有三层递进抽象：低层 `agentLoop` 负责一次运行的模型—工具循环，`Agent` 负责进程内状态与队列，`AgentHarness` 再把 session、lane、operation、恢复、用量账本、hook 与 telemetry 组合成可持久化运行时。

## 三层入口

| 层 | 入口 | 适用场景 | 缺失能力 |
|---|---|---|---|
| Loop | [`agent-loop.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/agent-loop.ts) | 自己管理状态的最小嵌入 | 不持久化，不负责 crash recovery |
| Agent | [`agent.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/agent.ts) | 单进程交互应用、原型 | 进程重启后不能靠自身恢复 |
| Harness | [`harness/agent-harness.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/agent-harness.ts) | 长任务、多分支、可恢复产品 | 仍需应用提供业务状态、权限、存储和导出器 |

## 真实执行链

```text
Harness.accept(operation)
  → Lane 上持久化 operation intent
  → Harness.drive(operationId)
  → driveOperation 按 durable state 分派
  → assistant request / tool request / checkpoint / retry / navigation
  → 外部 effect 之前提交 intent
  → 外部 effect 之后提交 outcome
  → Entry tree + UsageRow + operation result
```

关键文件：

- 公共控制面：[`harness/agent-harness.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/agent-harness.ts)
- 运行时 dispatcher：[`harness/runtime/drive.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/runtime/drive.ts)
- lane 与 effect gate：[`harness/runtime/lane.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/runtime/lane.ts)
- durable state union：[`harness/session/types.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/session/types.ts)
- 原子 session mutation：[`harness/session/session.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/session/session.ts)
- 工具 intent/outcome/recovery：[`harness/runtime/drive/tools.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/runtime/drive/tools.ts)
- telemetry schema：[`harness/telemetry.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/telemetry.ts)

## 最小 Loop 的重要语义

`agentLoop` 每个 turn 的行为不是“收到调用就执行”这么简单：

1. 组装下一次请求，可在 `transformContext` 中改变上下文投影；
2. 流式生成 assistant message；
3. 若 `stopReason === "length"`，即使响应里有 tool call 也不会执行，避免执行被截断的参数；
4. 工具先逐个完成查找、参数准备、schema 校验和 `beforeToolCall`；
5. parallel 模式并行执行，但写回模型的 tool result 仍保持 assistant 源顺序；
6. `turn_end` 后先判断停止，再注入 steering；无工具且无 steering 时才消费 follow-up。

这解释了为什么 transcript 顺序、执行完成顺序和 UI 事件顺序是三种不同概念。

## Durable tool 的 effect sandwich

pi 把工具调用拆成：

```text
planned → effect_pending → outcome_ready → completed
```

`effect_pending` 表示外部副作用可能已经发生，但结果尚未可靠落盘。恢复时不能盲目重放：

- `replay: "safe"`：只适用于读取或具有外部幂等键的操作；
- `replay: "never"`：未知结果必须人工核对或走业务补偿；
- `outcome_ready`：效果已结算，等待按 source order 放入 transcript。

官方设计文档：[`tool-durability.md`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/docs/tool-durability.md)。

## State 不等于 Context

- `Entry` tree 是不可变运行事实；
- lane tip 指向当前分支位置；
- operation state 是可恢复状态机；
- usage ledger 独立记录 token/cost；
- 发给模型的 context 是从这些事实投影出的临时视图；
- compaction/branch summary 是新的结构化 entry，不应覆盖原始历史。

这使“压缩上下文”不会退化成“删除审计记录”。

## Telemetry 边界

pi telemetry 定义 schema 与显式 callback，不绑定 exporter 或全局 SDK。核心 span 包括：

- `pi.harness.run`
- `pi.harness.turn`
- `pi.harness.step`
- `pi.harness.tool`
- `pi.harness.checkpoint`
- `pi.harness.compaction`
- `pi.harness.navigation`
- `pi.harness.hook`
- `pi.session.write`
- `pi.ai.request`

应用应把它适配到 OpenTelemetry/Sentry/日志，而不是让核心库知道具体后端。

## Graphify 结构校验

对 release tag 的 `packages/agent/src` 做静态图分析：90 个文件，1,632 个节点，5,217 条边，58 个社区；98% 的边来自静态提取。

### God Nodes

1. `Lane` — 74 edges
2. `Entry` — 51
3. `AgentMessage` — 49
4. `setValue()` — 43
5. `Session` — 41
6. `Value` — 41
7. `StorageBackedSession` — 40
8. `Agent` — 37
9. `branchTip()` — 37
10. `Harness` — 36

这组结果支持一个非直觉结论：pi Harness 的重心不是 prompt，而是 lane、entry、session 与原子写入。

### Surprising Connections

- `AfterToolPatch → AgentToolResult`：工具后置策略能改写最终结果语义；
- `HookMap → AgentToolResult`：hook 不是旁路日志，它能参与执行；
- `Config → QueueMode`：steering/follow-up 的排队语义属于运行配置；
- `LaneConfiguration → ThinkingLevel`：模型推理配置被捕获为 lane 配置的一部分；
- `Agent → AgentMessage`：进程内 Agent 仍以消息序列为主状态，不能替代 durable session。

### 建议继续追问

1. 哪些 hook 能改变业务结果，必须进入审计？
2. provider 请求成功、进程却在 outcome commit 前崩溃时，谁判定是否重试？
3. parallel tools 的完成顺序、提交顺序和 transcript 顺序分别影响什么？
4. lane fork 后，用量、配置与工具可用性如何继承？
5. compaction summary 的证据可追溯性如何进入 eval？

## 对 pi101 的采用原则

第一篇用 `Agent` 展示最小闭环，因为它最容易看清事件；后续可靠性文章迁移到 `AgentHarness`。业务领域状态不塞进 transcript，provider 身份不进入工具接口，trace schema 不使用 DeepSeek 专有字段。更换模型时，只允许修改 `src/model.ts` 和配置。
