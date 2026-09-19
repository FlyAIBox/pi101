# 08｜恢复“结果未知”，而不是盲目重试

## 业务问题

模型调用失败通常可以重试；付款、发信、改 CRM 的超时却可能已经生效。若进程在外部系统成功后、写入本地结果前崩溃，简单重跑会制造重复副作用。

## pi 源码链

pi Harness 用 durable operation state 和 effect gate 实现“意图先落盘、效果后结算”。工具状态中的 `effect_pending` 明确表示外部结果未知，`outcome_ready` 表示结果已结算、等待按 source order 进入 transcript。`driveOperation` 根据 13 类 durable leaf state 继续，而不是重启整个 prompt。

关键源码：[`runtime/drive.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/runtime/drive.ts)、[`runtime/drive/tools.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/runtime/drive/tools.ts)、[`runtime/drive/recovery.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/runtime/drive/recovery.ts)。

## 外部实践

Anthropic 的 managed agents 用外部 session log 重建 harness，并把 sandbox 丢失降级成普通 tool error。DeepSeek Harness 也要求 retry durable before wait。共同点是恢复依赖持久事实和幂等，不依赖内存 try/catch。

## 实操

对写工具注入四个 crash 点：intent 前、intent 后 effect 前、effect 后 outcome 前、outcome 后 transcript 前。逐个 kill 进程再恢复，验证：

- effect 前可安全继续；
- effect 后未知结果不自动重放 `replay: never`；
- 有外部幂等键的工具可以查询 receipt 并结算；
- `outcome_ready` 只做本地 placement，不再次执行外部效果。

## 轨迹与指标

记录 attempt、error class、retryability、backoff、unknown outcome、replay decision、external receipt 和 recovery age。指标是恢复成功率、重复副作用数、MTTR、重复 token/cost 和需要人工核对的比例。

## 失败与恢复

重试必须同时受次数、墙钟时间和费用预算约束；认证错误、schema 错误和 policy denial 不重试；429/5xx 使用有 jitter 的 backoff；审批等待不占进程。终态必须区分 `completed`、`needs_human`、`budget_exhausted`、`failed_recoverable` 和 `failed_terminal`。

## 产品化路径

先为每个外部写操作争取幂等 API 或查询 receipt 的能力。没有这两者，就必须把人工核对作为正式状态，而不是藏在日志里。可靠性不是“多试几次”，而是正确处理不确定性。
