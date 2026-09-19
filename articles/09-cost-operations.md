# 09｜按成功业务任务核算 Agent 成本

## 业务问题

每百万 token 的价格无法回答“这个 Agent 值不值得运行”。真正成本包括失败调用、重复工具、sandbox、队列、人工审批、错误修复和未完成任务。一个低 token 但经常需要人工返工的 Agent 可能更贵。

## pi 源码链

pi 将 usage ledger 与 transcript 分离，Harness telemetry 记录 token、cost、cache、attempt、TTFC 和 outcome。这个设计允许分支、恢复和 compaction 后仍按 operation/session/task 汇总，而不是只看最后一次 response。

## 外部实践

Anthropic 报告多 Agent 研究任务消耗显著高于普通 chat，提醒 subagent 不是默认优化。AWS AgentOps 把 task completion、latency、tool error、loop detection 和 cost per completed task放在同一层；阿里云 AgentRun 也强调按 user/session/agent 归因。

## 实操

给每个任务一个预算信封：

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

预算不是事后报表：请求前做 admission control，运行中每个 checkpoint 扣减，接近上限时降级到更小上下文、确定性 workflow 或人工接管。缓存命中只优化模型输入成本，不应改变正确性。

## 轨迹与指标

顶层指标为 `总成本 / 成功任务数`，并拆成模型、工具、基础设施、人工和失败浪费。配套看 P50/P95 周期、queue age、turn/tool 数、重试 token、cache read、sandbox 冷启动和人工等待。

## 失败与恢复

无限 retry 和无限 subagent fan-out 都是成本故障。预算耗尽必须产生明确终态和剩余工作摘要，不能静默截断。成本计算失败时采取保守上界，而不是当作零成本继续。

## 产品化路径

按业务价值分层：低价值任务用同步小预算；高价值开放研究允许长任务和并行；不可预估任务先返回计划与报价。先让单 Agent 可靠，再用 eval 证明多 Agent 的增量收益。
