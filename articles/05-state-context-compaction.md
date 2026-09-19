# 05｜State 不是 Context：长任务为什么会失忆

## 业务问题

把所有历史塞回模型，成本和噪声会持续增长；直接裁掉旧消息，又会丢失承诺、审批和外部效果。问题来自把四种东西混成一个 transcript：业务状态、运行事实、模型上下文和临时工作区。

## pi 源码链

pi Harness 用不可变 `Entry` tree 保存事实，用 lane tip 表示当前分支，用 operation state 表示可恢复执行，用 usage ledger 独立记账。模型 context 是从 entry 投影的临时视图。compaction 产生新的 summary entry，不覆盖原始历史；assistant 流式帧也不是完成权威，只有结算事务才是。

对应源码与设计：[`session/types.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/session/types.ts)、[`session/session.ts`](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/src/harness/session/session.ts)、[assistant durability](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/docs/assistant-durability.md)。

## 外部实践

Anthropic 把 session 定义为外置追加日志，允许 harness 重建 context、sandbox 任意更换；长任务交接依靠结构化 feature list、进度 artifact 和版本历史，而不是期待旧对话永远存在。[Context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) 也强调按需选择信息。

## 实操

把状态分四层：

| 层 | 例子 | 生命周期 |
|---|---|---|
| Business state | 客户风险、审批状态 | 领域系统持久化 |
| Run ledger | prompt、tool receipt、checkpoint | 追加且可审计 |
| Context projection | 当前任务需要的消息和摘要 | 每次请求可重建 |
| Sandbox state | 临时文件、浏览器页面 | 可丢弃、可重建 |

构造 50-turn 任务，在第 25 turn 触发 compaction。验收不是“模型还记得”，而是审批事实仍在 ledger、投影能解释选择了哪些信息、重启后能从 checkpoint 继续。

## 轨迹与指标

记录候选 context token、入选 token、裁剪原因、summary 来源 entry 范围和 summary 版本。指标包括上下文压缩比、事实召回率、旧事实污染率、重建耗时、缓存命中和每个成功任务的 context 成本。

## 失败与恢复

compaction 失败不能覆盖原 context；摘要生成中崩溃应留下可识别 operation；summary 与原证据冲突时以原 entry 为准；sandbox 丢失不能改变 business state。

## 产品化路径

让 ledger 成为审计事实源，让业务数据库成为业务事实源，让 context builder 成为纯投影器。这样压缩策略和模型都可替换，而不会修改已经发生的世界。
