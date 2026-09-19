# 02｜读懂 pi：Loop、Agent、Harness 三层运行时

## 业务问题

团队常把三种不同需求塞进同一个“Agent 类”：一次模型循环、一个在线会话、一个可跨进程恢复的长期任务。结果是原型简单，进入业务后却无法解释谁拥有状态、崩溃后从哪里恢复。

## pi 源码链

pi 的边界很清楚：`agentLoop` 是函数级执行器；`Agent` 持有进程内 transcript、steering 和 follow-up queue；`AgentHarness` 以 `accept/drive/requestAbort/inspectExecution` 暴露 durable control plane。完整固定版本地图见 [`research/pi-v0.85.1-code-map.md`](/Users/fly/code/pi101/research/pi-v0.85.1-code-map.md)。

```text
应用业务状态
  └─ AgentHarness
      ├─ Lane：一个可独立驱动的执行分支
      ├─ Entry tree：不可变事实
      ├─ Operation：可恢复状态机
      ├─ Usage ledger：独立成本账本
      └─ Model / Tool / Hook / Telemetry ports
```

Graphify 对稳定 release 的静态图也把 `Lane`、`Entry`、`Session` 和 `Harness` 识别为最高连接度抽象，说明持久状态而非 prompt 才是架构中心。

## 外部实践

OpenAI 把 Codex loop 与 App Server 的 thread 生命周期、持久化、认证和 sandbox 分开；Anthropic 把 brain、session、hands 分成独立故障域；DeepSeek Harness 把 loop、session、tools、adapter 做成插件。三者都指向“执行循环只是 Harness 的一部分”。

## 实操

用文章 01 的同一任务分别回答三问：

1. 只用 `agentLoop`，谁保存历史和处理并发 prompt？
2. 用 `Agent`，进程被 kill 后从哪里继续？
3. 用 `AgentHarness`，哪个 operation state 能说明外部效果是否未知？

将答案写成 ADR，选择层级的标准不是 API 简洁度，而是任务持续时间、失败域和审计要求。

## 轨迹与指标

最小公共维度是 task/run/turn/model/tool；Harness 额外需要 session/lane/operation/entry/checkpoint。指标比较每层的恢复点数量、状态写次数和故障后重复工作量。

## 失败与恢复

如果执行会跨进程、等待人工或触发不可逆动作，却仍选择 `Agent`，这是架构错误，不是再加一个重试能补救的问题。反过来，毫秒级无副作用请求直接上 durable Harness 可能是无收益复杂度。

## 产品化路径

用一条规则约束选型：可从输入完全重算的短任务用 Loop/Agent；需要保留外部效果、人工决定或跨部署继续的任务用 Harness。业务状态仍由领域服务拥有，Harness 只保存执行事实与引用。
