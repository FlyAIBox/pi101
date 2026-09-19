# 04｜工具不是函数列表，而是业务事务

## 业务问题

`send_email(to, body)` 的 schema 合法，不代表动作合法。还要回答：模型代表谁发送、收件人是否允许、是否需要审批、重复执行会不会发两封、执行超时后怎样知道邮件其实已发出。

## pi 源码链

低层 Agent 按“查找 → 参数准备 → schema 校验 → before hook → execute → after hook”执行工具。Durable Harness 再把调用拆成 `planned → effect_pending → outcome_ready → completed`，并通过 `replay: safe | never` 声明恢复策略。详见 [tool durability](https://github.com/earendil-works/pi/blob/v0.85.1/packages/agent/docs/tool-durability.md)。

## 外部实践

OpenAI 强调 sandbox 只约束其覆盖的执行面，外部 MCP 工具仍需自己的 guardrail。Anthropic 把文件和网络隔离作为主边界，审批只是纵深防御。DeepSeek Harness 的 monotonic guard 只允许后续策略收紧权限，不允许普通 hook 再放开。

## 实操

给每个工具补齐 metadata：

```ts
type ToolPolicy = {
  identitySource: "current_user" | "service_account";
  effect: "read" | "reversible_write" | "irreversible_write";
  replay: "safe" | "never";
  approval: "none" | "always" | "policy";
  idempotencyKey: "required" | "unsupported";
  timeoutMs: number;
};
```

对写工具采用业务幂等键 `taskId + actionType + targetId`，由外部系统持久去重，不能只在 Node 内存里记一次。审批结果绑定工具名、规范化参数摘要、身份和过期时间，参数变化后必须重新审批。

## 轨迹与指标

记录 policy decision、身份引用、审批等待、幂等键摘要、effect 状态和外部 receipt。指标包括工具选择/参数正确率、拒绝率、重复效果数、unknown outcome 数、P95 以及补偿成功率。

## 失败与恢复

故障注入点包括 effect 前崩溃、effect 成功后落盘前崩溃、外部超时但实际成功、审批后参数被修改。读工具可以安全重放；不可逆写遇到未知结果必须查询 receipt、人工核对或补偿，不能自动重试。

## 产品化路径

把工具分成查询、提案和执行三层。早期只开放查询与提案；有完整身份、审批、幂等和审计后才开放执行。这比用一个 `dangerous: true` 标记更接近真实业务风险。
